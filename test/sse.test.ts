import { describe, expect, it } from 'vitest';
import { parseSSE } from '../src/adapters/sse.ts';

/**
 * The SSE parser is where "the response got cut off" bugs live. These stream
 * bytes exactly the way a real (mis)behaving server / proxy does — including the
 * ones that DON'T send the terminating blank line — and assert nothing is lost.
 */

/** Build a Response whose body streams the given chunks, one read() each. */
function streamResponse(chunks: Array<Uint8Array | string>): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(typeof c === 'string' ? enc.encode(c) : c);
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function collect(chunks: Array<Uint8Array | string>): Promise<string[]> {
  const out: string[] = [];
  const signal = new AbortController().signal;
  for await (const data of parseSSE(streamResponse(chunks), signal)) {
    out.push(data);
  }
  return out;
}

describe('parseSSE', () => {
  it('parses well-formed events terminated by a blank line', async () => {
    const out = await collect(['data: a\n\n', 'data: b\n\n', 'data: [DONE]\n\n']);
    expect(out).toEqual(['a', 'b', '[DONE]']);
  });

  it('does NOT drop a final event that has no trailing blank line', async () => {
    // The regression: a server that closes right after the last event, no blank
    // line. Ollama's OpenAI-compat shim does exactly this with its [DONE].
    const out = await collect(['data: a\n\n', 'data: [DONE]\n']);
    expect(out, 'the last event must survive').toEqual(['a', '[DONE]']);
  });

  it('does NOT drop a final event with no line terminator at all', async () => {
    const out = await collect(['data: hello\n\n', 'data: world']);
    expect(out).toEqual(['hello', 'world']);
  });

  it('flushes a multi-byte char split across the last two chunks', async () => {
    // "😀" is 4 UTF-8 bytes. Split it across two reads and end the stream — the
    // TextDecoder buffers the trailing bytes and must be flushed or the char is
    // lost.
    const enc = new TextEncoder();
    const bytes = enc.encode('data: 😀\n');
    const split = Math.floor(bytes.length / 2);
    const out = await collect([bytes.slice(0, split), bytes.slice(split)]);
    expect(out).toEqual(['😀']);
  });

  it('concatenates multiple data: lines in one event with \\n (SSE spec)', async () => {
    const out = await collect(['data: line1\ndata: line2\n\n']);
    expect(out).toEqual(['line1\nline2']);
  });

  it('handles CRLF line endings', async () => {
    const out = await collect(['data: a\r\n\r\n', 'data: b\r\n\r\n']);
    expect(out).toEqual(['a', 'b']);
  });

  it('ignores comment (:) and non-data (event:) lines', async () => {
    const out = await collect([': keep-alive\n\n', 'event: ping\ndata: x\n\n']);
    expect(out).toEqual(['x']);
  });

  it('reassembles an event split across two network chunks', async () => {
    const out = await collect(['data: par', 'tial\n\n']);
    expect(out).toEqual(['partial']);
  });

  it('stops early when the signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const out: string[] = [];
    for await (const d of parseSSE(streamResponse(['data: a\n\n']), ac.signal)) {
      out.push(d);
    }
    expect(out).toEqual([]);
  });
});
