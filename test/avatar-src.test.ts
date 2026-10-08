import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import { cleanupAll, mount } from './helpers.ts';

/** An avatar from a URL: every message shows it, and it wins over a slot. */
describe('avatar src attributes', () => {
  afterEach(cleanupAll);
  const GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

  async function chat(html: string): Promise<AiChat> {
    const el = mount(html);
    el.messages = [
      { id: 'u1', role: 'user', content: 'q', createdAt: 0 },
      { id: 'a1', role: 'assistant', content: 'a', createdAt: 0 },
      { id: 'a2', role: 'assistant', content: 'b', createdAt: 0 },
    ];
    await el.updateComplete;
    return el;
  }
  const avatars = (el: AiChat, role: string) =>
    [...el.shadowRoot!.querySelectorAll(`[data-role="${role}"] .message__avatar`)] as HTMLElement[];

  it('puts the image on every message of that role, visibly', async () => {
    const el = await chat(`<ai-chat assistant-avatar-src="${GIF}"></ai-chat>`);
    const tiles = avatars(el, 'assistant');
    expect(tiles.length).toBe(2);
    for (const tile of tiles) {
      expect(tile.querySelector('img')?.getAttribute('src')).toBe(GIF);
      expect(getComputedStyle(tile).display).not.toBe('none');
    }
    // No user avatar set: that column stays hidden.
    expect(getComputedStyle(avatars(el, 'user')[0]).display).toBe('none');
  });

  it('wins over a slotted avatar', async () => {
    const el = await chat(`<ai-chat user-avatar-src="${GIF}"><span slot="user-avatar">ME</span></ai-chat>`);
    const tile = avatars(el, 'user')[0];
    expect(tile.querySelector('img')?.getAttribute('src')).toBe(GIF);
    expect(tile.textContent).not.toContain('ME');
  });
});
