import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, until } from './helpers.ts';
import { addReasoning, closeReasoning, settleSteps, upsertTool } from '../src/steps.ts';
import { functionAdapter } from '../src/adapters/function.ts';
import type { ChatMessage, ReasoningStep, StreamChunk, ToolStep } from '../src/types.ts';

/**
 * Reasoning and tool calls arrive as chunks and build up `message.steps`.
 * `content` stays the whole answer text on its own; each step records where it
 * happened in that text (`at`), so text -> tool -> text keeps its order.
 */

const msg = (content = ''): ChatMessage => ({ id: 'a', role: 'assistant', content, createdAt: 0, streaming: true });
const tool = (m: ChatMessage, i: number) => m.steps![i] as ToolStep;
const reasoning = (m: ChatMessage, i: number) => m.steps![i] as ReasoningStep;

describe('step rules (pure)', () => {
  it('reasoning continues until something else happens, then a new step starts', () => {
    let m = addReasoning(msg(), { type: 'reasoning', delta: 'First ' }, 1);
    m = addReasoning(m, { type: 'reasoning', delta: 'thought.' }, 2);
    expect(m.steps).toHaveLength(1);
    expect(reasoning(m, 0)).toMatchObject({ text: 'First thought.', at: 0, startedAt: 1 });
    expect(reasoning(m, 0).endedAt).toBeUndefined();

    m = upsertTool(m, { type: 'tool', id: 't1', name: 'search' }, 3); // closes the reasoning
    expect(reasoning(m, 0).endedAt).toBe(3);
    m = addReasoning(m, { type: 'reasoning', delta: 'Second.' }, 4);
    expect(m.steps!.map((s) => s.type)).toEqual(['reasoning', 'tool', 'reasoning']);
    expect(reasoning(m, 2)).toMatchObject({ text: 'Second.', startedAt: 4 });
    expect(reasoning(m, 2).id).not.toBe(reasoning(m, 0).id);
  });

  it('records where each step happened in the answer text', () => {
    let m = msg('Let me check. ');
    m = upsertTool(m, { type: 'tool', id: 't1', name: 'search' }, 1);
    m = { ...m, content: m.content + 'Found it. ' };
    m = upsertTool(m, { type: 'tool', id: 't2', name: 'fetch' }, 2);
    expect(tool(m, 0).at).toBe('Let me check. '.length);
    expect(tool(m, 1).at).toBe('Let me check. Found it. '.length);
    // Updating a call later never moves it.
    m = { ...m, content: m.content + 'Done.' };
    m = upsertTool(m, { type: 'tool', id: 't1', output: 'ok' }, 3);
    expect(tool(m, 0).at).toBe('Let me check. '.length);
  });

  it('a tool call is upserted by id; outcomes imply their state', () => {
    let m = upsertTool(msg(), { type: 'tool', id: 't1', name: 'weather', state: 'pending' }, 1);
    m = upsertTool(m, { type: 'tool', id: 't1', argsDelta: '{"city":' }, 2);
    m = upsertTool(m, { type: 'tool', id: 't1', argsDelta: '"Beirut"}' }, 3);
    expect(tool(m, 0)).toMatchObject({ name: 'weather', state: 'pending', argsText: '{"city":"Beirut"}' });
    m = upsertTool(m, { type: 'tool', id: 't1', args: { city: 'Beirut' }, state: 'running' }, 4);
    m = upsertTool(m, { type: 'tool', id: 't1', output: { tempC: 24 } }, 9);
    expect(m.steps).toHaveLength(1);
    expect(tool(m, 0)).toMatchObject({ name: 'weather', state: 'success', args: { city: 'Beirut' }, output: { tempC: 24 }, startedAt: 1, endedAt: 9 });

    let e = upsertTool(msg(), { type: 'tool', id: 'x', name: 'db' }, 1);
    expect(tool(e, 0).state).toBe('running'); // a new call with no state is running
    e = upsertTool(e, { type: 'tool', id: 'x', error: 'timeout' }, 5);
    expect(tool(e, 0)).toMatchObject({ state: 'error', error: 'timeout', endedAt: 5 });
  });

  it('never mutates: messages are shared by reference with the background registry', () => {
    const a = addReasoning(msg(), { type: 'reasoning', delta: 'x' }, 1);
    const frozen = JSON.stringify(a);
    addReasoning(a, { type: 'reasoning', delta: 'y' }, 2);
    upsertTool(a, { type: 'tool', id: 't', name: 'n' }, 3);
    settleSteps(a, 4);
    expect(JSON.stringify(a)).toBe(frozen);
  });

  it('closing with nothing open returns the same message (no per-token allocation)', () => {
    const m = msg('hi');
    expect(closeReasoning(m, 1)).toBe(m);
  });

  it('marks redacted reasoning', () => {
    const m = addReasoning(msg(), { type: 'reasoning', delta: '', redacted: true }, 1);
    expect(reasoning(m, 0)).toMatchObject({ text: '', redacted: true });
  });
});

describe('steps in the component', () => {
  afterEach(cleanupAll);

  const last = (el: Element & { messages: ChatMessage[] }) => el.messages[el.messages.length - 1];

  it('builds steps from a live stream and keeps the answer text whole', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    el.send('weather?');
    await until(() => c.started);
    c.push({ type: 'reasoning', delta: 'Need the weather.' });
    await until(() => last(el).steps?.length === 1);
    expect(reasoning(last(el), 0).endedAt, 'still thinking').toBeUndefined();

    c.delta('Checking. ');
    await until(() => last(el).content === 'Checking. ');
    expect(reasoning(last(el), 0).endedAt, 'text ends the reasoning').toBeTypeOf('number');

    c.push({ type: 'tool', id: 't1', name: 'weather', args: { city: 'Beirut' } });
    c.push({ type: 'tool', id: 't1', output: { tempC: 24 } });
    c.delta('It is 24°C.');
    c.finish({});
    await until(() => !last(el).streaming);

    const m = last(el);
    expect(m.content).toBe('Checking. It is 24°C.');
    expect(m.steps!.map((s) => s.type)).toEqual(['reasoning', 'tool']);
    expect(tool(m, 1)).toMatchObject({ state: 'success', at: 'Checking. '.length });
  });

  it('a turn of only tool calls still fires ai-chat:message (it is a real turn)', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    const fired: ChatMessage[] = [];
    el.addEventListener('ai-chat:message', (e) => fired.push((e as CustomEvent).detail.message));
    el.send('run it');
    await until(() => c.started);
    c.push({ type: 'tool', id: 't1', name: 'deploy', state: 'running' });
    c.push({ type: 'tool', id: 't1', output: 'deployed' });
    c.finish({});
    await until(() => !last(el).streaming);
    expect(fired).toHaveLength(1);
    expect(fired[0].steps).toHaveLength(1);
  });

  it('settling closes reasoning; an unfinished tool keeps its state (shown as not finished)', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    el.send('go');
    await until(() => c.started);
    c.push({ type: 'tool', id: 't1', name: 'slow', state: 'running' });
    c.push({ type: 'reasoning', delta: 'waiting on it' });
    await until(() => last(el).steps?.length === 2);
    el.stop();
    await until(() => !last(el).streaming);
    const m = last(el);
    expect(tool(m, 0).state).toBe('running');
    expect(reasoning(m, 1).endedAt).toBeTypeOf('number');
  });

  it('steps keep building in the background and are there when you switch back', async () => {
    const el = mount('<ai-chat conversation-id="a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;
    el.send('long task');
    await until(() => c.started);
    c.push({ type: 'reasoning', delta: 'Planning.' });
    await until(() => last(el).steps?.length === 1);
    const convA = el.messages;

    const bg: ChatMessage[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push((e as CustomEvent).detail.message));
    el.conversationId = 'b';
    el.messages = [];
    await el.updateComplete;

    c.push({ type: 'tool', id: 't1', name: 'search', state: 'running' });
    await until(() => bg.some((m) => m.steps?.length === 2));

    el.conversationId = 'a';
    el.messages = convA;
    await el.updateComplete;
    c.push({ type: 'tool', id: 't1', output: 'found' });
    c.finish({});
    await until(() => !last(el).streaming && (last(el).steps?.length ?? 0) === 2);
    expect(last(el).steps!.map((s) => s.type)).toEqual(['reasoning', 'tool']);
    expect(tool(last(el), 1).state).toBe('success');
  });

  it('a tool chunk without an id is ignored, not crashed on', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    el.send('x');
    await until(() => c.started);
    c.push({ type: 'tool', name: 'nameless' } as unknown as StreamChunk);
    c.delta('fine');
    c.finish({});
    await until(() => !last(el).streaming);
    expect(last(el).content).toBe('fine');
    expect(last(el).steps).toBeUndefined();
  });
});

describe('functionAdapter with structured chunks', () => {
  it('passes chunks through alongside plain strings, and ends once', async () => {
    const t = functionAdapter(async function* () {
      yield { type: 'reasoning', delta: 'hmm' };
      yield 'Hello';
      yield { type: 'tool', id: 't', name: 'n', output: 1 };
    });
    const got: StreamChunk[] = [];
    for await (const ch of t.send([], new AbortController().signal)) got.push(ch);
    expect(got.map((g) => g.type)).toEqual(['reasoning', 'delta', 'tool', 'done']);
  });

  it("a generator that yields its own done/error isn't given a second one", async () => {
    const t = functionAdapter(async function* () {
      yield 'x';
      yield { type: 'done', finishReason: 'stop' };
      yield 'ignored after done';
    });
    const got: StreamChunk[] = [];
    for await (const ch of t.send([], new AbortController().signal)) got.push(ch);
    expect(got).toEqual([{ type: 'delta', delta: 'x' }, { type: 'done', finishReason: 'stop' }]);
  });
});
