import { afterEach, describe, expect, it, vi } from 'vitest';
import { anthropicAdapter, openAIAdapter } from '../src/adapters/index.ts';
import { normalizeFinishReason } from '../src/adapters/finish.ts';
import type { ChatMessage, StreamChunk } from '../src/types.ts';

/**
 * #8 (0.2.0) — the adapters must surface a normalized stop reason + token usage
 * on the `done` chunk. Both providers report this metadata across separate SSE
 * events, so these stream the real event shapes and assert the `done` chunk
 * carries it. Written to go RED on the pre-0.2.0 adapters (which emit a bare
 * `{ type: 'done' }` and never request usage).
 */
const msgs: ChatMessage[] = [{ id: '1', role: 'user', content: 'hi', createdAt: 0 }];

/** Stub fetch with a fixed SSE body and capture the request(s). */
function stub(sseBody: string) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(sseBody, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  });
  return calls;
}

async function collect(it: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = [];
  for await (const c of it) out.push(c);
  return out;
}

const done = (chunks: StreamChunk[]) =>
  chunks.find((c) => c.type === 'done') as
    | Extract<StreamChunk, { type: 'done' }>
    | undefined;

const body = (c: { init: RequestInit }) => JSON.parse(String(c.init.body));

describe('normalizeFinishReason', () => {
  it('maps both providers onto one vocabulary', () => {
    // Natural stop.
    expect(normalizeFinishReason('stop')).toBe('stop');
    expect(normalizeFinishReason('end_turn')).toBe('stop');
    expect(normalizeFinishReason('stop_sequence')).toBe('stop');
    // Truncated.
    expect(normalizeFinishReason('length')).toBe('length');
    expect(normalizeFinishReason('max_tokens')).toBe('length');
    // Safety.
    expect(normalizeFinishReason('content_filter')).toBe('content_filter');
    expect(normalizeFinishReason('refusal')).toBe('content_filter');
    // Tools.
    expect(normalizeFinishReason('tool_calls')).toBe('tool_calls');
    expect(normalizeFinishReason('tool_use')).toBe('tool_calls');
    // Unknown / absent.
    expect(normalizeFinishReason('weird_new_reason')).toBe('other');
    expect(normalizeFinishReason(undefined)).toBeUndefined();
    expect(normalizeFinishReason(null)).toBeUndefined();
    expect(normalizeFinishReason('')).toBeUndefined();
  });
});

describe('openAIAdapter — finish_reason + usage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('opts into usage reporting via stream_options', async () => {
    const calls = stub('data: [DONE]\n\n');
    await collect(
      openAIAdapter({ model: 'm' }).send(msgs, new AbortController().signal),
    );
    // OpenAI only reports token usage on a stream when this is set.
    expect(body(calls[0]).stream_options).toEqual({ include_usage: true });
  });

  it('surfaces finish_reason (normalized + raw) and token usage on `done`', async () => {
    // Real OpenAI shape: finish_reason on the last content chunk, then a
    // separate final chunk with empty choices carrying usage, then [DONE].
    const sse =
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n' +
      'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n' +
      'data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":22}}\n\n' +
      'data: [DONE]\n\n';
    stub(sse);

    const chunks = await collect(
      openAIAdapter({ model: 'm' }).send(msgs, new AbortController().signal),
    );
    const d = done(chunks);
    expect(d, 'a done chunk must be emitted').toBeTruthy();
    expect(d!.finishReason).toBe('length');
    expect(d!.rawFinishReason).toBe('length');
    expect(d!.usage).toEqual({ inputTokens: 11, outputTokens: 22 });
    // The content still streamed.
    expect(chunks.some((c) => c.type === 'delta' && c.delta === 'hello')).toBe(true);
  });

  it('leaves metadata undefined when the server never reports it (plain Ollama-style)', async () => {
    stub(
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n' + 'data: [DONE]\n\n',
    );
    const d = done(
      await collect(
        openAIAdapter({ model: 'm' }).send(msgs, new AbortController().signal),
      ),
    );
    expect(d!.finishReason).toBeUndefined();
    expect(d!.usage).toBeUndefined();
  });
});

describe('anthropicAdapter — stop_reason + usage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('surfaces stop_reason (normalized + raw) and input+output tokens on `done`', async () => {
    // Real Anthropic shape: message_start has input usage; content_block_delta
    // streams text; message_delta carries stop_reason + output usage;
    // message_stop ends.
    const sse =
      'event: message_start\n' +
      'data: {"type":"message_start","message":{"usage":{"input_tokens":15,"output_tokens":0}}}\n\n' +
      'event: content_block_delta\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}\n\n' +
      'event: message_delta\n' +
      'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"},"usage":{"output_tokens":30}}\n\n' +
      'event: message_stop\n' +
      'data: {"type":"message_stop"}\n\n';
    stub(sse);

    const chunks = await collect(
      anthropicAdapter({ model: 'm', apiKey: 'k' }).send(
        msgs,
        new AbortController().signal,
      ),
    );
    const d = done(chunks);
    expect(d, 'a done chunk must be emitted').toBeTruthy();
    expect(d!.finishReason).toBe('length'); // max_tokens -> length
    expect(d!.rawFinishReason).toBe('max_tokens');
    expect(d!.usage).toEqual({ inputTokens: 15, outputTokens: 30 });
    expect(chunks.some((c) => c.type === 'delta' && c.delta === 'hi')).toBe(true);
  });

  it('maps a natural end_turn to `stop`', async () => {
    const sse =
      'data: {"type":"message_start","message":{"usage":{"input_tokens":5}}}\n\n' +
      'data: {"type":"content_block_delta","delta":{"text":"ok"}}\n\n' +
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":2}}\n\n' +
      'data: {"type":"message_stop"}\n\n';
    stub(sse);
    const d = done(
      await collect(
        anthropicAdapter({ model: 'm', apiKey: 'k' }).send(
          msgs,
          new AbortController().signal,
        ),
      ),
    );
    expect(d!.finishReason).toBe('stop');
    expect(d!.rawFinishReason).toBe('end_turn');
  });
});
