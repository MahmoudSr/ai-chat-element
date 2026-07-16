import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, mount, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * The jump-to-latest scroll uses scrollTo({behavior:'smooth'}) in JS, which
 * IGNORES the CSS `scroll-behavior: auto` reduced-motion override — so honoring
 * prefers-reduced-motion has to happen in JS. These assert the behavior actually
 * flips based on the media query (WCAG 2.3.3).
 */
describe('reduced-motion honors the JS smooth scroll', () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
    vi.restoreAllMocks();
    cleanupAll();
  });

  /** Force matchMedia('(prefers-reduced-motion: reduce)') to a fixed answer. */
  function stubReducedMotion(reduce: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    })) as unknown as typeof window.matchMedia;
  }

  /** Mount a chat with enough messages to scroll, and spy its scroller. */
  async function mountWithSpy(): Promise<{ el: AiChat; spy: ReturnType<typeof vi.fn> }> {
    const el = mount();
    const now = Date.now();
    el.messages = Array.from({ length: 12 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 ? 'assistant' : ('user' as const),
      content: `message number ${i} with some length to it`,
      createdAt: now + i,
    }));
    const scroller = await until(
      () => el.shadowRoot!.querySelector('.messages') as HTMLElement | null,
    );
    const spy = vi.fn();
    scroller.scrollTo = spy as unknown as HTMLElement['scrollTo'];
    return { el, spy };
  }

  it('uses smooth scroll for the jump button when motion is allowed', async () => {
    stubReducedMotion(false);
    const { el, spy } = await mountWithSpy();
    // _jumpToBottom is what the jump button calls; reach it via the public path.
    (el as unknown as { _jumpToBottom(): void })._jumpToBottom();
    await until(() => spy.mock.calls.length > 0);
    expect(spy.mock.calls.at(-1)![0]).toMatchObject({ behavior: 'smooth' });
  });

  it('falls back to instant scroll when reduced motion is requested', async () => {
    stubReducedMotion(true);
    const { el, spy } = await mountWithSpy();
    (el as unknown as { _jumpToBottom(): void })._jumpToBottom();
    await until(() => spy.mock.calls.length > 0);
    expect(spy.mock.calls.at(-1)![0]).toMatchObject({ behavior: 'auto' });
  });
});
