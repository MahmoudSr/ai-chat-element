import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, mount, until, controllable } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';

/**
 * Screen readers must hear the assistant's reply ONCE, when it settles — not
 * re-announced token-by-token as it streams. That means: the message log has
 * NO aria-live, and a separate hidden polite region carries only the settled
 * text. These assert exactly that.
 */
describe('screen-reader live region', () => {
  afterEach(cleanupAll);

  const log = (el: AiChat) =>
    el.shadowRoot!.querySelector('[role="log"]') as HTMLElement;
  const live = (el: AiChat) =>
    el.shadowRoot!.querySelector('.sr-live') as HTMLElement;

  it('the message log is role="log" WITHOUT aria-live (no per-token spam)', async () => {
    const el = mount();
    await el.updateComplete;
    expect(log(el)).toBeTruthy();
    expect(
      log(el).hasAttribute('aria-live'),
      'the log must not be a live region',
    ).toBe(false);
  });

  it('exposes a hidden polite live region', async () => {
    const el = mount();
    await el.updateComplete;
    const region = live(el);
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
    // Visually hidden but present in the a11y tree.
    expect(region.getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  it('does NOT announce mid-stream, then announces the settled reply once', async () => {
    const el = mount();
    const ctl = controllable();
    el.transport = ctl.transport;
    void el.send('hi');
    await until(() => ctl.started);

    // Stream several tokens. The live region must stay EMPTY the whole time —
    // this is the anti-spam guarantee.
    ctl.delta('Hel');
    ctl.delta('lo, ');
    ctl.delta('world');
    await el.updateComplete;
    expect(live(el).textContent?.trim(), 'silent while streaming').toBe('');

    // Settle the turn. Now — and only now — the full reply is announced once.
    ctl.close();
    await until(() => live(el).textContent!.includes('Hello, world'));
    expect(live(el).textContent?.trim()).toBe('Hello, world');
  });

  it('announces an error result', async () => {
    const el = mount();
    const ctl = controllable();
    el.transport = ctl.transport;
    void el.send('hi');
    await until(() => ctl.started);
    ctl.fail(new Error('network down'));
    await until(() => live(el).textContent!.includes('network down'));
    expect(live(el).textContent).toContain('network down');
  });

  it('announces the empty-response note when the reply is blank', async () => {
    const el = mount();
    const ctl = controllable();
    el.transport = ctl.transport;
    void el.send('hi');
    await until(() => ctl.started);
    ctl.close(); // closes with no deltas → empty reply
    await until(() => live(el).textContent!.trim().length > 0);
    // Default emptyResponse label is "No response."
    expect(live(el).textContent).toContain('No response.');
  });
});
