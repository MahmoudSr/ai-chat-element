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
};
