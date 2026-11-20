import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage } from '../src/types.ts';

/**
 * The reasoning panel: a one-line "Thinking… / Thought for 12s" toggle with
 * the reasoning behind it. Collapsed by default, the reader's toggle survives
 * streaming, and it sits where the reasoning happened within the answer.
 */

const root = (el: AiChat) => el.shadowRoot!;
const panels = (el: AiChat) => [...root(el).querySelectorAll<HTMLElement>('.reasoning')];
const trigger = (el: AiChat, i = 0) => panels(el)[i]?.querySelector<HTMLButtonElement>('.reasoning__trigger') ?? null;
const content = (el: AiChat, i = 0) => panels(el)[i]?.querySelector<HTMLElement>('.reasoning__content') ?? null;
const last = (el: AiChat) => el.messages[el.messages.length - 1];

async function start(attrs = '') {
  const el = mount(`<ai-chat ${attrs}></ai-chat>`);
  const c = controllable();
  el.transport = c.transport;
  el.send('think about it');
  await until(() => c.started);
  return { el, c };
}

describe('reasoning panel', () => {
  afterEach(cleanupAll);

  it('shows "Thinking…" while it thinks, "Thought for …" after; collapsed by default', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'Let me work this out.' });
    await until(() => trigger(el));
    expect(trigger(el)!.textContent).toContain('Thinking…');
    expect(trigger(el)!.getAttribute('aria-expanded')).toBe('false');
    expect(content(el)!.hidden, 'collapsed: the reasoning is behind the toggle').toBe(true);
    expect(root(el).querySelector('.typing'), 'the panel replaces the typing dots').toBeNull();

    c.delta('The answer is 42.');
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    expect(trigger(el)!.textContent).toMatch(/Thought for \d+s/);
    expect(panels(el)[0].classList.contains('reasoning--live')).toBe(false);
  });

  it('opens on click, and stays open while more reasoning streams in', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'First, ' });
    await until(() => trigger(el));
    trigger(el)!.click();
    await el.updateComplete;
    expect(trigger(el)!.getAttribute('aria-expanded')).toBe('true');
    expect(content(el)!.hidden).toBe(false);
    expect(trigger(el)!.getAttribute('aria-controls')).toBe(content(el)!.id);

    for (const w of ['the ', 'facts. ', 'Then ', 'the ', 'answer.']) c.push({ type: 'reasoning', delta: w });
    await until(() => content(el)!.textContent!.includes('Then the answer.'));
    expect(trigger(el)!.getAttribute('aria-expanded'), 'streaming re-renders never snap it shut').toBe('true');

    c.delta('Done.');
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    expect(content(el)!.hidden, 'still open after it settles').toBe(false);

    trigger(el)!.click();
    await el.updateComplete;
    expect(content(el)!.hidden).toBe(true);
  });

  it('reasoning="expanded" starts open; reasoning="hidden" shows none but keeps the answer', async () => {
    const a = await start('reasoning="expanded"');
    a.c.push({ type: 'reasoning', delta: 'visible thoughts' });
    await until(() => content(a.el));
    expect(content(a.el)!.hidden).toBe(false);
    cleanupAll();

    const b = await start('reasoning="hidden"');
    b.c.push({ type: 'reasoning', delta: 'secret thoughts' });
    b.c.delta('The answer.');
    b.c.finish({});
    await until(() => !last(b.el).streaming);
    await b.el.updateComplete;
    expect(panels(b.el)).toHaveLength(0);
    expect(root(b.el).textContent).not.toContain('secret thoughts');
    expect(root(b.el).querySelector('.message--assistant .markdown')!.textContent).toContain('The answer.');
    expect(last(b.el).steps, 'hiding is display-only: the data is still there').toHaveLength(1);
  });

  it('sits where the reasoning happened: text, then reasoning, then more text', async () => {
    const { el, c } = await start();
    c.delta('Before.');
    await until(() => last(el).content === 'Before.');
    c.push({ type: 'reasoning', delta: 'mid-answer thought' });
    c.delta('After.');
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const body = root(el).querySelector('.message--assistant .message__body')!;
    const order = [...body.children].map((n) =>
      n.classList.contains('reasoning') ? 'reasoning' : n.textContent!.trim(),
    );
    expect(order).toEqual(['Before.', 'reasoning', 'After.']);
  });

  it('reasoning with no text (hidden by the provider) still shows its duration, with nothing to open', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: '', redacted: true });
    c.delta('Answer.');
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const t = trigger(el)!;
    expect(t.textContent).toMatch(/Thought for \d+s/);
    // Nothing to open: plain text, not a (disabled) button screen readers
    // would announce as "unavailable".
    expect(t.tagName).not.toBe('BUTTON');
    expect(t.hasAttribute('aria-expanded')).toBe(false);
    expect(content(el)).toBeNull();
  });

  it('a stored message renders its reasoning settled, with the recorded duration', async () => {
    const el = mount();
    const m: ChatMessage = {
      id: 'saved', role: 'assistant', content: 'From storage.', createdAt: 0,
      steps: [{ type: 'reasoning', id: 'reasoning-0', text: 'old thoughts', at: 0, startedAt: 1000, endedAt: 66_000 }],
    };
    el.messages = [m];
    await el.updateComplete;
    expect(trigger(el)!.textContent).toContain('Thought for 1m 5s');
    expect(panels(el)[0].classList.contains('reasoning--live')).toBe(false);
  });

  it('counts up while it thinks', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'slow thought' });
    await until(() => trigger(el));
    expect(trigger(el)!.querySelector('.reasoning__time'), 'no counter in the first second').toBeNull();
    await until(() => trigger(el)!.querySelector('.reasoning__time')?.textContent === '1s', 2500);
    c.finish({});
  });

  it('a reasoning-only reply is not shown as an empty response', async () => {
    const { el, c } = await start();
    c.push({ type: 'reasoning', delta: 'thought, then nothing to say' });
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    expect(root(el).querySelector('.empty-response')).toBeNull();
    expect(panels(el)).toHaveLength(1);
  });

  it('the screen reader hears the answer once, not the reasoning', async () => {
    const { el, c } = await start();
    const live = root(el).querySelector('[role="status"]')!;
    const heard: string[] = [];
    new MutationObserver(() => heard.push(live.textContent!.trim())).observe(live, { childList: true, characterData: true, subtree: true });
    c.push({ type: 'reasoning', delta: 'private chain of thought' });
    c.delta('Public answer.');
    c.finish({});
    await until(() => !last(el).streaming);
    await tick(50);
    expect(heard.join(' ')).not.toContain('private chain of thought');
    expect(heard.filter((h) => h).at(-1)).toBe('Public answer.');
  });
});
