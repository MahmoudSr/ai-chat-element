import { ref } from 'vue';

/**
 * The CSS variables page, grouped by what a reader wants to change. Every
 * variable is in exactly one group (test/site-docs.test.ts checks), so a new
 * variable fails the tests until it is placed here.
 *
 * Every corner is under Corners, even a tool card's or the Send button's:
 * one --ai-chat-radius moves them all, so they're found together.
 */
export const cssVarGroups: Record<string, string[]> = {
  colors: ['bg', 'fg', 'muted', 'border', 'accent', 'accent-fg', 'user-bg', 'user-fg', 'assistant-bg', 'assistant-fg', 'error'],
  text: ['font', 'font-mono', 'font-size', 'line-height'],
  corners: [
    'radius', 'radius-sm', 'bubble-radius', 'input-radius', 'code-radius', 'button-radius', 'new-chat-radius',
    'avatar-radius', 'attachment-radius', 'action-radius', 'table-radius', 'tool-radius', 'send-radius',
    'jump-radius', 'outer-radius',
  ],
  borders: ['border-width', 'input-border-width', 'composer-border-width', 'code-border-width', 'table-border-width', 'header-border-width'],
  layout: ['max-width', 'gap', 'messages-padding', 'composer-padding', 'messages-scrollbar-gutter', 'jump-size'],
  messages: ['bubble-padding', 'bubble-inset-x', 'avatar-size', 'avatar-bg', 'show-avatars'],
  replies: [
    'link-color', 'link-hover-color', 'strong-fg', 'heading-fg', 'marker-color', 'blockquote-border', 'code-bg',
    'code-fg', 'table-header-bg', 'table-header-fg', 'table-row-divider', 'table-stripe-bg', 'table-cell-padding',
  ],
  input: ['input-padding', 'input-max-height', 'send-size', 'attachment-thumb-size'],
  actions: ['action-size', 'action-color', 'action-hover-color', 'action-hover-bg'],
  images: ['attachment-image-max-width', 'image-border-width', 'image-border-color', 'preview-backdrop'],
  chrome: ['header-padding', 'button-size', 'clear-size', 'aside-width', 'aside-bg', 'aside-padding', 'aside-scrollbar-gutter', 'aside-drawer-bg', 'aside-scrim'],
  steps: [
    'reasoning-color', 'reasoning-font-size', 'reasoning-border-color', 'reasoning-max-height', 'tool-bg',
    'tool-border-color', 'tool-font-size', 'tool-running-color', 'tool-success-color', 'tool-error-color',
    'tool-output-max-height',
  ],
  focus: ['focus-color', 'focus-width', 'focus-offset'],
};

/** The page's filter text, shared by every group's table. */
export const varFilter = ref('');
