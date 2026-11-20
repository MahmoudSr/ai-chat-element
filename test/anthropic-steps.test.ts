import { afterEach, describe, expect, it, vi } from 'vitest';
import { anthropicAdapter } from '../src/adapters/index.ts';
import type { ChatMessage, StreamChunk } from '../src/types.ts';

/**
 * The Anthropic adapter turns thinking blocks and tool calls into steps, from
 * the real Messages-API stream shapes. Text handling is unchanged.
 */

const msgs: ChatMessage[] = [{ id: '1', role: 'user', content: 'hi', createdAt: 0 }];

/** One SSE event per object, the way the API frames them. */
function sse(...events: object[]): string {
  return events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

function stub(body: string) {
  vi.stubGlobal('fetch', async () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
}

async function run(body: string): Promise<StreamChunk[]> {
  stub(body);
  const out: StreamChunk[] = [];
  for await (const c of anthropicAdapter({ model: 'm', apiKey: 'k' }).send(msgs, new AbortController().signal)) out.push(c);
  return out;
}

const start = { type: 'message_start', message: { usage: { input_tokens: 10 } } };
const stop = (reason = 'end_turn') => [
  { type: 'message_delta', delta: { stop_reason: reason }, usage: { output_tokens: 5 } },
  { type: 'message_stop' },
];
const without = (chunks: StreamChunk[], ...types: string[]) => chunks.filter((c) => !types.includes(c.type));

describe('anthropicAdapter: thinking and tools', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('thinking streams as reasoning; the signature is ignored; text is unchanged', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Let me think' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: ' it through.' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'EqQBCgIYAhIM' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'The answer.' } },
      { type: 'content_block_stop', index: 1 },
      ...stop(),
    ));
    expect(without(chunks, 'done')).toEqual([
      { type: 'reasoning', delta: '' },
      { type: 'reasoning', delta: 'Let me think' },
      { type: 'reasoning', delta: ' it through.' },
      { type: 'delta', delta: 'The answer.' },
    ]);
    expect(chunks.at(-1)).toMatchObject({ type: 'done', finishReason: 'stop' });
  });

  it('omitted thinking (no text, only a signature) still marks that it thought', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'abc' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hi.' } },
      ...stop(),
    ));
    expect(without(chunks, 'done')).toEqual([{ type: 'reasoning', delta: '' }, { type: 'delta', delta: 'Hi.' }]);
  });

  it('redacted thinking is a redacted reasoning step', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'redacted_thinking', data: 'ENCRYPTED' } },
      { type: 'content_block_stop', index: 0 },
      ...stop(),
    ));
    expect(without(chunks, 'done')).toEqual([{ type: 'reasoning', delta: '', redacted: true }]);
    expect(JSON.stringify(chunks)).not.toContain('ENCRYPTED');
  });

  it('a tool_use block: pending with its name, args stream as partial JSON, parse at stop', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Checking.' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_01', name: 'get_weather', input: {} } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"city": "Bei' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: 'rut"}' } },
      { type: 'content_block_stop', index: 1 },
      ...stop('tool_use'),
    ));
    expect(without(chunks, 'done')).toEqual([
      { type: 'delta', delta: 'Checking.' },
      { type: 'tool', id: 'toolu_01', name: 'get_weather', state: 'pending' },
      { type: 'tool', id: 'toolu_01', argsDelta: '{"city": "Bei' },
      { type: 'tool', id: 'toolu_01', argsDelta: 'rut"}' },
      { type: 'tool', id: 'toolu_01', args: { city: 'Beirut' } },
    ]);
    expect(chunks.at(-1)).toMatchObject({ type: 'done', finishReason: 'tool_calls' });
  });

  it('a server tool (web search) runs, then its result block completes it', async () => {
    const results = [{ type: 'web_search_result', url: 'https://example.com', title: 'Example' }];
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: {} } },
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"query":"lit"}' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: results } },
      { type: 'content_block_stop', index: 1 },
      ...stop(),
    ));
    expect(without(chunks, 'done')).toEqual([
      { type: 'tool', id: 'srvtoolu_1', name: 'web_search', state: 'pending' },
      { type: 'tool', id: 'srvtoolu_1', argsDelta: '{"query":"lit"}' },
      { type: 'tool', id: 'srvtoolu_1', args: { query: 'lit' }, state: 'running' },
      { type: 'tool', id: 'srvtoolu_1', output: results },
    ]);
  });

  it('a server tool error result fails the call with its error code', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'server_tool_use', id: 's1', name: 'web_search', input: { query: 'x' } } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'web_search_tool_result', tool_use_id: 's1', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } } },
      ...stop(),
    ));
    expect(chunks.find((c) => c.type === 'tool' && 'error' in c)).toEqual({ type: 'tool', id: 's1', error: 'max_uses_exceeded' });
    // Input given whole at the start counts as its arguments.
    expect(chunks[0]).toMatchObject({ type: 'tool', id: 's1', args: { query: 'x' } });
  });

  it('an MCP call is titled with its server; an is_error result fails it', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'mcp_tool_use', id: 'm1', name: 'create_issue', server_name: 'github', input: { title: 'x' } } },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'mcp_tool_result', tool_use_id: 'm1', is_error: true, content: [{ type: 'text', text: 'Repository not found' }] } },
      ...stop(),
    ));
    expect(chunks[0]).toMatchObject({ type: 'tool', id: 'm1', name: 'create_issue', title: 'github · create_issue' });
    expect(chunks.find((c) => c.type === 'tool' && 'error' in c)).toEqual({ type: 'tool', id: 'm1', error: 'Repository not found' });
  });

  it('a plain text stream yields exactly what it did before', async () => {
    const chunks = await run(sse(
      start,
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } },
      { type: 'content_block_stop', index: 0 },
      ...stop(),
    ));
    expect(chunks).toEqual([
      { type: 'delta', delta: 'Hello' },
      { type: 'delta', delta: ' world' },
      { type: 'done', rawFinishReason: 'end_turn', finishReason: 'stop', usage: { inputTokens: 10, outputTokens: 5 } },
    ]);
  });
});
