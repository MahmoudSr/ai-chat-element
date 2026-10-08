import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage } from '../src/types.ts';
import { cleanupAll, mount, tick, until } from './helpers.ts';

/**
 * Long conversations are paged by the app: it shows the newest messages, sets
 * `has-earlier`, and answers `ai-chat:load-earlier` with `prependMessages()`.
 * The component must ask exactly once per load, ask on its own when the reader
 * scrolls back, and — the part chats get wrong — keep what the reader is
 * looking at in place when older messages appear above it.
 *
 * Real sized viewport: scroll positions here are the browser's, not simulated.
 */

/** A widget 300px tall (taller with `height`), so a few dozen messages overflow it. */
function sized(attrs = '', height = 300): AiChat {
  const el = mount(`<ai-chat ${attrs}></ai-chat>`);
  const host = el.parentElement as HTMLElement;
  host.style.height = `${height}px`;
  host.style.display = 'block';
  el.style.height = `${height}px`;
  el.style.display = 'block';
  return el;
}

/**
 * `count` alternating turns, ids `${prefix}${n}`, each a couple of lines tall
 * (one line with `short`). Each carries a unique marker `[${prefix}${n}]`.
 */
function turns(prefix: string, count: number, short = false): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: short ? `[${prefix}${i}]` : `[${prefix}${i}] a message\nwith a second line so it has some height`,
    createdAt: i,
  }));
}

const root = (el: AiChat) => el.shadowRoot!;
const scroller = (el: AiChat) => root(el).querySelector('.messages') as HTMLElement;
const button = (el: AiChat) => root(el).querySelector('.earlier__button') as HTMLButtonElement | null;
const messageNode = (el: AiChat, id: string) =>
  [...root(el).querySelectorAll<HTMLElement>('.message')].find((n) => n.textContent?.includes(`[${id}]`));
const flushRaf = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Count `ai-chat:load-earlier` events and keep the last detail. */
function listen(el: AiChat) {
  const seen: Array<{ conversationId: string | null; oldest: ChatMessage }> = [];
  el.addEventListener('ai-chat:load-earlier', (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

describe('load earlier messages', () => {
  afterEach(cleanupAll);

  it('shows the control only when has-earlier is set and there are messages', async () => {
    const el = sized();
    el.messages = turns('new', 4);
    await el.updateComplete;
    expect(button(el)).toBeNull();

    el.hasEarlier = true;
    await el.updateComplete;
    expect(button(el)?.textContent?.trim()).toBe('Load earlier messages');

    el.messages = [];
    await el.updateComplete;
    expect(button(el)).toBeNull();
  });

  it('asks once per load on a click, with the oldest message and the conversation id', async () => {
    const el = sized('has-earlier load-earlier="button" conversation-id="c1"');
    el.messages = turns('new', 4);
    await el.updateComplete;
    const seen = listen(el);

    button(el)!.click();
    await el.updateComplete;
    button(el)!.click(); // still loading: must not ask again
    await el.updateComplete;

    expect(seen.length).toBe(1);
    expect(seen[0].conversationId).toBe('c1');
    expect(seen[0].oldest.id).toBe('new0');
    expect(button(el)!.disabled).toBe(true);
    expect(button(el)!.textContent?.trim()).toBe('Loading earlier messages…');
  });

  it('adds older messages above and keeps what the reader sees where it was', async () => {
    const el = sized('has-earlier load-earlier="button"');
    el.messages = turns('new', 30);
    await el.updateComplete;
    await flushRaf();
    const sc = scroller(el);
    expect(sc.scrollHeight).toBeGreaterThan(sc.clientHeight);

    // The reader scrolls back to near the top and is looking at message new2.
    sc.scrollTop = 40;
    sc.dispatchEvent(new Event('scroll'));
    await flushRaf();
    const target = messageNode(el, 'new2')!;
    const before = target.getBoundingClientRect().top;

    button(el)!.click();
    await el.updateComplete;
    await el.prependMessages(turns('old', 20));
    await flushRaf();

    expect(el.messages.length).toBe(50);
    expect(el.messages[0].id).toBe('old0');
    // The same DOM node (keyed by id), still at the same place on screen.
    expect(messageNode(el, 'new2')).toBe(target);
    // Scroll metrics are whole pixels while content heights are fractional, so a
    // couple of pixels of rounding is expected; a jump would be hundreds.
    expect(Math.abs(target.getBoundingClientRect().top - before)).toBeLessThanOrEqual(3);
    expect(button(el)!.disabled).toBe(false);
  });

  it('frees the control when the load returns nothing', async () => {
    const el = sized('has-earlier load-earlier="button"');
    el.messages = turns('new', 4);
    await el.updateComplete;
    button(el)!.click();
    await el.updateComplete;
    await el.prependMessages([]);
    expect(button(el)!.disabled).toBe(false);
    expect(el.messages.length).toBe(4);
  });

  it('loads on its own when the reader scrolls back to the top', async () => {
    const el = sized('has-earlier');
    el.messages = turns('new', 30);
    await el.updateComplete;
    await flushRaf();
    await tick(50);
    const seen = listen(el);
    expect(seen.length).toBe(0); // opening at the bottom is not reading back

    const sc = scroller(el);
    sc.scrollTop = sc.scrollTop - 50; // a real upward scroll unpins...
    sc.dispatchEvent(new Event('scroll'));
    sc.scrollTop = 0; // ...then reaches the top
    sc.dispatchEvent(new Event('scroll'));
    await until(() => seen.length === 1);
  });

  it('keeps loading while a short history still does not fill the view', async () => {
    // Tall enough that a few one-line messages leave room to spare.
    const el = sized('has-earlier', 1200);
    const seen = listen(el);
    el.messages = turns('new', 2, true);
    await until(() => seen.length === 1);
    await el.prependMessages(turns('older', 2, true));
    await until(() => seen.length === 2);
  });

  it('never asks on scroll with load-earlier="button", or without has-earlier', async () => {
    for (const attrs of ['has-earlier load-earlier="button"', '']) {
      const el = sized(attrs);
      const seen = listen(el);
      el.messages = turns('new', 2);
      await el.updateComplete;
      await flushRaf();
      await tick(80);
      expect(seen.length, attrs || 'no has-earlier').toBe(0);
    }
  });

  it('forgets a load that was out for a conversation no longer on screen', async () => {
    const el = sized('has-earlier load-earlier="button" conversation-id="a"');
    el.messages = turns('a', 4);
    await el.updateComplete;
    button(el)!.click();
    await el.updateComplete;
    expect(button(el)!.disabled).toBe(true);

    el.conversationId = 'b';
    el.messages = turns('b', 4);
    await el.updateComplete;
    expect(button(el)!.disabled).toBe(false);
  });
});
