import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * Auto-follow bug: mid-stream, each token re-renders the message's markdown,
 * and the rendered content can suddenly change height — most notably SHRINK
 * when prose collapses into a code block/table. Pinned at the bottom, that
 * shrink makes the browser clamp scrollTop down to the new max and fire a
 * scroll event that looks identical to the user scrolling up. The old
 * `_onScroll` unpinned on ANY scrollTop drop, so auto-follow died exactly when
 * markdown styling kicked in. The fix: a scrollTop drop only unpins when we
 * end up AWAY from the bottom with unchanged content (a real user scroll); a
 * clamp leaves us at the bottom.
 *
 * These run in a REAL sized viewport so the scroller actually overflows and
 * scrollTop clamping is real browser behavior, not simulation.
 */

/** Give the widget a real, overflowing viewport. */
function sized(): AiChat {
  const el = mount();
  const host = el.parentElement as HTMLElement;
  host.style.height = '300px';
  host.style.display = 'block';
  el.style.height = '300px';
  el.style.display = 'block';
  return el;
}

/** The internal scroll container. */
const scroller = (el: AiChat) =>
  el.shadowRoot!.querySelector('.messages') as HTMLElement;

/** True while the component is still pinned to the bottom (following). */
const following = (el: AiChat) =>
  (el as unknown as { _stickToBottom: boolean })._stickToBottom;

/** Flush pending requestAnimationFrame callbacks (the component auto-scrolls
 * in rAF; a late one would otherwise clobber test state mid-flight). */
const flushRaf = () =>
  new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

/** Stream enough plain text to overflow the 300px viewport, then settle. */
async function streamPastTheFold(el: AiChat) {
  const c = controllable();
  el.transport = c.transport;
  el.send('write a code block');
  await until(() => c.started);
  for (let i = 0; i < 40; i++) c.delta(`line ${i} of the streaming reply\n`);
  const sc = scroller(el);
  await until(() => sc.scrollHeight > sc.clientHeight);
  await flushRaf();
  await tick(20);
  await flushRaf();
  return sc;
}

describe('auto-follow vs markdown re-render', () => {
  afterEach(cleanupAll);

  it('stays pinned when shrinking content clamps scrollTop down (markdown reflow, not a user scroll)', async () => {
    const el = sized();
    const sc = await streamPastTheFold(el);

    // Add a tall spacer above the sentinel (as if prose is currently rendered),
    // and park at the very bottom — the state right before a markdown
    // re-render. Then let the IntersectionObserver settle on "pinned".
    const spacer = document.createElement('div');
    spacer.style.height = '200px';
    sc.insertBefore(spacer, sc.querySelector('.scroll-sentinel'));
    sc.scrollTop = sc.scrollHeight;
    await flushRaf();
    await tick(20);
    // Record a clean _onScroll baseline for exactly this state.
    sc.dispatchEvent(new Event('scroll'));
    (el as unknown as { _stickToBottom: boolean })._stickToBottom = true;
    await tick(10);
    expect(following(el), 'precondition: pinned at bottom').toBe(true);

    // The markdown re-render: prose collapses into a shorter block. Content
    // SHRINKS, so the browser clamps scrollTop down to the new max — we are
    // still at the bottom, but scrollTop just DROPPED, which is exactly what a
    // user upward-scroll looks like to a naive handler.
    sc.removeChild(spacer);
    sc.dispatchEvent(new Event('scroll')); // deterministic; the browser's own async event follows
    await flushRaf();
    await tick(20);

    expect(
      following(el),
      'a clamp from shrinking content must NOT be treated as the user scrolling up',
    ).toBe(true);
  });

  it('still unpins on a genuine user upward scroll', async () => {
    // Guard against "fixing" the bug by never unpinning at all.
    const el = sized();
    const sc = await streamPastTheFold(el);

    sc.scrollTop = sc.scrollHeight;
    sc.dispatchEvent(new Event('scroll'));
    (el as unknown as { _stickToBottom: boolean })._stickToBottom = true;
    await tick(10);
    expect(following(el), 'precondition: pinned at bottom').toBe(true);

    // A real user drag: content unchanged, and we END UP away from the bottom.
    sc.scrollTop = 0;
    sc.dispatchEvent(new Event('scroll'));
    await tick(10);

    expect(following(el), 'a real upward scroll must still unpin').toBe(false);
  });
});
