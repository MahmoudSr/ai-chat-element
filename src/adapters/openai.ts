import type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  TokenUsage,
} from '../types.js';
import { parseSSE } from './sse.js';
import { httpError, toMessage } from './errors.js';
import { normalizeFinishReason } from './finish.js';
import { toOpenAIContent } from './content.js';
import { ThinkTagSplitter } from './think-tags.js';

export interface OpenAIAdapterOptions {
  /** API key. WARNING: exposing a key in the browser is insecure — prefer a proxy. */
  apiKey?: string;
  /** Model id, e.g. "gpt-4o-mini". */
  model: string;
  /**
   * Full chat-completions endpoint. Defaults to OpenAI's public API.
   * Point this at any OpenAI-compatible server (Ollama, LM Studio, vLLM,
   * Together, Groq, OpenRouter, your own proxy, ...).
   */
  baseURL?: string;
  /** Extra headers, e.g. for a proxy that injects auth server-side. */
  headers?: Record<string, string>;
  /** Passed through to the request body (temperature, max_tokens, ...). */
  params?: Record<string, unknown>;
  /**
   * Show a reply that starts with `<think>…</think>` as reasoning rather than
   * text. Some models emit their thinking inline that way when the server
   * doesn't split it out. Only the very start of a reply counts. Default: true.
   */
  thinkTags?: boolean;
}

/**
 * Transport for the OpenAI Chat Completions API and any compatible server.
 * Uses SSE streaming (`stream: true`).
 */
export function openAIAdapter(options: OpenAIAdapterOptions): ChatTransport {
  const baseURL =
    options.baseURL ?? 'https://api.openai.com/v1/chat/completions';

  return {
    async *send(
      messages: ChatMessage[],
      signal: AbortSignal,
    ): AsyncIterable<StreamChunk> {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        ...options.headers,
      };
      if (options.apiKey) {
        headers['authorization'] = `Bearer ${options.apiKey}`;
      }

      let response: Response;
      try {
        response = await fetch(baseURL, {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({
            model: options.model,
            stream: true,
            // Ask for a trailing usage chunk (empty `choices`, populated
            // `usage`). OpenAI requires this opt-in to report token counts on a
            // streamed response; compatible servers that don't support it simply
            // omit the chunk, so this is safe to always send.
            stream_options: { include_usage: true },
            messages: messages.map((m) => ({
              role: m.role,
              content: toOpenAIContent(m),
            })),
            ...options.params,
          }),
        });
      } catch (err) {
        if (signal.aborted) return;
        yield { type: 'error', error: toMessage(err) };
        return;
      }

      if (!response.ok) {
        yield { type: 'error', error: await httpError(response) };
        return;
      }

      // Metadata trickles in across separate chunks: `finish_reason` lands on
      // the last content chunk (choices populated), while `usage` arrives in a
      // final chunk with empty `choices`. Accumulate both and attach to `done`.
      let rawFinishReason: string | undefined;
      let usage: TokenUsage | undefined;
      const doneChunk = (): StreamChunk => ({
        type: 'done',
        ...(rawFinishReason
          ? {
              rawFinishReason,
              finishReason: normalizeFinishReason(rawFinishReason),
            }
          : {}),
        ...(usage ? { usage } : {}),
      });

      const think = options.thinkTags === false ? undefined : new ThinkTagSplitter();
      // Tool calls stream as fragments keyed by `index`: the first carries the
      // id and name, later ones pieces of the arguments' JSON.
      const calls = new Map<number, { id: string; args: string; closed: boolean }>();
      let lastIndex = -1;
      /**
       * Which call a fragment belongs to. Normally its `index`. Some servers
       * omit it: then a known `id` finds its call, a fragment with no id and no
       * name continues the last call, and anything else starts a new one.
       */
      const callIndex = (tc: any): number => {
        if (typeof tc?.index === 'number') return (lastIndex = tc.index);
        if (typeof tc?.id === 'string' && tc.id) {
          for (const [i, c] of calls) if (c.id === tc.id) return (lastIndex = i);
        } else if (!tc?.function?.name && lastIndex >= 0) {
          return lastIndex;
        }
        return (lastIndex = Math.max(-1, ...calls.keys()) + 1);
      };
      /** Parse each call's arguments once it's complete. */
      function* closeCalls(): Generator<StreamChunk> {
        for (const call of calls.values()) {
          if (call.closed) continue;
          call.closed = true;
          const args = parseArgs(call.args);
          if (args !== undefined) yield { type: 'tool', id: call.id, args };
        }
      }
      /** Everything still held back, then the end. */
      function* finish(): Generator<StreamChunk> {
        if (think) yield* think.flush();
        yield* closeCalls();
        yield doneChunk();
      }

      try {
        for await (const data of parseSSE(response, signal)) {
          if (data === '[DONE]') {
            yield* finish();
            return;
          }
          let json: any;
          try {
            json = JSON.parse(data);
          } catch {
            continue; // ignore keep-alive / non-JSON lines
          }
          // Only choice 0 is the answer. With `n > 1` in params, servers send each
          // choice in its own chunk, so `choices[0]` is not always choice 0.
          const choice = Array.isArray(json.choices)
            ? json.choices.find((c: any) => (c?.index ?? 0) === 0)
            : undefined;
          const d = choice?.delta ?? {};
          // Reasoning, by whichever name the server uses for it.
          const reasoning = typeof d.reasoning_content === 'string' ? d.reasoning_content : d.reasoning;
          if (typeof reasoning === 'string' && reasoning) yield { type: 'reasoning', delta: reasoning };
          const delta: string | undefined = d.content;
          if (typeof delta === 'string' && delta) {
            if (think) yield* think.push(delta);
            else yield { type: 'delta', delta };
          }
          if (Array.isArray(d.tool_calls)) {
            for (const tc of d.tool_calls) {
              const index = callIndex(tc);
              let call = calls.get(index);
              if (!call) {
                call = { id: typeof tc.id === 'string' && tc.id ? tc.id : `call_${index}`, args: '', closed: false };
                calls.set(index, call);
                yield { type: 'tool', id: call.id, name: tc.function?.name ?? 'tool', state: 'pending' };
              }
              const piece = tc.function?.arguments;
              if (typeof piece === 'string' && piece) {
                call.args += piece;
                yield { type: 'tool', id: call.id, argsDelta: piece };
              } else if (piece && typeof piece === 'object') {
                // Some servers send the arguments already parsed.
                call.args = JSON.stringify(piece);
              }
            }
          }
          if (choice?.finish_reason) {
            rawFinishReason = choice.finish_reason;
            yield* closeCalls();
          }
          if (json.usage) {
            usage = {
              inputTokens: json.usage.prompt_tokens,
              outputTokens: json.usage.completion_tokens,
            };
          }
        }
        yield* finish();
      } catch (err) {
        if (signal.aborted) return;
        yield { type: 'error', error: toMessage(err) };
      }
    },
  };
}

/** A call's arguments, parsed; undefined while empty or not valid JSON. */
function parseArgs(json: string): unknown {
  if (!json.trim()) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}
