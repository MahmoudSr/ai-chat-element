import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import { cleanupAll, mount, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * Every interactive control must show a visible keyboard-focus ring
 * (:focus-visible), and it must be customizable via the --ai-chat-focus-* vars.
 *
 * :focus-visible only matches under real keyboard modality, so these drive real
 * keyboard events via userEvent (CDP-level) rather than a programmatic .focus(),
 * which Chromium does NOT treat as keyboard focus. We focus the retry button on
 * a failed message — it's always present and enabled (unlike the send button,
 * which is disabled while the input is empty). Assertions FAIL on the old
 * (no focus rule) code.
 */
describe('keyboard focus ring', () => {
  afterEach(cleanupAll);

  /** Mount a chat showing a failed message so the (enabled) retry button exists. */
  async function mountWithRetry(): Promise<{ el: AiChat; btn: HTMLButtonElement }> {
    const el = mount();
    el.messages = [
      { id: 'u', role: 'user', content: 'hi', createdAt: Date.now() },
      {
        id: 'a',
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        error: 'boom',
      },
    ];
    const btn = await until(
      () =>
        el.shadowRoot!.querySelector(
          'button[part="retry-button"]',
        ) as HTMLButtonElement | null,
    );
    return { el, btn };
  }

  /** Establish keyboard modality (a real key press), then focus the control. */
  async function keyboardFocus(el: AiChat, btn: HTMLButtonElement) {
    // A real Tab press flips Chromium into keyboard modality so the next focus
    // matches :focus-visible.
    await userEvent.keyboard('{Tab}');
    btn.focus();
    await until(() => el.shadowRoot!.activeElement === btn);
  }

  it('paints OUR focus ring under keyboard focus (derived from the accent)', async () => {
    const { el, btn } = await mountWithRetry();
    // Set the accent to a distinctive color; our default focus ring is a
    // softened mix of it, so the resolved outline must contain that hue — a UA
    // default outline would NOT. This discriminates our ring from the browser's.
    el.style.setProperty('--ai-chat-accent', 'rgb(0, 128, 255)');
    await keyboardFocus(el, btn);

    expect(btn.matches(':focus-visible'), 'should be keyboard-focused').toBe(true);
    const cs = getComputedStyle(btn);
    expect(parseFloat(cs.outlineWidth), 'ring has width').toBeGreaterThan(0);
    expect(cs.outlineStyle).toBe('solid');
    // color-mix(... accent 55%, transparent) resolves to the accent hue at 55%
    // alpha — Chromium serializes it as `color(srgb 0 0.501961 1 / 0.55)`. The
    // 0.55 alpha is the fingerprint of OUR softened ring; a UA default outline
    // has none of this. Assert the accent channels and the alpha are present.
    const color = cs.outlineColor;
    expect(color, `got ${color}`).toMatch(/0\.50196|128/); // green channel of the accent
    expect(color, `got ${color}`).toMatch(/0\.55|\/ ?0?\.55/); // 55% softening
  });

  it('does NOT paint the ring when unfocused', async () => {
    const { btn } = await mountWithRetry();
    const cs = getComputedStyle(btn);
    expect(parseFloat(cs.outlineWidth) === 0 || cs.outlineStyle === 'none').toBe(
      true,
    );
  });

  it('honors a customized --ai-chat-focus-width', async () => {
    const { el, btn } = await mountWithRetry();
    el.style.setProperty('--ai-chat-focus-width', '5px');
    await keyboardFocus(el, btn);
    expect(parseFloat(getComputedStyle(btn).outlineWidth)).toBeCloseTo(5, 1);
  });

  it('honors a customized --ai-chat-focus-color', async () => {
    const { el, btn } = await mountWithRetry();
    el.style.setProperty('--ai-chat-focus-color', 'rgb(255, 0, 0)');
    await keyboardFocus(el, btn);
    expect(getComputedStyle(btn).outlineColor).toBe('rgb(255, 0, 0)');
  });
});
