import type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  TokenUsage,
} from '../types.js';
import { parseSSE } from './sse.js';
import { httpError, toMessage } from './errors.js';
import { normalizeFinishReason } from './finish.js';

export interface AnthropicAdapterOptions {
  /** API key. WARNING: exposing a key in the browser is insecure — prefer a proxy. */
  apiKey?: string;
  /** Model id, e.g. "claude-sonnet-5" or "claude-opus-4-8". */
  model: string;
  /** Defaults to Anthropic's public Messages API. */
  baseURL?: string;
  /** Extra headers, e.g. for a proxy. */
  headers?: Record<string, string>;
  /** Max tokens to generate. Anthropic requires this; defaults to 1024. */
  maxTokens?: number;
  /** Passed through to the request body (temperature, top_p, ...). */
  params?: Record<string, unknown>;
  /**
   * When calling Anthropic directly from a browser you must opt in to CORS.
   * Ignored when you route through your own proxy. Default: true.
   */
  browserAccess?: boolean;
}

/**
 * Transport for the Anthropic Messages API. Handles the `system` role
 * separately (Anthropic takes it as a top-level `system` field) and translates
 * the `content_block_delta` SSE events into text deltas.
 */
export function anthropicAdapter(
  options: AnthropicAdapterOptions,
): ChatTransport {
  const baseURL = options.baseURL ?? 'https://api.anthropic.com/v1/messages';

  return {
    async *send(
      messages: ChatMessage[],
      signal: AbortSignal,
    ): AsyncIterable<StreamChunk> {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...options.headers,
      };
      if (options.apiKey) headers['x-api-key'] = options.apiKey;
      if (options.browserAccess !== false) {
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
      }

      // Anthropic wants system prompts out-of-band and only user/assistant turns.
      const system = messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n');
      const turns = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      let response: Response;
      try {
        response = await fetch(baseURL, {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({
            model: options.model,
            stream: true,
            max_tokens: options.maxTokens ?? 1024,
            ...(system ? { system } : {}),
            messages: turns,
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

      // Metadata is spread across events: `message_start` carries input tokens,
      // `message_delta` carries the stop_reason and cumulative output tokens.
      // Gather both and attach to the `done` chunk emitted on `message_stop`.
      let rawStopReason: string | undefined;
      let usage: TokenUsage | undefined;
      const setUsage = (patch: TokenUsage) => {
        usage = { ...usage, ...patch };
      };
      const doneChunk = (): StreamChunk => ({
        type: 'done',
        ...(rawStopReason
          ? {
              rawFinishReason: rawStopReason,
              finishReason: normalizeFinishReason(rawStopReason),
            }
          : {}),
        ...(usage ? { usage } : {}),
      });

      try {
        for await (const data of parseSSE(response, signal)) {
          let json: any;
          try {
            json = JSON.parse(data);
          } catch {
            continue;
          }
          switch (json.type) {
            case 'message_start': {
              const input = json.message?.usage?.input_tokens;
              if (typeof input === 'number') setUsage({ inputTokens: input });
              break;
            }
            case 'content_block_delta': {
              const delta: string | undefined = json.delta?.text;
              if (delta) yield { type: 'delta', delta };
              break;
            }
            case 'message_delta': {
              if (json.delta?.stop_reason) rawStopReason = json.delta.stop_reason;
              const output = json.usage?.output_tokens;
              if (typeof output === 'number') setUsage({ outputTokens: output });
              break;
            }
            case 'message_stop':
              yield doneChunk();
              return;
            case 'error':
              yield {
                type: 'error',
                error: json.error?.message ?? 'Anthropic stream error',
              };
              return;
          }
        }
        yield doneChunk();
      } catch (err) {
        if (signal.aborted) return;
        yield { type: 'error', error: toMessage(err) };
      }
    },
  };
}
