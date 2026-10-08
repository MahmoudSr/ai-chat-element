import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import { cleanupAll, mount } from './helpers.ts';

/** Each new variable must actually reach the element it names. */
describe('avatar and scrollbar-gutter variables', () => {
  afterEach(cleanupAll);

  async function withAvatar(style = ''): Promise<AiChat> {
    const el = mount(`<ai-chat show-aside style="${style}"><img slot="assistant-avatar" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></ai-chat>`);
    el.messages = [{ id: 'a', role: 'assistant', content: 'hi', createdAt: 0 }];
    await el.updateComplete;
    return el;
  }
  const css = (el: AiChat, sel: string) => getComputedStyle(el.shadowRoot!.querySelector(sel)!);

  it('defaults: avatar tile = assistant bubble, messages reserve the gutter, the history list does not', async () => {
    const el = await withAvatar('--ai-chat-assistant-bg: rgb(1, 2, 3)');
    expect(css(el, '.message__avatar').backgroundColor).toBe('rgb(1, 2, 3)');
    expect(css(el, '.messages').scrollbarGutter).toBe('stable');
    expect(css(el, '.aside__list').scrollbarGutter).toBe('auto');
  });

  it('each variable overrides its own surface', async () => {
    const el = await withAvatar(
      '--ai-chat-avatar-bg: transparent; --ai-chat-messages-scrollbar-gutter: auto; --ai-chat-aside-scrollbar-gutter: stable',
    );
    expect(css(el, '.message__avatar').backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(css(el, '.messages').scrollbarGutter).toBe('auto');
    expect(css(el, '.aside__list').scrollbarGutter).toBe('stable');
  });
});
