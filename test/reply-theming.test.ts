import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import { cleanupAll, mount } from './helpers.ts';

/** Reply-content variables must reach the markdown they name; defaults follow the palette. */
describe('reply content theming', () => {
  afterEach(cleanupAll);

  const REPLY = [
    '# Title',
    '',
    'A [link](https://example.com) and **bold**.',
    '',
    '- item',
    '',
    '> quoted',
    '',
    '| Name | Owed |',
    '| --- | --: |',
    '| Sara | 120 |',
    '| Lina | 45 |',
  ].join('\n');

  async function reply(style = ''): Promise<AiChat> {
    const el = mount(`<ai-chat style="${style}"></ai-chat>`);
    el.messages = [{ id: 'a', role: 'assistant', content: REPLY, createdAt: 0 }];
    await el.updateComplete;
    return el;
  }
  const css = (el: AiChat, sel: string) => getComputedStyle(el.shadowRoot!.querySelector(`.markdown ${sel}`)!);

  it('defaults: tinted header, row rules only, tabular numbers, alignment honoured', async () => {
    const el = await reply('--ai-chat-fg: rgb(0, 0, 0); --ai-chat-muted: rgb(10, 20, 30); --ai-chat-border: rgb(200, 200, 200)');
    expect(css(el, 'th').color).toBe('rgb(10, 20, 30)');
    expect(css(el, 'th').backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(css(el, 'td').borderLeftWidth).toBe('0px');
    expect(css(el, 'td').borderTopColor).toBe('rgb(200, 200, 200)');
    expect(css(el, 'table').fontVariantNumeric).toBe('tabular-nums');
    // Chrome computes the align attribute as -webkit-right; it renders the same.
    expect(css(el, 'th[align="right"]').textAlign).toMatch(/right$/);
    expect(css(el, 'th:not([align])').textAlign).toBe('start');
  });

  it('each variable overrides its surface', async () => {
    const el = await reply(
      [
        '--ai-chat-table-header-bg: rgb(1, 1, 1)',
        '--ai-chat-table-header-fg: rgb(2, 2, 2)',
        '--ai-chat-table-row-divider: rgb(3, 3, 3)',
        '--ai-chat-table-stripe-bg: rgb(4, 4, 4)',
        '--ai-chat-table-cell-padding: 9px',
        '--ai-chat-table-radius: 11px',
        '--ai-chat-link-color: rgb(5, 5, 5)',
        '--ai-chat-strong-fg: rgb(6, 6, 6)',
        '--ai-chat-heading-fg: rgb(7, 7, 7)',
        '--ai-chat-marker-color: rgb(8, 8, 8)',
        '--ai-chat-blockquote-border: rgb(9, 9, 9)',
      ].join('; '),
    );
    expect(css(el, 'th').backgroundColor).toBe('rgb(1, 1, 1)');
    expect(css(el, 'th').color).toBe('rgb(2, 2, 2)');
    expect(css(el, 'td').borderTopColor).toBe('rgb(3, 3, 3)');
    expect(css(el, 'tbody tr:nth-child(2) td').backgroundColor).toBe('rgb(4, 4, 4)');
    expect(css(el, 'td').paddingTop).toBe('9px');
    expect(css(el, 'table').borderTopLeftRadius).toBe('11px');
    expect(css(el, 'a').color).toBe('rgb(5, 5, 5)');
    expect(css(el, 'strong').color).toBe('rgb(6, 6, 6)');
    expect(css(el, 'h1').color).toBe('rgb(7, 7, 7)');
    expect(getComputedStyle(el.shadowRoot!.querySelector('.markdown li')!, '::marker').color).toBe('rgb(8, 8, 8)');
    expect(css(el, 'blockquote').borderLeftColor).toBe('rgb(9, 9, 9)');
  });
});

describe('links in dark mode', () => {
  afterEach(cleanupAll);

  it('are lifted off the accent so they stay readable, unless the app sets its own', async () => {
    const dark = mount('<ai-chat theme="dark" style="--ai-chat-accent: rgb(79, 70, 229)"></ai-chat>');
    dark.messages = [{ id: 'd', role: 'assistant', content: '[x](https://example.com)', createdAt: 0 }];
    await dark.updateComplete;
    const darkLink = getComputedStyle(dark.shadowRoot!.querySelector('.markdown a')!).color;
    expect(darkLink).not.toBe('rgb(79, 70, 229)');

    const own = mount('<ai-chat theme="dark" style="--ai-chat-link-color: rgb(1, 2, 3)"></ai-chat>');
    own.messages = [{ id: 'o', role: 'assistant', content: '[x](https://example.com)', createdAt: 0 }];
    await own.updateComplete;
    expect(getComputedStyle(own.shadowRoot!.querySelector('.markdown a')!).color).toBe('rgb(1, 2, 3)');
  });
});
