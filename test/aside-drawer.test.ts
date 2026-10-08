import { afterEach, describe, expect, it } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import { cleanupAll, mount, until } from './helpers.ts';

/**
 * A sidebar would crush a narrow chat, and it used to simply vanish below 560px
 * of SCREEN — saved conversations were unreachable on a phone. Now, below
 * `aside-breakpoint` of the CHAT's own width, it is a drawer with a toggle.
 */
function chat(width: number, attrs = 'show-aside'): AiChat {
  const el = mount(`<ai-chat ${attrs}><nav slot="aside"><button>Chat one</button></nav></ai-chat>`);
  const host = el.parentElement as HTMLElement;
  host.style.width = `${width}px`;
  host.style.height = '500px';
  host.style.display = 'block';
  el.style.display = 'block';
  el.style.height = '500px';
  return el;
}
const root = (el: AiChat) => el.shadowRoot!;
const aside = (el: AiChat) => root(el).querySelector('.aside') as HTMLElement;
const toggle = (el: AiChat) => root(el).querySelector('.aside-toggle') as HTMLButtonElement | null;
const visible = (node: Element) => getComputedStyle(node).visibility === 'visible';
const settle = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

describe('sidebar drawer on a narrow chat', () => {
  afterEach(cleanupAll);

  it('a wide chat keeps the inline sidebar and shows no toggle', async () => {
    const el = chat(900);
    await settle();
    await el.updateComplete;
    expect(toggle(el)).toBeNull();
    expect(visible(aside(el))).toBe(true);
  });

  it('a narrow chat hides the sidebar behind a toggle that opens it, moving focus in', async () => {
    const el = chat(400);
    const events: boolean[] = [];
    el.addEventListener('ai-chat:aside-toggle', (e) => events.push((e as CustomEvent).detail.open));
    await until(() => toggle(el));
    expect(visible(aside(el))).toBe(false);
    expect(toggle(el)!.getAttribute('aria-expanded')).toBe('false');

    toggle(el)!.click();
    await el.updateComplete;
    await settle();
    expect(el.asideOpen).toBe(true);
    expect(visible(aside(el))).toBe(true);
    expect(root(el).activeElement).toBe(aside(el));
    expect(events).toEqual([true]);
  });

  it('Esc and the backdrop close it, and focus returns to the toggle', async () => {
    const el = chat(400);
    await until(() => toggle(el));
    toggle(el)!.click();
    await el.updateComplete;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    await settle();
    expect(el.asideOpen).toBe(false);
    expect(root(el).activeElement).toBe(toggle(el));

    toggle(el)!.click();
    await el.updateComplete;
    (root(el).querySelector('.aside-scrim') as HTMLElement).click();
    await el.updateComplete;
    expect(el.asideOpen).toBe(false);
  });

  it('switching conversation closes it; an app can open it itself', async () => {
    const el = chat(400, 'show-aside hide-aside-toggle conversation-id="a"');
    await settle();
    await el.updateComplete;
    expect(toggle(el)).toBeNull(); // the app brings its own trigger
    el.asideOpen = true;
    await el.updateComplete;
    await settle();
    expect(visible(aside(el))).toBe(true);
    el.conversationId = 'b';
    await el.updateComplete;
    await el.updateComplete;
    expect(el.asideOpen).toBe(false);
  });

  it('aside-breakpoint="0" never collapses', async () => {
    const el = chat(300, 'show-aside aside-breakpoint="0"');
    await settle();
    await el.updateComplete;
    expect(toggle(el)).toBeNull();
    expect(visible(aside(el))).toBe(true);
  });
});
