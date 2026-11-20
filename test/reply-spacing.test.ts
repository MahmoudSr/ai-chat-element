import { afterEach, expect, test } from 'vitest';
import { cleanupAll, mount, until } from './helpers';
import type { ChatMessage } from '../src/types';

afterEach(cleanupAll);

/*
 * The space under the last reply. It used to stack the between-messages gap
 * (16px) on top of the list's own bottom padding (20px), on top of the hidden
 * actions row, leaving ~85px of empty space between a finished reply and the
 * input box. --ai-chat-gap belongs BETWEEN messages, not after the last one.
 */

const msgs = (): ChatMessage[] => [
  { id: 'u1', role: 'user', content: 'Hi', createdAt: 1 },
  { id: 'a1', role: 'assistant', content: 'Hello there.', createdAt: 2 },
  { id: 'u2', role: 'user', content: 'Again', createdAt: 3 },
  { id: 'a2', role: 'assistant', content: 'The last reply.', createdAt: 4 },
];

async function setup() {
  const el = mount('<ai-chat style="display:block;height:600px;width:480px"></ai-chat>');
  el.messages = msgs();
  await el.updateComplete;
  const root = el.shadowRoot!;
  const rows = await until(() => {
    const r = root.querySelectorAll<HTMLElement>('.message');
    return r.length === 4 ? [...r] : null;
  });
  return { root, rows };
}

test('the gap applies between messages, not after the last one', async () => {
  const { rows } = await setup();
  const between = parseFloat(getComputedStyle(rows[2]).marginBottom);
  const last = parseFloat(getComputedStyle(rows[3]).marginBottom);
  expect(between).toBe(16);
  expect(last).toBe(0);
});

test('a finished reply sits close to the input box', async () => {
  const { root, rows } = await setup();
  const list = root.querySelector<HTMLElement>('.messages')!;
  list.scrollTop = list.scrollHeight;
  const lastBottom = rows[3].getBoundingClientRect().bottom;
  const listBottom = list.getBoundingClientRect().bottom;
  const content = list.scrollHeight - list.clientHeight > 0
    ? listBottom - lastBottom
    : list.querySelector('.scroll-sentinel')!.getBoundingClientRect().bottom - lastBottom
      + parseFloat(getComputedStyle(list).paddingBottom);
  // last row's bottom edge (incl. its hidden actions row) -> end of the list:
  // the list's bottom padding (12px) plus the 1px scroll sentinel.
  expect(Math.round(content)).toBeLessThanOrEqual(14);
  expect(Math.round(content)).toBeGreaterThanOrEqual(8);
});
