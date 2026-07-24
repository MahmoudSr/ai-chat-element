import { afterEach, describe, expect, it, vi } from 'vitest';
import { anthropicAdapter, openAIAdapter } from '../src/adapters/index.ts';
import type { ChatMessage } from '../src/types.ts';

/**
 * Adapters build the request. If a field is wrong the component still "works"
 * locally and fails against the real API — the kind of bug you find in
 * production, so pin the wire format here.
 */
const msgs: ChatMessage[] = [{ id: '1', role: 'user', content: 'hi', createdAt: 0 }];

function captureFetch() {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  });
  return calls;
}

async function drain(it: AsyncIterable<unknown>) {
  for await (const _ of it) { /* consume */ }
}

const body = (c: { init: RequestInit }) => JSON.parse(String(c.init.body));

describe('openAIAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests a stream and sends the model', async () => {
    const calls = captureFetch();
    const t = openAIAdapter({ model: 'gpt-4o-mini', apiKey: 'k' });
    await drain(t.send(msgs, new AbortController().signal));

    expect(body(calls[0]).stream, 'must request SSE streaming').toBe(true);
    expect(body(calls[0]).model).toBe('gpt-4o-mini');
    // Opt into token-usage reporting on the stream (see finish-usage.test.ts).
    expect(body(calls[0]).stream_options).toEqual({ include_usage: true });
  });

  it('merges `params` into the request body', async () => {
    const calls = captureFetch();
    const t = openAIAdapter({ model: 'm', params: { temperature: 0.4, top_p: 0.9 } });
    await drain(t.send(msgs, new AbortController().signal));

    expect(body(calls[0]).temperature).toBe(0.4);
    expect(body(calls[0]).top_p).toBe(0.9);
  });

  it('honors a custom baseURL (Ollama etc.) and omits auth without a key', async () => {
    const calls = captureFetch();
    const t = openAIAdapter({ model: 'llama3.2', baseURL: 'http://localhost:11434/v1/chat/completions' });
    await drain(t.send(msgs, new AbortController().signal));

    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    const h = new Headers(calls[0].init.headers);
    expect(h.get('authorization'), 'no key => no auth header').toBeNull();
  });

  it('does not send the message id / createdAt to the API', async () => {
    const calls = captureFetch();
    const t = openAIAdapter({ model: 'm' });
    await drain(t.send(msgs, new AbortController().signal));

    expect(body(calls[0]).messages[0]).toEqual({ role: 'user', content: 'hi' });
  });

  it('sends content as a plain STRING when there are no attachments', async () => {
    const calls = captureFetch();
    await drain(openAIAdapter({ model: 'm' }).send(msgs, new AbortController().signal));
    // No-regression guard: the common path must be byte-identical to before —
    // a string, never an array. (Fails if the builder always arrays.)
    expect(body(calls[0]).messages[0].content).toBe('hi');
  });

  it('maps an image attachment to an image_url part alongside the text', async () => {
    const calls = captureFetch();
    const withImage: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: "what's this?",
        createdAt: 0,
        attachments: [
          {
            id: 'a1',
            kind: 'image',
            mimeType: 'image/png',
            name: 'shot.png',
            size: 3,
            url: 'data:image/png;base64,AAA',
          },
        ],
      },
    ];
    await drain(openAIAdapter({ model: 'm' }).send(withImage, new AbortController().signal));

    expect(body(calls[0]).messages[0].content).toEqual([
      { type: 'text', text: "what's this?" },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
    ]);
  });

  it('does NOT send a non-image (file) attachment to the model', async () => {
    const calls = captureFetch();
    const withPdf: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'read this',
        createdAt: 0,
        attachments: [
          { id: 'a1', kind: 'file', mimeType: 'application/pdf', name: 'x.pdf', size: 9, url: 'data:application/pdf;base64,ZZ' },
        ],
      },
    ];
    await drain(openAIAdapter({ model: 'm' }).send(withPdf, new AbortController().signal));
    // A file-only message has no images => stays a plain string, no parts array.
    expect(body(calls[0]).messages[0].content).toBe('read this');
  });
});

describe('anthropicAdapter', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('defaults maxTokens (the API requires it) and streams', async () => {
    const calls = captureFetch();
    const t = anthropicAdapter({ model: 'claude-sonnet-5', apiKey: 'k' });
    await drain(t.send(msgs, new AbortController().signal));

    expect(body(calls[0]).max_tokens, 'Anthropic rejects a request without max_tokens').toBeGreaterThan(0);
    expect(body(calls[0]).stream).toBe(true);
  });

  it('sends the browser CORS opt-in by default, and drops it when disabled', async () => {
    let calls = captureFetch();
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k' }).send(msgs, new AbortController().signal));
    expect(new Headers(calls[0].init.headers).get('anthropic-dangerous-direct-browser-access')).toBe('true');

    vi.unstubAllGlobals();
    calls = captureFetch();
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k', browserAccess: false }).send(msgs, new AbortController().signal));
    expect(new Headers(calls[0].init.headers).get('anthropic-dangerous-direct-browser-access')).toBeNull();
  });

  it('hoists a system message to the top-level `system` field', async () => {
    const calls = captureFetch();
    const withSystem: ChatMessage[] = [
      { id: '0', role: 'system', content: 'be terse', createdAt: 0 },
      ...msgs,
    ];
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k' }).send(withSystem, new AbortController().signal));

    // Anthropic takes `system` separately — it must NOT be left in messages[].
    expect(body(calls[0]).system).toBe('be terse');
    expect(body(calls[0]).messages.some((m: ChatMessage) => m.role === 'system')).toBe(false);
  });

  it('sends content as a plain STRING when there are no attachments', async () => {
    const calls = captureFetch();
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k' }).send(msgs, new AbortController().signal));
    expect(body(calls[0]).messages[0].content).toBe('hi');
  });

  it('maps an image data-URL to a base64 image block (media_type + data split out)', async () => {
    const calls = captureFetch();
    const withImage: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'look',
        createdAt: 0,
        attachments: [
          { id: 'a1', kind: 'image', mimeType: 'image/png', name: 's.png', size: 3, url: 'data:image/png;base64,AAA' },
        ],
      },
    ];
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k' }).send(withImage, new AbortController().signal));

    expect(body(calls[0]).messages[0].content).toEqual([
      { type: 'text', text: 'look' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } },
    ]);
  });

  it('maps a remote https image URL to a url image source', async () => {
    const calls = captureFetch();
    const withRemote: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: '',
        createdAt: 0,
        attachments: [
          { id: 'a1', kind: 'image', mimeType: 'image/png', name: 's.png', size: 3, url: 'https://cdn.example/s.png' },
        ],
      },
    ];
    await drain(anthropicAdapter({ model: 'm', apiKey: 'k' }).send(withRemote, new AbortController().signal));

    // Empty content => no text block, just the image.
    expect(body(calls[0]).messages[0].content).toEqual([
      { type: 'image', source: { type: 'url', url: 'https://cdn.example/s.png' } },
    ]);
  });
});
