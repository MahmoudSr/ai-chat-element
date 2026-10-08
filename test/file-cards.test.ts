import { afterEach, describe, expect, it } from 'vitest';
import type { Attachment, ChatMessage } from '../src/types.ts';
import { cleanupAll, mount, tick } from './helpers.ts';

/**
 * A reply can hand the reader a file (an export, a report): a card under the
 * text, always visible, clickable. Red-on-old: a file attachment was a plain
 * <span> chip ABOVE the bubble — it could not be clicked, had no detail line and
 * no busy state.
 */
describe('file cards in a reply', () => {
  afterEach(cleanupAll);

  const file = (over: Partial<Attachment> = {}): Attachment => ({
    id: 'f1',
    kind: 'file',
    mimeType: 'text/csv',
    name: 'unpaid.csv',
    size: 0,
    url: '',
    detail: 'CSV · 23 rows',
    ...over,
  });
  const reply = (attachment: Attachment): ChatMessage => ({
    id: 'a1',
    role: 'assistant',
    content: 'Here are the unpaid requests.',
    createdAt: 0,
    attachments: [attachment],
  });
  const card = (el: HTMLElement) =>
    el.shadowRoot!.querySelector('[part~="file-card"]') as HTMLElement | null;

  it('renders below the text with its name and detail', async () => {
    const el = mount();
    el.messages = [reply(file())];
    await tick(30);
    const c = card(el)!;
    expect(c).not.toBeNull();
    expect(c.textContent).toContain('unpaid.csv');
    expect(c.textContent).toContain('CSV · 23 rows');
    const bubble = el.shadowRoot!.querySelector('.message--assistant [part="bubble"]')!;
    expect(c.getBoundingClientRect().top).toBeGreaterThanOrEqual(bubble.getBoundingClientRect().bottom - 1);
    expect(c.getAttribute('aria-label')).toBe('Open unpaid.csv');
  });

  it('without a URL is a button that fires ai-chat:attachment-click', async () => {
    const el = mount();
    el.messages = [reply(file())];
    await tick(30);
    const seen: Array<{ attachment: Attachment; index: number }> = [];
    el.addEventListener('ai-chat:attachment-click', (e) => seen.push((e as CustomEvent).detail));
    const c = card(el)!;
    expect(c.tagName).toBe('BUTTON');
    c.click();
    expect(seen).toHaveLength(1);
    expect(seen[0].attachment.id).toBe('f1');
    expect(seen[0].index).toBe(0);
  });

  it('while busy reads "Preparing…" and cannot be pressed', async () => {
    const el = mount();
    el.messages = [reply(file({ busy: true }))];
    await tick(30);
    const c = card(el) as HTMLButtonElement;
    expect(c.disabled).toBe(true);
    expect(c.getAttribute('aria-busy')).toBe('true');
    expect(c.textContent).toContain('Preparing…');
  });

  it('with a URL is a download link, and cancelling the event stops it', async () => {
    const el = mount();
    el.messages = [reply(file({ url: 'https://example.com/unpaid.csv' }))];
    await tick(30);
    const c = card(el) as HTMLAnchorElement;
    expect(c.tagName).toBe('A');
    expect(c.getAttribute('href')).toBe('https://example.com/unpaid.csv');
    expect(c.getAttribute('download')).toBe('unpaid.csv');
    el.addEventListener('ai-chat:attachment-click', (e) => e.preventDefault());
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    c.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it('never links to script', async () => {
    const el = mount();
    el.messages = [reply(file({ url: 'javascript:alert(1)' }))];
    await tick(30);
    expect(card(el)!.tagName).toBe('BUTTON');
    expect(el.shadowRoot!.querySelector('a[href^="javascript"]')).toBeNull();
  });
});
