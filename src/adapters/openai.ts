import type { ChatMessage, ChatTransport, StreamChunk } from '../types.js';
import { parseSSE } from './sse.js';
import { httpError, toMessage } from './errors.js';

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
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
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

      try {
        for await (const data of parseSSE(response, signal)) {
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          let json: any;
          try {
            json = JSON.parse(data);
          } catch {
            continue; // ignore keep-alive / non-JSON lines
          }
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) yield { type: 'delta', delta };
        }
        yield { type: 'done' };
      } catch (err) {
        if (signal.aborted) return;
        yield { type: 'error', error: toMessage(err) };
      }
    },
  };
}
