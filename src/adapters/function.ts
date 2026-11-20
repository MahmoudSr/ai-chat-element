import type { ChatMessage, ChatTransport, StreamChunk } from '../types.js';

/**
 * The simplest possible pluggable transport: wrap any async generator (or a
 * function returning one). Yield plain text for the answer; yield
 * {@link StreamChunk} objects for anything richer — reasoning, tool calls.
 * Great for custom backends, mocking in tests, or wiring the component to your
 * own server.
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
 *
 * @example
 * // An agent loop on your server, streamed as steps:
 * yield { type: 'reasoning', delta: 'The user wants the weather…' };
 * yield { type: 'tool', id: 't1', name: 'weather', args: { city: 'Beirut' } };
 * yield { type: 'tool', id: 't1', output: { tempC: 24 } };
 * yield 'It is 24°C in Beirut.';
 */
export function functionAdapter(
  fn: (messages: ChatMessage[], signal: AbortSignal) => AsyncIterable<string | StreamChunk>,
): ChatTransport {
  return {
    async *send(
      messages: ChatMessage[],
      signal: AbortSignal,
    ): AsyncIterable<StreamChunk> {
      try {
        for await (const item of fn(messages, signal)) {
          if (signal.aborted) return;
          if (typeof item === 'string') {
            if (item) yield { type: 'delta', delta: item };
            continue;
          }
          if (!item || typeof item !== 'object') continue;
          yield item;
          // The generator decided the reply is over; don't add a second end.
          if (item.type === 'done' || item.type === 'error') return;
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
