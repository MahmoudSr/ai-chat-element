import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage } from '../src/types.ts';

/**
 * The reader's scroll position belongs to the reader. Three ways the component
 * used to take it away, all found by driving a long streaming reply in Chrome
 * with a real mouse wheel (none showed up with synthetic scrolls alone):
 *
 * 1. Snap-back: every token queues a follow-scroll for the next frame. Scroll
 *    up between the token and that frame and the queued scroll undid it.
 * 2. Jump lands short: jump-to-latest smooth-scrolled to where the bottom WAS
 *    when clicked. A fast stream moves the bottom during the animation, so it
 *    stopped short and never resumed following.
 * 3. Switching chats while scrolled up opened the new chat at the OLD scroll
 *    offset, mid-history, instead of at its latest message.
 *
 * Real sized viewport: scroll positions are the browser's, not simulated.
 */

function sized(): AiChat {
  const el = mount();
  const host = el.parentElement as HTMLElement;
  host.style.height = '300px';
  host.style.display = 'block';
  el.style.height = '300px';
  el.style.display = 'block';
  return el;
}

const scroller = (el: AiChat) => el.shadowRoot!.querySelector('.messages') as HTMLElement;
const internals = (el: AiChat) => el as unknown as { _stickToBottom: boolean; _showJump: boolean };
const gap = (sc: HTMLElement) => sc.scrollHeight - sc.scrollTop - sc.clientHeight;
const flushRaf = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/** Start a reply and stream it past the fold; returns the open stream. */
async function streaming(el: AiChat) {
  const c = controllable();
  el.transport = c.transport;
  el.send('write a long answer');
  await until(() => c.started);
  for (let i = 0; i < 40; i++) c.delta(`line ${i} of the streaming reply\n\n`);
  const sc = scroller(el);
  await until(() => sc.scrollHeight > sc.clientHeight * 2);
  await flushRaf();
  await tick(20);
  await flushRaf();
  return { c, sc };
}

/** The reader scrolls up by `by` px, as a real scroll event would report it. */
function readerScrollsUp(sc: HTMLElement, by: number): number {
  // First let _onScroll see the current height (content may just have grown),
  // so the upward move below reads as the reader, not as a reflow.
  sc.dispatchEvent(new Event('scroll'));
  const target = Math.max(0, sc.scrollTop - by);
  sc.scrollTop = target;
  sc.dispatchEvent(new Event('scroll'));
  return target;
}

function conversation(prefix: string, count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `[${prefix}${i}] a message\n\nwith a second paragraph so it has height`,
    createdAt: i,
  }));
}

describe('the reader keeps their place', () => {
  afterEach(cleanupAll);

  it('a scroll-up between a token and the next frame is not snapped back', async () => {
    const el = sized();
    const { c, sc } = await streaming(el);
    expect(internals(el)._stickToBottom, 'precondition: following').toBe(true);

    // A token lands: the render queues the follow-scroll for the next frame.
    c.delta('one more line\n\n');
    await until(() => el.messages.at(-1)!.content.endsWith('one more line\n\n'));
    await el.updateComplete;

    // Before that frame, the reader scrolls up.
    const target = readerScrollsUp(sc, 200);
    expect(internals(el)._stickToBottom, 'the scroll-up unpins').toBe(false);

    await flushRaf();
    await tick(30);
    expect(Math.abs(sc.scrollTop - target), 'reader left where they scrolled to').toBeLessThan(3);
  });

  it('a wheel scroll-up that lands in the same frame as new content is not snapped back', async () => {
    // The real-mouse case from Chrome: content grew since the last scroll event,
    // so _onScroll reads the move as a reflow. The wheel itself is the signal.
    const el = sized();
    const { c, sc } = await streaming(el);
    c.delta('one more line\n\n');
    await until(() => el.messages.at(-1)!.content.endsWith('one more line\n\n'));
    await el.updateComplete;

    sc.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true }));
    const target = Math.max(0, sc.scrollTop - 200);
    sc.scrollTop = target;
    sc.dispatchEvent(new Event('scroll')); // content grew: _onScroll alone can't tell

    await flushRaf();
    await tick(30);
    expect(internals(el)._stickToBottom, 'the wheel unpins').toBe(false);
    expect(Math.abs(sc.scrollTop - target), 'reader left where they scrolled to').toBeLessThan(3);
  });

  it('keeps following when the bottom observer briefly reports "not in view" mid-stream', async () => {
    // Guard for the snap-back fix: new content pushes the sentinel out of view
    // for a moment and the observer clears the pin; the queued follow-scroll is
    // what repairs that, so it must not stand down for anything but the reader.
    const el = sized();
    const { c, sc } = await streaming(el);
    for (let i = 0; i < 30; i++) {
      // Tokens rendered from inside a frame callback (as rAF-batching apps do):
      // the observer runs after this frame's layout, before the queued scroll.
      await new Promise<void>((r) => requestAnimationFrame(() => { c.delta(`chunk ${i}\n\n`); r(); }));
    }
    await flushRaf();
    await tick(50);
    await flushRaf();
    expect(gap(sc), 'still at the bottom').toBeLessThanOrEqual(2);
  });

  it('jump-to-latest catches a bottom that keeps moving, and follows again', async () => {
    const el = sized();
    const { c, sc } = await streaming(el);
    sc.dispatchEvent(new Event('scroll'));
    sc.scrollTop = 0;
    sc.dispatchEvent(new Event('scroll'));
    await flushRaf();
    await tick(30);
    expect(internals(el)._stickToBottom, 'precondition: reading back').toBe(false);

    const jump = await until(() => el.shadowRoot!.querySelector<HTMLButtonElement>('.jump'));
    jump.click();
    // A fast reply: a chunk every frame for longer than the smooth scroll runs.
    for (let i = 0; i < 40; i++) {
      c.delta(`fast chunk ${i}\nwith a second line\n\n`);
      await new Promise((r) => requestAnimationFrame(r));
    }
    await flushRaf();
    await tick(50);
    await flushRaf();
    expect(internals(el)._stickToBottom, 'following again after the jump').toBe(true);
    expect(gap(sc), 'at the bottom').toBeLessThanOrEqual(2);

    // ...and it keeps following what arrives next.
    c.delta('after the jump\n\nmore\n\nand more\n\n');
    await until(() => el.messages.at(-1)!.content.includes('after the jump'));
    await flushRaf();
    await tick(30);
    expect(gap(sc), 'still following').toBeLessThanOrEqual(2);
  });

  it('switching to another chat while scrolled up opens it at its latest message', async () => {
    const el = sized();
    el.messages = conversation('a', 30);
    await el.updateComplete;
    await flushRaf();
    await tick(30);
    const sc = scroller(el);

    readerScrollsUp(sc, 10_000);
    await flushRaf();
    await tick(30);
    expect(internals(el)._stickToBottom, 'precondition: reading back in chat A').toBe(false);

    el.messages = conversation('b', 30); // the sidebar swaps in chat B
    await el.updateComplete;
    await flushRaf();
    await tick(30);
    await flushRaf();

    expect(gap(sc), 'chat B opens at its latest message').toBeLessThanOrEqual(2);
    expect(internals(el)._stickToBottom, 'and follows it').toBe(true);
    expect(internals(el)._showJump, 'no stale jump arrow').toBe(false);
  });

  it('older messages arriving above (load earlier) do not count as a switch', async () => {
    // Guard: the switch rule must not throw a reader who is paging back to the bottom.
    const el = sized();
    el.messages = conversation('a', 30);
    await el.updateComplete;
    await flushRaf();
    await tick(30);
    const sc = scroller(el);
    readerScrollsUp(sc, 10_000);
    await flushRaf();
    await tick(30);

    el.messages = [...conversation('old', 10), ...el.messages];
    await el.updateComplete;
    await flushRaf();
    await tick(30);
    expect(internals(el)._stickToBottom, 'still reading back').toBe(false);
    expect(gap(sc), 'not thrown to the bottom').toBeGreaterThan(200);
  });
});
