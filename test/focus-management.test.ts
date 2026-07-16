import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, mount, until, controllable } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * Actions that remove the focused control (retry drops the failed message,
 * stop swaps Stop→Send, clear empties everything, a click-send swaps Send→Stop)
 * must NOT drop keyboard focus onto <body>. Focus should land in the composer.
 * These assert the actual activeElement, and only relocate when focus was
 * already inside the widget.
 */
describe('focus management', () => {
  afterEach(cleanupAll);

  const textarea = (el: AiChat) =>
    el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;

  /** Give the widget a failed assistant turn so the Retry button renders. */
  function withFailedTurn(el: AiChat) {
    const now = Date.now();
    el.messages = [
      { id: 'u', role: 'user', content: 'hi', createdAt: now },
      { id: 'a', role: 'assistant', content: '', createdAt: now, error: 'boom' },
    ];
  }

  it('retry() moves focus to the composer (Retry button is removed)', async () => {
    const el = mount();
    withFailedTurn(el);
    const btn = await until(
      () => el.shadowRoot!.querySelector('button[part="retry-button"]') as HTMLButtonElement | null,
    );
    btn.focus();
    expect(el.shadowRoot!.activeElement).toBe(btn);

    // retry() calls send(), which does not resolve until the (hand-driven)
    // stream finishes — so kick it off WITHOUT awaiting and just assert focus
    // relocated. The transport hangs open; that's fine for this check.
    el.transport = controllable().transport;
    void el.retry();
    await until(() => el.shadowRoot!.activeElement === textarea(el));
    expect(el.shadowRoot!.activeElement, 'focus lands in composer').toBe(textarea(el));
  });

  it('stop() moves focus to the composer (Stop button is swapped for Send)', async () => {
    const el = mount();
    const ctl = controllable();
    el.transport = ctl.transport;
    void el.send('hello');
    await until(() => ctl.started);
    // Focus the Stop button that appears while busy.
    const stop = await until(
      () => el.shadowRoot!.querySelector('button[part="stop-button"]') as HTMLButtonElement | null,
    );
    stop.focus();
    expect(el.shadowRoot!.activeElement).toBe(stop);

    el.stop();
    await until(() => el.shadowRoot!.activeElement === textarea(el));
    expect(el.shadowRoot!.activeElement).toBe(textarea(el));
  });

  it('clear() moves focus to the composer when focus was inside the widget', async () => {
    const el = mount('<ai-chat show-clear></ai-chat>');
    el.messages = [{ id: 'u', role: 'user', content: 'hi', createdAt: Date.now() }];
    const clearBtn = await until(
      () => el.shadowRoot!.querySelector('button[part="clear-button"]') as HTMLButtonElement | null,
    );
    clearBtn.focus();
    expect(el.shadowRoot!.activeElement).toBe(clearBtn);

    el.clear();
    await until(() => el.shadowRoot!.activeElement === textarea(el));
    expect(el.shadowRoot!.activeElement).toBe(textarea(el));
  });

  it('does NOT steal focus when clear() is called programmatically from outside', async () => {
    const el = mount();
    el.messages = [{ id: 'u', role: 'user', content: 'hi', createdAt: Date.now() }];
    // Focus lives on a page element OUTSIDE the widget.
    const outside = document.createElement('button');
    outside.textContent = 'elsewhere';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    el.clear();
    // Give any scheduled focus a chance to (wrongly) fire.
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 30));
    expect(document.activeElement, 'must not yank focus into the widget').toBe(outside);

    outside.remove();
  });
});
