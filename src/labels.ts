/**
 * All user-facing and accessibility strings in one place. Override any subset
 * via the `labels` property; unspecified keys fall back to these defaults. This
 * is also the single hook for translation / i18n.
 *
 * @example
 * chat.labels = { emptyHeading: '¿En qué puedo ayudarte?', send: 'Enviar' };
 */
export interface ChatLabels {
  /** Display name shown above the user's messages. */
  userName: string;
  /** Display name shown above the assistant's messages. */
  assistantName: string;
  /** Big heading in the empty state (before any messages). */
  emptyHeading: string;
  /** Optional secondary line under the empty-state heading. Empty = hidden. */
  emptyBody: string;
  /** Code-block copy button, resting state. */
  copy: string;
  /** Code-block copy button, shown briefly after a successful copy. */
  copied: string;
  /** Accessible label announced while the assistant is streaming. */
  typing: string;
  /** aria-label for the message list region. */
  messagesRegion: string;
  /** aria-label for the text input. */
  inputLabel: string;
  /** aria-label for the send button. */
  send: string;
  /** aria-label for the stop-generating button. */
  stop: string;
  /** aria-label for the scroll-to-latest (jump) button. */
  jumpToLatest: string;
  /** Title shown in the built-in header (when `show-header` is set). */
  headerTitle: string;
  /** Label + aria-label for the New/Clear conversation button. */
  clearChat: string;
  /** Label + aria-label for the retry button on a failed message. */
  retry: string;
  /** Placeholder shown when the assistant returns an empty response (finished
   *  streaming with no content and no error) — avoids a blank ghost bubble. */
  emptyResponse: string;
  /** aria-label for the attach-file button (when `allow-attachments` is set). */
  attach: string;
  /** aria-label for the remove (×) button on an attachment chip. */
  removeAttachment: string;
  /** Shown/announced when a picked file exceeds `max-attachment-size`.
   *  `{name}` is replaced with the filename. */
  attachTooLarge: string;
  /** Shown/announced when a picked file's type isn't allowed by `accept`.
   *  `{name}` is replaced with the filename. */
  attachWrongType: string;
  /** Shown/announced when adding a file would exceed `max-attachments`. */
  attachTooMany: string;
  /** aria-label for the per-message copy button (when `show-copy` is set). */
  copyMessage: string;
  /** aria-label for the per-message edit button (when `show-edit` is set,
   *  user messages only). */
  edit: string;
  /** Label + aria-label for the confirm button while editing a message. */
  saveEdit: string;
  /** Label + aria-label for the cancel button while editing a message. */
  cancelEdit: string;
  /** aria-label for an image that opens a full-size preview when clicked.
   *  `{name}` is replaced with the file name. */
  previewImage: string;
  /** A file card's accessible name. `{name}` is the file name. */
  openFile: string;
  /** A file card while the app is still making the file. */
  preparingFile: string;
  /** aria-label for the close button on the image preview overlay. */
  closePreview: string;
  /** The control at the top of a conversation with older messages (`has-earlier`). */
  loadEarlier: string;
  /** The same control while older messages are on their way. */
  loadingEarlier: string;
  /** The button that opens the history drawer on a narrow chat (`show-aside`). */
  openAside: string;
  /** The same button, and the backdrop, while the drawer is open. */
  closeAside: string;
}

export const DEFAULT_LABELS: ChatLabels = {
  userName: 'You',
  assistantName: 'AI bot',
  emptyHeading: 'How can I help?',
  emptyBody: '',
  copy: 'Copy',
  copied: 'Copied!',
  typing: 'Assistant is typing',
  messagesRegion: 'Chat messages',
  inputLabel: 'Message',
  send: 'Send message',
  stop: 'Stop generating',
  jumpToLatest: 'Scroll to latest message',
  headerTitle: 'Chat',
  clearChat: 'New chat',
  retry: 'Retry',
  emptyResponse: 'No response.',
  attach: 'Attach files',
  removeAttachment: 'Remove attachment',
  attachTooLarge: '{name} is too large.',
  attachWrongType: "{name} isn't an allowed file type.",
  attachTooMany: 'Too many attachments.',
  copyMessage: 'Copy message',
  edit: 'Edit',
  saveEdit: 'Save',
  cancelEdit: 'Cancel',
  previewImage: 'Preview {name}',
  openFile: 'Open {name}',
  preparingFile: 'Preparing…',
  closePreview: 'Close preview',
  loadEarlier: 'Load earlier messages',
  loadingEarlier: 'Loading earlier messages…',
  openAside: 'Show conversations',
  closeAside: 'Hide conversations',
};
