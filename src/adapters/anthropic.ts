import type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  TokenUsage,
} from '../types.js';
import { parseSSE } from './sse.js';
import { httpError, toMessage } from './errors.js';
import { normalizeFinishReason } from './finish.js';
import { toAnthropicContent } from './content.js';

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

/** What we track per streamed content block. */
interface Block {
  /** Set for a tool-call block: the id its later chunks are matched on. */
  toolId?: string;
  /** Runs on Anthropic's side (web search, code execution, MCP). */
  server?: boolean;
  /** Partial JSON of the tool's input, accumulated across deltas. */
  json: string;
}

/**
 * Chunks for a content block that just started. Thinking shows even when its
 * text is omitted (newer models can send none); a result block for a
 * server-side tool completes the call it answers.
 */
function startBlock(cb: any): { block: Block; chunks: StreamChunk[] } {
  const block: Block = { json: '' };
  const type: string = cb?.type ?? '';
  const chunks: StreamChunk[] = [];
  if (type === 'thinking') {
    chunks.push({ type: 'reasoning', delta: typeof cb.thinking === 'string' ? cb.thinking : '' });
  } else if (type === 'redacted_thinking') {
    chunks.push({ type: 'reasoning', delta: '', redacted: true });
  } else if (type === 'tool_use' || type === 'server_tool_use' || type === 'mcp_tool_use') {
    if (typeof cb.id === 'string' && cb.id) {
      block.toolId = cb.id;
      block.server = type !== 'tool_use';
      const startInput = cb.input && typeof cb.input === 'object' && Object.keys(cb.input).length ? cb.input : undefined;
      chunks.push({
        type: 'tool',
        id: cb.id,
        name: typeof cb.name === 'string' ? cb.name : 'tool',
        ...(type === 'mcp_tool_use' && cb.server_name ? { title: `${cb.server_name} · ${cb.name}` } : {}),
        ...(startInput ? { args: startInput } : {}),
        state: 'pending',
      });
    }
  } else if (type.endsWith('_tool_result') && typeof cb.tool_use_id === 'string') {
    const content = cb.content;
    // Errors come back as content `{ type: '..._error', error_code }`, or `is_error` (MCP).
    const errorCode =
      content && typeof content === 'object' && !Array.isArray(content) && String(content.type ?? '').endsWith('_error')
        ? String(content.error_code ?? content.type)
        : undefined;
    if (errorCode || cb.is_error) {
      chunks.push({ type: 'tool', id: cb.tool_use_id, error: errorCode ?? resultText(content) ?? 'Tool error' });
    } else {
      chunks.push({ type: 'tool', id: cb.tool_use_id, output: content ?? null });
    }
  } else if (type === 'text' && typeof cb.text === 'string' && cb.text) {
    chunks.push({ type: 'delta', delta: cb.text });
  }
  return { block, chunks };
}

/** The text of an MCP-style result (`[{ type: 'text', text }]`), for an error message. */
function resultText(content: unknown): string | undefined {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const text = content.map((c) => (c && typeof c.text === 'string' ? c.text : '')).join('');
    return text || undefined;
  }
  return undefined;
}

/** A tool's streamed input, parsed; undefined while empty or not valid JSON. */
function parseArgs(json: string): unknown {
  if (!json.trim()) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Transport for the Anthropic Messages API. Handles the `system` role
 * separately (Anthropic takes it as a top-level `system` field) and translates
 * the stream into chunks: text deltas, plus reasoning ("thinking") and tool
 * calls as steps — including Anthropic's server-side tools (web search, code
 * execution) and MCP calls, which arrive with their results.
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
        .map((m) => ({ role: m.role, content: toAnthropicContent(m) }));

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

      // Content blocks by index. Thinking and tool blocks become steps; a tool's
      // arguments arrive as partial JSON across deltas and parse at block stop.
      const blocks = new Map<number, Block>();

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
            case 'content_block_start': {
              const { block, chunks } = startBlock(json.content_block);
              if (typeof json.index === 'number') blocks.set(json.index, block);
              yield* chunks;
              break;
            }
            case 'content_block_delta': {
              const d = json.delta ?? {};
              const block = blocks.get(json.index);
              if (d.type === 'thinking_delta') {
                if (d.thinking) yield { type: 'reasoning', delta: d.thinking };
              } else if (d.type === 'input_json_delta') {
                if (block?.toolId && typeof d.partial_json === 'string' && d.partial_json) {
                  block.json += d.partial_json;
                  yield { type: 'tool', id: block.toolId, argsDelta: d.partial_json };
                }
              } else if (typeof d.text === 'string' && d.text) {
                // text_delta (and anything else that carries plain text).
                yield { type: 'delta', delta: d.text };
              }
              // signature_delta and citations_delta carry nothing to show.
              break;
            }
            case 'content_block_stop': {
              const block = blocks.get(json.index);
              if (block?.toolId) {
                const args = parseArgs(block.json);
                yield {
                  type: 'tool',
                  id: block.toolId,
                  ...(args !== undefined ? { args } : {}),
                  // A server-side tool (web search, code execution, MCP) now runs
                  // on Anthropic's side until its result block arrives. A tool for
                  // YOUR app stays pending: the model asked for it and stops.
                  ...(block.server ? { state: 'running' as const } : {}),
                };
              }
              blocks.delete(json.index);
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
