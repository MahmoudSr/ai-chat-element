import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, mount } from './helpers.ts';

/**
 * Sending with no `.transport` used to fire only `ai-chat:error`: an app that
 * didn't listen saw the send button do nothing, with nothing in the console.
 */
describe('sending with no transport', () => {
  afterEach(() => {
    cleanupAll();
    vi.restoreAllMocks();
  });

  it('warns in the console once per element, and still fires ai-chat:error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount();
    const errors: string[] = [];
    el.addEventListener('ai-chat:error', (e) => errors.push((e as CustomEvent).detail.error));

    expect(await el.send('hello')).toBe(false);
    expect(await el.send('again')).toBe(false);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/No transport configured/);
    expect(errors.length).toBe(2);
  });
});
