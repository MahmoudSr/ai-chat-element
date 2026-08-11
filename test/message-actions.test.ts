import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, mount, tick, until } from './helpers.ts';

/**
 * Per-message actions row — slice 1: the built-in copy button. Copy is the one
 * action shipped ON by default (stateless, safe on both roles); edit and custom
 * actions are opt-in / consumer-driven and live in later slices.
 *
 * Red-on-old: none of these selectors/behaviors exist before this feature, so
 * every assertion goes red on the pre-feature code.
 */
describe('message actions — copy', () => {
  afterEach(cleanupAll);

  const now = Date.now();
  const two = [
    { id: '1', role: 'user' as const, content: 'hello there', createdAt: now },
    { id: '2', role: 'assistant' as const, content: 'general kenobi', createdAt: now },
  ];

  const copyButtons = (el: HTMLElement) =>
    [...el.shadowRoot!.querySelectorAll('.message__action[part~="copy-button"]')];

  it('shows a copy button on BOTH user and assistant messages by default', async () => {
    const el = mount();
    el.messages = two;
    await tick(30);
    const btns = copyButtons(el);
    expect(btns).toHaveLength(2);
    // The button must actually paint (a hidden/detached button would false-pass).
    for (const b of btns) {
      expect((b as HTMLElement).getBoundingClientRect().width).toBeGreaterThan(0);
    }
  });

  it('is hidden when showCopy is turned off', async () => {
    // Default-on boolean, so it's disabled by setting the property false (the
    // component's convention — same as show-names/show-timestamps). An attribute
    // string like show-copy="false" is truthy in Lit; omitting it keeps the default.
    const el = mount();
    el.showCopy = false;
    el.messages = two;
    await tick(30);
    expect(copyButtons(el)).toHaveLength(0);
  });

  it('does NOT render an actions row for an empty or streaming message', async () => {
    const el = mount();
    el.messages = [
      { id: '1', role: 'assistant', content: '', createdAt: now, streaming: true },
      { id: '2', role: 'assistant', content: '', createdAt: now }, // settled-empty
    ];
    await tick(30);
    expect(el.shadowRoot!.querySelectorAll('.message__actions')).toHaveLength(0);
  });

  it('copies the message text to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // navigator.clipboard is read-only in some browsers; define our spy.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const el = mount();
    el.messages = two;
    await tick(30);
    const [userCopy] = copyButtons(el) as HTMLButtonElement[];
    userCopy.click();
    await until(() => writeText.mock.calls.length > 0);
    expect(writeText).toHaveBeenCalledWith('hello there');
  });

  it('aligns the user actions row flush under the bubble edge (right-aligned)', async () => {
    // The bug the user hit: on a right-aligned user bubble the actions row was
    // floating under the LEFT of the text instead of hugging the bubble's right
    // edge. The row hugs flex-end with no horizontal margin, so its right edge
    // should sit at (≈) the bubble's right edge, not the wide column's.
    const el = mount();
    el.messages = [two[0]]; // a single user message
    await tick(30);
    const bubble = el.shadowRoot!.querySelector('.message--user .message__body')!;
    const actions = el.shadowRoot!.querySelector('.message--user .message__actions')!;
    const bubbleR = bubble.getBoundingClientRect();
    const actionsR = actions.getBoundingClientRect();
    // Right edges align within a couple of px (sub-pixel rounding).
    expect(Math.abs(actionsR.right - bubbleR.right)).toBeLessThan(3);
    // And it is NOT stuck at the far left of the message column.
    expect(actionsR.left).toBeGreaterThan(bubbleR.left);
  });

  it('honors the copy-icon slot override', async () => {
    // One message → exactly one copy-icon slot, so the single slotted node can
    // project into it (a slotted node can only fill ONE slot; the avatar bug).
    const el = mount(
      '<ai-chat><svg slot="copy-icon" class="my-copy"></svg></ai-chat>',
    );
    el.messages = [two[0]];
    await tick(30);
    const slot = el.shadowRoot!.querySelector(
      '.message__action slot[name="copy-icon"]',
    ) as HTMLSlotElement;
    expect(slot).toBeTruthy();
    const assigned = slot.assignedElements();
    expect(assigned.some((n) => n.classList.contains('my-copy'))).toBe(true);
  });
});

describe('message actions — edit (user messages, show-edit)', () => {
  afterEach(cleanupAll);

  const now = Date.now();
  const convo = [
    { id: 'u1', role: 'user' as const, content: 'first question', createdAt: now },
    { id: 'a1', role: 'assistant' as const, content: 'first answer', createdAt: now },
    { id: 'u2', role: 'user' as const, content: 'second question', createdAt: now },
  ];

  const editButtons = (el: HTMLElement) =>
    [...el.shadowRoot!.querySelectorAll('.message__action[part~="edit-button"]')];

  it('shows an edit button ONLY on user messages, and only with show-edit', async () => {
    const off = mount();
    off.messages = convo;
    await tick(30);
    expect(editButtons(off)).toHaveLength(0); // show-edit off by default

    const on = mount('<ai-chat show-edit></ai-chat>');
    on.messages = convo;
    await tick(30);
    // Two user messages, one assistant → exactly two edit buttons.
    expect(editButtons(on)).toHaveLength(2);
  });

  it('clicking edit swaps the bubble for a textarea seeded with the text', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = convo;
    await tick(30);
    (editButtons(el)[0] as HTMLButtonElement).click();
    await tick(30);
    const ta = el.shadowRoot!.querySelector(
      '.message__edit textarea',
    ) as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
    expect(ta.value).toBe('first question');
  });

  it('Save fires cancelable ai-chat:message-edit with index/message/newContent', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = convo;
    await tick(30);
    const events: any[] = [];
    el.addEventListener('ai-chat:message-edit', (e) => events.push((e as CustomEvent).detail));

    // Edit the SECOND user message (index 2) to prove the index is right.
    (editButtons(el)[1] as HTMLButtonElement).click();
    await tick(30);
    const ta = el.shadowRoot!.querySelector('.message__edit textarea') as HTMLTextAreaElement;
    ta.value = 'edited second question';
    ta.dispatchEvent(new Event('input'));
    await tick(0);
    const saveBtn = el.shadowRoot!.querySelector(
      '.message__edit-btn--save',
    ) as HTMLButtonElement;
    saveBtn.click();
    await tick(10);

    expect(events).toHaveLength(1);
    expect(events[0].index).toBe(2);
    expect(events[0].message.id).toBe('u2');
    expect(events[0].newContent).toBe('edited second question');
    // The component does NOT mutate messages itself (consumer owns that).
    expect(el.messages[2].content).toBe('second question');
    // Edit mode exits (textarea gone).
    expect(el.shadowRoot!.querySelector('.message__edit')).toBeFalsy();
  });

  it('Cancel exits edit mode without firing the event', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = convo;
    await tick(30);
    let fired = false;
    el.addEventListener('ai-chat:message-edit', () => (fired = true));
    (editButtons(el)[0] as HTMLButtonElement).click();
    await tick(30);
    const ta = el.shadowRoot!.querySelector('.message__edit textarea') as HTMLTextAreaElement;
    ta.value = 'changed but cancelled';
    ta.dispatchEvent(new Event('input'));
    await tick(0);
    (el.shadowRoot!.querySelector('.message__edit-btn--cancel') as HTMLButtonElement).click();
    await tick(10);
    expect(fired).toBe(false);
    expect(el.shadowRoot!.querySelector('.message__edit')).toBeFalsy();
  });

  it('an unchanged edit does not fire the event', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = convo;
    await tick(30);
    let fired = false;
    el.addEventListener('ai-chat:message-edit', () => (fired = true));
    (editButtons(el)[0] as HTMLButtonElement).click();
    await tick(30);
    // Don't change the text, just Save.
    (el.shadowRoot!.querySelector('.message__edit-btn--save') as HTMLButtonElement).click();
    await tick(10);
    expect(fired).toBe(false);
    // Edit mode still exits on a no-op save.
    expect(el.shadowRoot!.querySelector('.message__edit')).toBeFalsy();
  });

  it('Escape cancels edit mode', async () => {
    const el = mount('<ai-chat show-edit></ai-chat>');
    el.messages = convo;
    await tick(30);
    let fired = false;
    el.addEventListener('ai-chat:message-edit', () => (fired = true));
    (editButtons(el)[0] as HTMLButtonElement).click();
    await tick(30);
    const ta = el.shadowRoot!.querySelector('.message__edit textarea') as HTMLTextAreaElement;
    ta.value = 'typed then escaped';
    ta.dispatchEvent(new Event('input'));
    await tick(0);
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick(10);
    expect(fired).toBe(false);
    expect(el.shadowRoot!.querySelector('.message__edit')).toBeFalsy();
  });
});
