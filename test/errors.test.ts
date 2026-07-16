import { describe, expect, it, vi, afterEach } from 'vitest';
import { httpError } from '../src/adapters/errors.ts';
import { openAIAdapter } from '../src/adapters/index.ts';
import type { ChatMessage } from '../src/types.ts';

/**
 * A failed request must give the user the provider's actual message
 * ("Incorrect API key"), not a raw JSON envelope truncated mid-token.
 */

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 401 ? 'Unauthorized' : '',
    headers: { 'content-type': 'application/json' },
  });
}

describe('httpError', () => {
  it('extracts { error: { message } } (OpenAI / Anthropic shape)', async () => {
    const r = jsonResponse(401, {
      error: { message: 'Incorrect API key provided.', type: 'auth_error' },
    });
    const msg = await httpError(r);
    expect(msg).toContain('Incorrect API key provided.');
    // The full status is preserved…
    expect(msg).toContain('401');
    // …but the raw JSON braces are NOT dumped at the user.
    expect(msg).not.toContain('{');
    expect(msg).not.toContain('"type"');
  });

  it('extracts a flattened { error: "..." } string', async () => {
    const msg = await httpError(jsonResponse(500, { error: 'boom' }));
    expect(msg).toContain('boom');
    expect(msg).not.toContain('{');
  });

  it('extracts a top-level { message } ', async () => {
    const msg = await httpError(jsonResponse(429, { message: 'Rate limited' }));
    expect(msg).toContain('Rate limited');
  });

  it('falls back to a trimmed raw body for non-JSON errors', async () => {
    const r = new Response('502 Bad Gateway (nginx)', { status: 502 });
    const msg = await httpError(r);
    expect(msg).toContain('502 Bad Gateway (nginx)');
  });

  it('truncates a very long non-JSON body with an ellipsis, not mid-nothing', async () => {
    const long = 'x'.repeat(1000);
    const msg = await httpError(new Response(long, { status: 500 }));
    expect(msg).toContain('…');
    expect(msg.length).toBeLessThan(400);
  });

  it('handles an empty body gracefully', async () => {
    const msg = await httpError(new Response('', { status: 503, statusText: 'Service Unavailable' }));
    expect(msg).toContain('503');
    expect(msg).toContain('Service Unavailable');
  });
});

describe('adapter surfaces a clean error message on a failed request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('openAIAdapter yields the provider error.message, not a brace dump', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse(401, { error: { message: 'Incorrect API key provided.' } }),
    );
    const t = openAIAdapter({ model: 'gpt-4o-mini', apiKey: 'bad' });
    const msgs: ChatMessage[] = [{ id: '1', role: 'user', content: 'hi', createdAt: 0 }];

    const out: string[] = [];
    for await (const chunk of t.send(msgs, new AbortController().signal)) {
      if (chunk.type === 'error') out.push(chunk.error);
    }
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('Incorrect API key provided.');
    expect(out[0]).not.toContain('{');
  });
});
