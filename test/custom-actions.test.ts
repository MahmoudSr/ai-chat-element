import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatMessage, MessageAction } from '../src/types.ts';
import { cleanupAll, mount } from './helpers.ts';

/**
 * Apps add their own buttons to a message's actions row through a callback
 * (a slot can't work here: one slotted node can't appear under every message,
 * and clones lose their listeners).
 */
describe('messageActions', () => {
  afterEach(() => {
    cleanupAll();
    vi.restoreAllMocks();
  });

  const MESSAGES: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'who owes?', createdAt: 0 },
    { id: 'a1', role: 'assistant', content: '| a | b |\n|---|---|\n| 1 | 2 |', createdAt: 0 },
    { id: 'a2', role: 'assistant', content: 'plain answer', createdAt: 0 },
  ];

  async function chat(actions: (m: ChatMessage) => readonly MessageAction[], attrs = ''): Promise<AiChat> {
    const el = mount(`<ai-chat ${attrs}></ai-chat>`);
    el.messageActions = actions;
    el.messages = MESSAGES;
    await el.updateComplete;
    return el;
  }
  const buttons = (el: AiChat, id: string) =>
    [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>(`button[data-action="${id}"]`)];

  it('shows an action only on the messages the callback returns it for', async () => {
    const el = await chat((m) => (m.content.includes('|') ? [{ id: 'xlsx', label: 'Download Excel' }] : []));
    const found = buttons(el, 'xlsx');
    expect(found.length).toBe(1);
    expect(found[0].closest('[data-role="assistant"]')?.textContent).toContain('1');
    expect(found[0].getAttribute('aria-label')).toBe('Download Excel');
    // No icon: the label is the visible text.
    expect(found[0].textContent?.trim()).toBe('Download Excel');
  });

  it('fires ai-chat:message-action with the action id, message and index — by click or keyboard', async () => {
    const el = await chat(() => [{ id: 'xlsx', label: 'Download Excel' }]);
    const seen: Array<{ actionId: string; message: ChatMessage; index: number }> = [];
    el.addEventListener('ai-chat:message-action', (e) => seen.push((e as CustomEvent).detail));
    const [first, , third] = buttons(el, 'xlsx');
    first.click();
    third.focus();
    expect(el.shadowRoot!.activeElement).toBe(third); // reachable by keyboard
    third.click(); // Enter/Space on a focused <button> activates it via click
    expect(seen.map((d) => [d.actionId, d.message.id, d.index])).toEqual([
      ['xlsx', 'u1', 0],
      ['xlsx', 'a2', 2],
    ]);
  });

  it('renders the row even with copy off, and respects disabled', async () => {
    const el = await chat(() => [{ id: 'x', label: 'X', disabled: true }], 'show-copy="false"');
    const [b] = buttons(el, 'x');
    expect(b).toBeTruthy();
    expect(b.disabled).toBe(true);
  });

  it('sanitizes an icon: SVG stays, script does not', async () => {
    const icon = '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg><img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
    const el = await chat(() => [{ id: 'i', label: 'Icon action', icon }]);
    const [b] = buttons(el, 'i');
    expect(b.querySelector('svg path')).not.toBeNull();
    expect(b.querySelector('img, script')).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it('survives a callback that throws: no actions, the chat still renders', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = await chat(() => {
      throw new Error('boom');
    });
    expect(el.shadowRoot!.querySelectorAll('[data-role="assistant"]').length).toBe(2);
    expect(el.shadowRoot!.querySelector('button[data-action]')).toBeNull();
    expect(error).toHaveBeenCalled();
  });
});
