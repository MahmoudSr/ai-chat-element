import type { ChatMessage, ChatTransport, StreamChunk } from '../types.js';

/**
 * The simplest possible pluggable transport: wrap any async generator (or a
 * function returning one) that yields plain text deltas. Great for custom
 * backends, mocking in tests, or wiring the component to your own server.
 *
 * @example
 * functionAdapter(async function* (messages, signal) {
 *   const res = await fetch('/api/chat', { method: 'POST', signal,
 *     body: JSON.stringify(messages) });
 *   const reader = res.body!.getReader();
 *   const dec = new TextDecoder();
 *   for (;;) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     yield dec.decode(value);          // yield raw text chunks
 *   }
 * });
 */
export function functionAdapter(
  fn: (messages: ChatMessage[], signal: AbortSignal) => AsyncIterable<string>,
): ChatTransport {
  return {
    async *send(
      messages: ChatMessage[],
      signal: AbortSignal,
    ): AsyncIterable<StreamChunk> {
      try {
        for await (const delta of fn(messages, signal)) {
          if (signal.aborted) return;
          if (delta) yield { type: 'delta', delta };
        }
        yield { type: 'done' };
      } catch (err) {
        if (signal.aborted) return;
        yield {
          type: 'error',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
