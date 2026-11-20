/**
 * Hand-written descriptions for the generated reference lists. The names come
 * from the source (api.data.ts); only the words live here.
 * test/site-docs.test.ts fails if a name in the source has no description, or
 * a description names something the source doesn't have.
 */
export const slotDescriptions: Record<string, string> = {
  'assistant-avatar': "The assistant's avatar, copied into every reply.",
  'user-avatar': "The user's avatar, copied into every user message.",
  header: 'Replaces the whole top bar (with show-header).',
  aside: 'Your conversation list, in the sidebar (with show-aside).',
  'aside-toggle-icon': 'Icon of the button that opens the sidebar drawer on a narrow chat.',
  empty: 'Replaces the whole empty state shown before the first message.',
  'empty-icon': "The empty state's icon.",
  'composer-actions-start': "Buttons at the left of the input's action row.",
  'composer-actions-end': 'Buttons at the right of the action row, before Send.',
  'send-icon': 'Icon of the Send button.',
  'stop-icon': 'Icon of the Stop button.',
  'clear-icon': 'Icon of the New chat button.',
  'retry-icon': 'Icon of the Retry button.',
  'copy-icon': 'Icon of the Copy action.',
  'copied-icon': 'The tick a Copy button shows for a moment after copying.',
  'edit-icon': 'Icon of the Edit action.',
  'jump-icon': 'Icon of the jump-to-latest button.',
  'error-icon': 'Icon shown next to an error.',
  'attach-icon': 'Icon of the attach button (with allow-attachments).',
};
