import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import { cleanupAll, mount } from './helpers.ts';

/**
 * The docs promise `show-timestamps="false"` turns a default-on boolean off.
 * Lit's stock Boolean converter treats ANY present attribute as true, so the
 * string "false" used to switch the feature ON — the opposite of the docs. In
 * Angular/Vue templates `attr="false"` is the natural way to write it.
 */
describe('boolean attributes', () => {
  afterEach(cleanupAll);

  async function chat(attrs: string): Promise<AiChat> {
    const el = mount(`<ai-chat ${attrs}></ai-chat>`);
    el.messages = [{ id: 'a', role: 'assistant', content: 'hi', createdAt: Date.now() }];
    await el.updateComplete;
    return el;
  }

  it('"false" turns a default-on attribute off', async () => {
    const el = await chat('show-timestamps="false" show-names="false" show-copy="false" show-retry="false"');
    expect(el.showTimestamps).toBe(false);
    expect(el.showNames).toBe(false);
    expect(el.showCopy).toBe(false);
    expect(el.showRetry).toBe(false);
    expect(el.shadowRoot!.querySelector('[part~="time"]')).toBeNull();
  });

  it('presence, "" and "true" still turn an attribute on', async () => {
    for (const value of ['', '=""', '="true"']) {
      const el = await chat(`show-header${value}`);
      expect(el.showHeader, value || 'bare').toBe(true);
    }
  });

  it('"false" turns a default-off attribute off too', async () => {
    const el = await chat('show-header="false" allow-attachments="false"');
    expect(el.showHeader).toBe(false);
    expect(el.allowAttachments).toBe(false);
  });

  it('a reflected boolean still reflects as a bare attribute', async () => {
    const el = await chat('');
    el.showHeader = true;
    await el.updateComplete;
    expect(el.getAttribute('show-header')).toBe('');
    el.showHeader = false;
    await el.updateComplete;
    expect(el.hasAttribute('show-header')).toBe(false);
  });
});
