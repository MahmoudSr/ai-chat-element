import type { ChatMessage, ChatTransport, StreamChunk } from '../types.js';
import { parseSSE } from './sse.js';

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

      try {
        for await (const data of parseSSE(response, signal)) {
          let json: any;
          try {
            json = JSON.parse(data);
          } catch {
            continue;
          }
          switch (json.type) {
            case 'content_block_delta': {
              const delta: string | undefined = json.delta?.text;
              if (delta) yield { type: 'delta', delta };
              break;
            }
            case 'message_stop':
              yield { type: 'done' };
              return;
            case 'error':
              yield {
                type: 'error',
                error: json.error?.message ?? 'Anthropic stream error',
              };
              return;
          }
        }
        yield { type: 'done' };
      } catch (err) {
        if (signal.aborted) return;
        yield { type: 'error', error: toMessage(err) };
      }
    },
  };
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function httpError(response: Response): Promise<string> {
  let detail = '';
  try {
    const body = await response.text();
    detail = body ? ` – ${body.slice(0, 300)}` : '';
  } catch {
    /* ignore */
  }
  return `Request failed: ${response.status} ${response.statusText}${detail}`;
}
