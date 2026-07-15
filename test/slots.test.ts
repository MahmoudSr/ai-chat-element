import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, mount, tick } from './helpers.ts';

/**
 * Slot projection — the component's most bug-prone area, and the reason these
 * tests must run in a real browser. A slotted node is a single live DOM node: it
 * can only be projected into ONE <slot>. Every bug here came from forgetting it.
 */
describe('avatar slots', () => {
  afterEach(cleanupAll);

  const withAvatars = `
    <ai-chat>
      <span slot="assistant-avatar" class="bot">AI</span>
      <span slot="user-avatar" class="me">ME</span>
    </ai-chat>`;

  it('renders an avatar on EVERY message, not just the first', async () => {
    // The 0.1.0-0.1.1 bug: <slot name="user-avatar"> rendered per message meant
    // only the first message of each role got the node; the rest were empty.
    const el = mount(withAvatars);
    const now = Date.now();
    el.messages = [
      { id: '1', role: 'user', content: 'q1', createdAt: now },
      { id: '2', role: 'assistant', content: 'a1', createdAt: now },
      { id: '3', role: 'user', content: 'q2', createdAt: now },
      { id: '4', role: 'assistant', content: 'a2', createdAt: now },
      { id: '5', role: 'user', content: 'q3', createdAt: now },
      { id: '6', role: 'assistant', content: 'a3', createdAt: now },
    ];
    await tick(60);

    const avatars = [...el.shadowRoot!.querySelectorAll('.message__avatar')];
    expect(avatars).toHaveLength(6);

    for (const [i, a] of avatars.entries()) {
      const child = a.firstElementChild;
      // A <slot> child is NOT content: an unfilled slot is still an element, and
      // asserting on firstElementChild alone would pass on the broken code.
      expect(child, `avatar ${i + 1} is empty`).toBeTruthy();
      expect(child!.tagName.toLowerCase(), `avatar ${i + 1} holds a bare <slot>`)
        .not.toBe('slot');
      expect(child!.getBoundingClientRect().width, `avatar ${i + 1} does not paint`)
        .toBeGreaterThan(0);
    }
  });

  it('collapses the avatar column when nothing is slotted', async () => {
    const el = mount();
    el.messages = [{ id: '1', role: 'user', content: 'q', createdAt: Date.now() }];
    await tick(60);
    const a = el.shadowRoot!.querySelector('.message__avatar')!;
    expect(a.classList.contains('message__avatar--filled')).toBe(false);
    expect(getComputedStyle(a).display).toBe('none');
  });

  it('picks up an avatar slotted AFTER first render', async () => {
    const el = mount();
    el.messages = [{ id: '1', role: 'user', content: 'q', createdAt: Date.now() }];
    await tick(40);
    expect(el.shadowRoot!.querySelector('.message__avatar--filled')).toBeNull();

    const s = document.createElement('span');
    s.slot = 'user-avatar';
    s.textContent = 'ME';
    el.appendChild(s);
    await tick(80);   // slotchange -> _slotVersion -> re-render

    expect(el.shadowRoot!.querySelector('.message__avatar--filled')).toBeTruthy();
  });
});

describe('header slot', () => {
  afterEach(cleanupAll);

  it('gives slotted header content the bar frame (padding + divider)', async () => {
    const el = mount(`
      <ai-chat show-header>
        <div slot="header"><b>Custom</b></div>
      </ai-chat>`);
    await tick(60);

    const wrap = el.shadowRoot!.querySelector('.header-slot')!;
    expect(wrap.classList.contains('header-slot--filled')).toBe(true);
    const cs = getComputedStyle(wrap);
    expect(cs.display).toBe('flex');
    expect(cs.paddingTop, 'slotted header must keep the bar padding').not.toBe('0px');
    expect(cs.borderBottomWidth, 'slotted header must keep the divider').not.toBe('0px');
  });

  it('does not add the frame when the slot is empty', async () => {
    const el = mount('<ai-chat show-header></ai-chat>');
    await tick(60);
    const wrap = el.shadowRoot!.querySelector('.header-slot')!;
    expect(wrap.classList.contains('header-slot--filled')).toBe(false);
  });
});
