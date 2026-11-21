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

/** The Attributes page, grouped the same way. Each attribute in exactly one group. */
export const attributeGroups: Record<string, string[]> = {
  look: ['theme', 'assistant-bubble', 'show-names', 'show-timestamps', 'assistant-avatar-src', 'user-avatar-src'],
  words: ['placeholder', 'empty-heading', 'empty-body'],
  conversation: ['system-prompt', 'conversation-id', 'abort-on-switch', 'has-earlier', 'load-earlier', 'disabled'],
  buttons: ['show-header', 'show-clear', 'show-retry', 'show-copy', 'show-edit'],
  sidebar: ['show-aside', 'aside-breakpoint', 'aside-open', 'hide-aside-toggle', 'aside-side'],
  attachments: ['allow-attachments', 'hide-attach-button', 'accept', 'max-attachments', 'max-attachment-size'],
  images: ['allow-images', 'image-hosts'],
  steps: ['reasoning', 'tools'],
};

/** The Parts page: every ::part() name, by the area of the chat it's in. */
export const partGroups: Record<string, string[]> = {
  frame: ['root', 'layout', 'messages'],
  header: ['header', 'header-title', 'header-slot', 'clear-button', 'aside-toggle'],
  sidebar: ['aside', 'aside-list', 'aside-scrim'],
  empty: ['empty', 'empty-icon', 'empty-heading', 'empty-body'],
  messages: [
    'message', 'message-user', 'message-assistant', 'message-system', 'avatar', 'meta', 'name', 'time', 'bubble',
    'empty-response', 'error', 'retry-button', 'jump-button', 'load-earlier-row', 'load-earlier',
  ],
  actions: [
    'message-actions', 'action-button', 'copy-button', 'edit-button', 'custom-action', 'message-edit', 'edit-input',
    'edit-actions', 'edit-cancel-button', 'edit-save-button',
  ],
  input: [
    'composer', 'composer-box', 'input', 'composer-actions', 'composer-actions-start', 'composer-actions-end',
    'attach-button', 'stop-button', 'send-button',
  ],
  files: [
    'composer-attachments', 'attachment-chip', 'attachment-remove', 'message-attachments', 'message-attachment',
    'file-card', 'file-card-name', 'file-card-detail', 'preview', 'preview-image', 'preview-close',
  ],
  steps: [
    'reasoning', 'reasoning-trigger', 'reasoning-content', 'tool', 'tool-header', 'tool-status', 'tool-name',
    'tool-error', 'tool-body', 'tool-input', 'tool-output',
  ],
};

/** The Labels page: every label key, by where the words appear. */
export const labelGroups: Record<string, string[]> = {
  names: ['userName', 'assistantName'],
  empty: ['emptyHeading', 'emptyBody'],
  chrome: ['headerTitle', 'clearChat', 'openAside', 'closeAside'],
  input: ['inputLabel', 'send', 'stop', 'attach', 'removeAttachment', 'attachTooLarge', 'attachWrongType', 'attachTooMany'],
  messages: ['typing', 'messagesRegion', 'jumpToLatest', 'emptyResponse', 'retry', 'loadEarlier', 'loadingEarlier'],
  actions: ['copy', 'copied', 'copyMessage', 'edit', 'saveEdit', 'cancelEdit'],
  files: ['previewImage', 'openFile', 'preparingFile', 'closePreview'],
  steps: [
    'thinking', 'thoughtFor', 'thoughtProcess', 'toolPending', 'toolRunning', 'toolSuccess', 'toolError',
    'toolIncomplete', 'toolNotRun', 'toolInput', 'toolOutput', 'moreCharacters',
  ],
};
