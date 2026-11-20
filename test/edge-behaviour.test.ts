import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage } from '../src/types.ts';

/** Release pass, section B: behaviour at the edges, with steps involved. */

const root = (el: AiChat) => el.shadowRoot!;
const last = (el: AiChat) => el.messages[el.messages.length - 1];
const timer = (el: AiChat) => (el as unknown as { _liveTimer?: number })._liveTimer;
const rowText = (el: AiChat) => [...root(el).querySelectorAll('.tool__header')].map((h) => h.textContent!.replace(/\s+/g, ' ').trim());

async function start(el: AiChat = mount()) {
  const c = controllable();
  el.transport = c.transport;
  el.send('go');
  await until(() => c.started);
  return { el, c };
}

describe('B1: Stop at every point', () => {
  afterEach(cleanupAll);

  it('Stop while thinking: the panel settles and the 1s tick stops', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'hmm' });
    await until(() => timer(el) !== undefined);
    el.stop();
    await until(() => !last(el).streaming);
    await el.updateComplete;
    expect(timer(el), 'no timer left running').toBeUndefined();
    expect(root(el).querySelector('.reasoning--live')).toBeNull();
    expect(root(el).querySelector('.reasoning__trigger')!.textContent).toMatch(/Thought for/);
  });

  it('Esc while arguments stream: "Not run"; Esc while it runs: "Didn\'t finish"', async () => {
    const a = await start();
    a.c.push({ type: 'tool', id: 't', name: 'search', state: 'pending', argsDelta: '{"q":' });
    await until(() => root(a.el).querySelector('.tool'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await until(() => !last(a.el).streaming);
    await a.el.updateComplete;
    expect(rowText(a.el)[0]).toContain('Not run');
    expect(timer(a.el)).toBeUndefined();
    cleanupAll();

    const b = await start();
    b.c.push({ type: 'tool', id: 't', name: 'build', state: 'running' });
    await until(() => root(b.el).querySelector('.tool'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await until(() => !last(b.el).streaming);
    await b.el.updateComplete;
    expect(rowText(b.el)[0]).toContain("Didn't finish");
    expect(root(b.el).querySelector('.tool--live')).toBeNull();
  });

  it('removing the element mid-thought clears its timer', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'x' });
    await until(() => timer(el) !== undefined);
    el.remove();
    expect(timer(el)).toBeUndefined();
  });
});

describe('B2: Retry, Copy and Edit with steps', () => {
  afterEach(cleanupAll);

  it('Retry after a failed reply with steps starts clean', async () => {
    const el = mount();
    let call = 0;
    const transports = [controllable(), controllable()];
    el.transport = { send: (m, s) => transports[call++].transport.send(m, s) };
    el.send('go');
    await until(() => transports[0].started);
    transports[0].push({ type: 'reasoning', delta: 'first try' });
    transports[0].push({ type: 'tool', id: 't', name: 'flaky', state: 'running' });
    await until(() => last(el).steps?.length === 2); // fail() would drop chunks still queued
    transports[0].fail(new Error('network down'));
    await until(() => last(el).error === 'network down');
    expect(last(el).steps).toHaveLength(2);

    el.retry();
    await until(() => transports[1].started);
    transports[1].delta('second try ok');
    transports[1].finish({});
    await until(() => !last(el).streaming && last(el).content === 'second try ok');
    expect(last(el).steps, 'the failed attempt\'s steps are gone').toBeUndefined();
    expect(el.messages.filter((m) => m.role === 'assistant')).toHaveLength(1);
  });

  it('Copy copies only the answer text, not reasoning or tool output', async () => {
    const el = mount();
    el.messages = [{
      id: 'a', role: 'assistant', content: 'The answer.', createdAt: 0,
      steps: [
        { type: 'reasoning', id: 'r', text: 'SECRET THOUGHTS', at: 0, startedAt: 0, endedAt: 1 },
        { type: 'tool', id: 't', name: 'x', state: 'success', output: 'TOOL OUTPUT', at: 0, startedAt: 0, endedAt: 1 },
      ],
    } as ChatMessage];
    await el.updateComplete;
    const write = vi.fn(() => Promise.resolve());
    const orig = navigator.clipboard.writeText;
    Object.defineProperty(navigator.clipboard, 'writeText', { value: write, configurable: true });
    try {
      root(el).querySelector<HTMLButtonElement>('[part~="copy-button"]')!.click();
      expect(write).toHaveBeenCalledWith('The answer.');
    } finally {
      Object.defineProperty(navigator.clipboard, 'writeText', { value: orig, configurable: true });
    }
  });

  it('a reply with only steps (no text) has no copy button, and edit on the user turn still works', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = [
      { id: 'u', role: 'user', content: 'question', createdAt: 0 },
      { id: 'a', role: 'assistant', content: '', createdAt: 1,
        steps: [{ type: 'tool', id: 't', name: 'x', state: 'success', output: 1, at: 0, startedAt: 0, endedAt: 1 }] } as ChatMessage,
    ];
    await el.updateComplete;
    const assistant = root(el).querySelector('.message--assistant')!;
    expect(assistant.querySelector('[part~="copy-button"]')).toBeNull();
    expect(root(el).querySelector('.message--user [part~="edit-button"]')).not.toBeNull();
  });
});

describe('B3: switching chats mid-tool', () => {
  afterEach(cleanupAll);

  it('the timer stops while away, the steps travel on the event, and the row is live again on return', async () => {
    const el = mount('<ai-chat conversation-id="a"></ai-chat>');
    const { c } = await start(el);
    c.push({ type: 'tool', id: 't', name: 'long', state: 'running' });
    await until(() => timer(el) !== undefined);
    const convA = el.messages;
    const seen: ChatMessage[] = [];
    el.addEventListener('ai-chat:background-message', (e) => seen.push((e as CustomEvent).detail.message));

    el.conversationId = 'b';
    el.messages = [];
    await el.updateComplete;
    await until(() => timer(el) === undefined);

    c.push({ type: 'tool', id: 't', argsDelta: '{}' });
    await until(() => seen.length > 0);
    expect(seen.at(-1)!.steps).toHaveLength(1);

    el.conversationId = 'a';
    el.messages = convA;
    await el.updateComplete;
    await until(() => root(el).querySelector('.tool--live'));
    await until(() => timer(el) !== undefined);
    c.push({ type: 'tool', id: 't', output: 'ok' });
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    expect(rowText(el)[0]).toContain('Done');
  });
});

describe('B4: two chats on one page', () => {
  afterEach(cleanupAll);

  it('toggles, timers and renderTool are per element', async () => {
    const steps = [{ type: 'reasoning', id: 'reasoning-0', text: 'x', at: 0, startedAt: 0, endedAt: 1000 }];
    const one = mount();
    const two = mount();
    const msg = (id: string) => ({ id, role: 'assistant', content: 'same', createdAt: 0, steps }) as ChatMessage;
    one.messages = [msg('same-id')];
    two.messages = [msg('same-id')];
    let calls = 0;
    one.renderTool = () => { calls++; return null; };
    await one.updateComplete;
    await two.updateComplete;
    root(one).querySelector<HTMLButtonElement>('.reasoning__trigger')!.click();
    await one.updateComplete;
    await two.updateComplete;
    expect(root(one).querySelector('.reasoning__trigger')!.getAttribute('aria-expanded')).toBe('true');
    expect(root(two).querySelector('.reasoning__trigger')!.getAttribute('aria-expanded')).toBe('false');

    const { c } = await start(two);
    c.push({ type: 'reasoning', delta: 'live in two' });
    await until(() => timer(two) !== undefined);
    expect(timer(one), 'the other chat has no timer').toBeUndefined();
    expect(calls, 'one\'s renderTool never ran for two\'s steps').toBe(0);
    c.finish({});
  });
});

describe('B5: load earlier with steps', () => {
  afterEach(cleanupAll);

  it('prepending older replies with steps keeps the reader\'s place', async () => {
    const el = mount('<ai-chat has-earlier></ai-chat>');
    const host = el.parentElement as HTMLElement;
    host.style.height = '300px';
    el.style.height = '300px';
    el.style.display = 'block';
    const turn = (id: string): ChatMessage => ({
      id, role: 'assistant', content: `[${id}] answer\n\nsecond paragraph`, createdAt: 0,
      steps: [{ type: 'tool', id: `${id}-t`, name: 'search', state: 'success', output: 1, at: 0, startedAt: 0, endedAt: 1000 }],
    } as ChatMessage);
    el.messages = Array.from({ length: 12 }, (_, i) => turn(`new${i}`));
    await el.updateComplete;
    await tick(100);
    const sc = root(el).querySelector('.messages') as HTMLElement;
    sc.scrollTop = 0;
    sc.dispatchEvent(new Event('scroll'));
    await tick(50);
    const anchor = [...root(el).querySelectorAll('.message')].find((n) => n.textContent!.includes('[new0]'))!;
    const before = anchor.getBoundingClientRect().top;
    await el.prependMessages(Array.from({ length: 8 }, (_, i) => turn(`old${i}`)));
    await tick(50);
    expect(Math.abs(anchor.getBoundingClientRect().top - before)).toBeLessThan(3);
    expect(root(el).querySelectorAll('.tool')).toHaveLength(20);
  });
});

describe('B7: labels', () => {
  afterEach(cleanupAll);

  it('a thoughtFor label without {duration} is shown as written', async () => {
    const el = mount();
    el.labels = { thoughtFor: 'Reasoned' };
    el.messages = [{ id: 'a', role: 'assistant', content: 'x', createdAt: 0,
      steps: [{ type: 'reasoning', id: 'r', text: 't', at: 0, startedAt: 0, endedAt: 3000 }] } as ChatMessage];
    await el.updateComplete;
    expect(root(el).querySelector('.reasoning__label')!.textContent).toBe('Reasoned');
  });

  it('a very long tool name is cut with an ellipsis, never widening the chat', async () => {
    const el = mount();
    (el.parentElement as HTMLElement).style.width = '360px';
    el.style.display = 'block';
    el.messages = [{ id: 'a', role: 'assistant', content: 'x', createdAt: 0,
      steps: [{ type: 'tool', id: 't', name: 'a_really_'.repeat(30) + 'long_tool_name', state: 'success', at: 0, startedAt: 0, endedAt: 1 }] } as ChatMessage];
    await el.updateComplete;
    const sc = root(el).querySelector('.messages') as HTMLElement;
    const name = root(el).querySelector('.tool__name') as HTMLElement;
    expect(sc.scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(sc.clientWidth);
    expect(name.scrollWidth > name.clientWidth, 'the name is truncated').toBe(true);
    expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
  });

  it('right-to-left: the time sits on the far (left) side, nothing overflows', async () => {
    document.documentElement.dir = 'rtl';
    try {
      const el = mount();
      el.labels = { toolSuccess: 'تم', thinking: 'يفكر…' };
      el.messages = [{ id: 'a', role: 'assistant', content: 'مرحبا', createdAt: 0,
        steps: [{ type: 'tool', id: 't', name: 'search', state: 'success', at: 0, startedAt: 0, endedAt: 2000 }] } as ChatMessage];
      await el.updateComplete;
      const head = root(el).querySelector('.tool__header')!.getBoundingClientRect();
      const name = root(el).querySelector('.tool__name')!.getBoundingClientRect();
      const time = root(el).querySelector('.tool__time')!.getBoundingClientRect();
      expect(name.right).toBeGreaterThan(time.right); // name starts on the right in RTL
      expect(time.left - head.left).toBeLessThan(60);
      const sc = root(el).querySelector('.messages') as HTMLElement;
      expect(sc.scrollWidth).toBeLessThanOrEqual(sc.clientWidth);
    } finally {
      document.documentElement.dir = '';
    }
  });
});
