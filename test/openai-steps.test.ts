import { afterEach, describe, expect, it, vi } from 'vitest';
import { openAIAdapter } from '../src/adapters/index.ts';
import { ThinkTagSplitter } from '../src/adapters/think-tags.ts';
import type { ChatMessage, StreamChunk } from '../src/types.ts';

/**
 * The OpenAI-compatible adapter turns reasoning fields, tool_calls fragments
 * and a leading <think>…</think> into steps. Text is unchanged otherwise.
 */

const msgs: ChatMessage[] = [{ id: '1', role: 'user', content: 'hi', createdAt: 0 }];
const chunk = (delta: object, finish?: string) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish ?? null }] })}\n\n`;

async function run(body: string, opts: { thinkTags?: boolean } = {}): Promise<StreamChunk[]> {
  vi.stubGlobal('fetch', async () => new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
  const out: StreamChunk[] = [];
  for await (const c of openAIAdapter({ model: 'm', ...opts }).send(msgs, new AbortController().signal)) out.push(c);
  return out;
}
const noDone = (c: StreamChunk[]) => c.filter((x) => x.type !== 'done');

/** Merge adjacent same-kind chunks, so assertions don't depend on chunking. */
function merged(c: StreamChunk[]) {
  const out: Array<{ type: string; text: string }> = [];
  for (const x of c) {
    if (x.type !== 'delta' && x.type !== 'reasoning') continue;
    const text = x.delta;
    const prev = out[out.length - 1];
    if (prev && prev.type === x.type) prev.text += text;
    else out.push({ type: x.type, text });
  }
  return out.filter((x) => x.text || x.type === 'reasoning');
}

describe('openAIAdapter: reasoning and tools', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads reasoning from reasoning_content (DeepSeek, vLLM, LM Studio)', async () => {
    const c = await run(chunk({ reasoning_content: 'Hmm.' }) + chunk({ content: 'Hi.' }, 'stop') + 'data: [DONE]\n\n');
    expect(noDone(c)).toEqual([{ type: 'reasoning', delta: 'Hmm.' }, { type: 'delta', delta: 'Hi.' }]);
  });

  it('reads reasoning from reasoning (OpenRouter, Ollama)', async () => {
    const c = await run(chunk({ role: 'assistant', content: '', reasoning: 'Think ' }) + chunk({ reasoning: 'more.' }) + chunk({ content: 'Answer.' }, 'stop') + 'data: [DONE]\n\n');
    expect(noDone(c)).toEqual([
      { type: 'reasoning', delta: 'Think ' },
      { type: 'reasoning', delta: 'more.' },
      { type: 'delta', delta: 'Answer.' },
    ]);
  });

  it('assembles tool_calls fragments by index: name first, args streamed, parsed at finish', async () => {
    const c = await run(
      chunk({ content: 'Checking.' }) +
      chunk({ tool_calls: [{ index: 0, id: 'call_a', type: 'function', function: { name: 'get_weather', arguments: '' } }] }) +
      chunk({ tool_calls: [{ index: 0, function: { arguments: '{"city":' } }] }) +
      chunk({ tool_calls: [{ index: 1, id: 'call_b', type: 'function', function: { name: 'get_time', arguments: '{}' } }] }) +
      chunk({ tool_calls: [{ index: 0, function: { arguments: '"Beirut"}' } }] }) +
      chunk({}, 'tool_calls') +
      'data: [DONE]\n\n',
    );
    expect(noDone(c)).toEqual([
      { type: 'delta', delta: 'Checking.' },
      { type: 'tool', id: 'call_a', name: 'get_weather', state: 'pending' },
      { type: 'tool', id: 'call_a', argsDelta: '{"city":' },
      { type: 'tool', id: 'call_b', name: 'get_time', state: 'pending' },
      { type: 'tool', id: 'call_b', argsDelta: '{}' },
      { type: 'tool', id: 'call_a', argsDelta: '"Beirut"}' },
      { type: 'tool', id: 'call_a', args: { city: 'Beirut' } },
      { type: 'tool', id: 'call_b', args: {} },
    ]);
    expect(c.at(-1)).toMatchObject({ type: 'done', finishReason: 'tool_calls' });
  });

  it('a whole tool call in one chunk (Ollama) works too', async () => {
    const c = await run(
      chunk({ tool_calls: [{ id: 'call_x', index: 0, type: 'function', function: { name: 'search', arguments: '{"q":"lit"}' } }] }, 'tool_calls') +
      'data: [DONE]\n\n',
    );
    expect(noDone(c)).toEqual([
      { type: 'tool', id: 'call_x', name: 'search', state: 'pending' },
      { type: 'tool', id: 'call_x', argsDelta: '{"q":"lit"}' },
      { type: 'tool', id: 'call_x', args: { q: 'lit' } },
    ]);
  });

  it('a reply starting with <think> becomes reasoning, even with the tags cut across chunks', async () => {
    const pieces = ['<thi', 'nk>\nPlan: ', 'be brief.', '\n</thi', 'nk>\n\n', 'Hello ', 'there.'];
    const c = await run(pieces.map((p) => chunk({ content: p })).join('') + 'data: [DONE]\n\n');
    expect(merged(c)).toEqual([
      { type: 'reasoning', text: '\nPlan: be brief.\n' },
      { type: 'delta', text: 'Hello there.' },
    ]);
  });

  it('a <think> later in a reply is just text; thinkTags: false keeps it as text', async () => {
    const later = await run(chunk({ content: 'Use a <think> tag like this.' }) + 'data: [DONE]\n\n');
    expect(noDone(later)).toEqual([{ type: 'delta', delta: 'Use a <think> tag like this.' }]);

    const off = await run(chunk({ content: '<think>x</think>y' }) + 'data: [DONE]\n\n', { thinkTags: false });
    expect(noDone(off)).toEqual([{ type: 'delta', delta: '<think>x</think>y' }]);
  });

  it('a plain text stream yields exactly what it did before', async () => {
    const c = await run(
      chunk({ role: 'assistant', content: 'Hello' }) + chunk({ content: ' world' }, 'stop') +
      `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 3, completion_tokens: 2 } })}\n\n` +
      'data: [DONE]\n\n',
    );
    expect(c).toEqual([
      { type: 'delta', delta: 'Hello' },
      { type: 'delta', delta: ' world' },
      { type: 'done', rawFinishReason: 'stop', finishReason: 'stop', usage: { inputTokens: 3, outputTokens: 2 } },
    ]);
  });
});

describe('openAIAdapter: odd but real stream shapes', () => {
  afterEach(() => vi.unstubAllGlobals());
  const raw = (o: object) => `data: ${JSON.stringify(o)}\n\n`;

  it('n > 1: only choice 0 makes the answer, even when other choices come in their own chunks', async () => {
    const c = await run(
      raw({ choices: [{ index: 0, delta: { content: 'First ' } }] }) +
      raw({ choices: [{ index: 1, delta: { content: 'OTHER ' } }] }) +
      raw({ choices: [{ index: 0, delta: { content: 'answer.' }, finish_reason: 'stop' }] }) +
      raw({ choices: [{ index: 1, delta: { content: 'CHOICE' }, finish_reason: 'length' }] }) +
      'data: [DONE]\n\n',
    );
    expect(merged(c)).toEqual([{ type: 'delta', text: 'First answer.' }]);
    expect(c.at(-1)).toMatchObject({ finishReason: 'stop' });
  });

  it('usage-only chunks (empty choices), null content and reasoning after content', async () => {
    const c = await run(
      raw({ choices: [{ index: 0, delta: { content: null, reasoning_content: 'pre' } }] }) +
      raw({ choices: [{ index: 0, delta: { content: 'A' } }] }) +
      raw({ choices: [{ index: 0, delta: { reasoning_content: 'post' } }] }) +
      raw({ choices: [], usage: { prompt_tokens: 1, completion_tokens: 2 } }) +
      'data: [DONE]\n\n',
    );
    expect(noDone(c)).toEqual([
      { type: 'reasoning', delta: 'pre' },
      { type: 'delta', delta: 'A' },
      { type: 'reasoning', delta: 'post' },
    ]);
    expect(c.at(-1)).toMatchObject({ usage: { inputTokens: 1, outputTokens: 2 } });
  });

  it('tool_calls fragments without an index continue the call they belong to', async () => {
    const c = await run(
      chunk({ tool_calls: [{ id: 'call_1', function: { name: 'search', arguments: '{"q":' } }] }) +
      chunk({ tool_calls: [{ function: { arguments: '"lit"}' } }] }) +
      chunk({ tool_calls: [{ id: 'call_2', function: { name: 'fetch', arguments: '{}' } }] }) +
      chunk({}, 'tool_calls') + 'data: [DONE]\n\n',
    );
    const tools = c.filter((x) => x.type === 'tool');
    expect(tools.filter((t) => 'name' in t).map((t) => (t as { id: string }).id)).toEqual(['call_1', 'call_2']);
    expect(tools).toContainEqual({ type: 'tool', id: 'call_1', args: { q: 'lit' } });
    expect(tools).toContainEqual({ type: 'tool', id: 'call_2', args: {} });
  });

  it('a stream that ends with no [DONE] still releases a held <think> and finishes', async () => {
    const c = await run(chunk({ content: '<think>never closed' }));
    expect(merged(c)).toEqual([{ type: 'reasoning', text: 'never closed' }]);
    expect(c.at(-1)!.type).toBe('done');
  });

  it('<think> with an empty answer: reasoning only, no stray whitespace text', async () => {
    const c = await run(chunk({ content: '<think>just thinking</think>\n\n' }) + 'data: [DONE]\n\n');
    expect(merged(c)).toEqual([{ type: 'reasoning', text: 'just thinking' }]);
  });
});

describe('ThinkTagSplitter', () => {
  const feed = (pieces: string[]) => {
    const s = new ThinkTagSplitter();
    return merged([...pieces.flatMap((p) => s.push(p)), ...s.flush()]);
  };

  it('splits at every possible cut point of both tags', () => {
    const full = '<think>reason here</think>\n\nThe answer.';
    for (let i = 1; i < full.length; i++) {
      expect(feed([full.slice(0, i), full.slice(i)]), `cut at ${i}`).toEqual([
        { type: 'reasoning', text: 'reason here' },
        { type: 'delta', text: 'The answer.' },
      ]);
    }
  });

  it('char by char, with leading whitespace', () => {
    expect(feed([...'  \n<think>a < b, and </thinking is not the tag</think>Done'])).toEqual([
      { type: 'reasoning', text: 'a < b, and </thinking is not the tag' },
      { type: 'delta', text: 'Done' },
    ]);
  });

  it('text that merely begins like the tag is released as text', () => {
    expect(feed(['<th', 'is is html'])).toEqual([{ type: 'delta', text: '<this is html' }]);
    expect(feed(['<'])).toEqual([{ type: 'delta', text: '<' }]);
  });

  it('a stream cut off mid-thought keeps what it thought', () => {
    expect(feed(['<think>half a thou', 'ght </thi'])).toEqual([{ type: 'reasoning', text: 'half a thought </thi' }]);
  });
});
