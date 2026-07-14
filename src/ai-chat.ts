import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { classMap } from 'lit/directives/class-map.js';
import type { ChatMessage, ChatTransport, Role } from './types.js';
import { renderMarkdown } from './markdown.js';
import { chatStyles } from './styles.js';
import { hljsTheme } from './hljs-theme.js';
import { DEFAULT_LABELS, type ChatLabels } from './labels.js';
import {
  chevronDownIcon,
  sendIcon,
  newChatIcon,
  retryIcon,
  alertIcon,
  emptyChatIcon,
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
 * @fires ai-chat:error     { error: string }            on transport failure
 * @fires ai-chat:submit    { content: string }          when the user sends
 * @fires ai-chat:new-chat  { messages: ChatMessage[] }  when New-chat is clicked
 *                          (cancelable: preventDefault to keep the conversation)
 */
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
  @property({ type: Boolean, attribute: 'assistant-bubble', reflect: true })
  assistantBubble = false;

  /**
   * Show the built-in header bar (title + New-chat button). Off by default so
   * the widget stays chrome-free. Provide a `header` slot to replace the whole
   * bar with your own markup — the slot wins whether or not this is set.
   * Reflected so CSS (`:host([show-header])`) can react. Default: false.
   */
  @property({ type: Boolean, attribute: 'show-header', reflect: true })
  showHeader = false;

  /**
   * Show the built-in New/Clear-chat button (inside the header when
   * `show-header` is on, otherwise floating top-right). Calls `clear()`.
   * Default: false.
   */
  @property({ type: Boolean, attribute: 'show-clear' })
  showClear = false;

  /**
   * Show a Retry button on a message that failed, which re-sends the last user
   * turn. Default: true — it's the expected behavior and costs nothing when
   * there are no errors.
   */
  @property({ type: Boolean, attribute: 'show-retry' })
  showRetry = true;

  /**
   * Show the optional sidebar column (for a conversation-history list). Off by
   * default — when off, the column isn't rendered and a plain chat is entirely
   * unaffected. Fill it via the `aside` slot; drive it with the `ai-chat:new-chat`
   * event and by swapping `.messages`. Reflected for CSS. Default: false.
   */
  @property({ type: Boolean, attribute: 'show-aside', reflect: true })
  showAside = false;

  /**
   * Which side the sidebar sits on. Left by default (ChatGPT/Claude style).
   * Reflected so the CSS can flip the layout order. Usage: `aside-side="right"`.
   */
  @property({ type: String, attribute: 'aside-side', reflect: true })
  asideSide: 'left' | 'right' = 'left';

  /** Show the sender name above each message bubble. Default: true. */
  @property({ type: Boolean, attribute: 'show-names' })
  showNames = true;

  /** Show a timestamp (e.g. "3:45 PM") next to each message. Default: true. */
  @property({ type: Boolean, attribute: 'show-timestamps' })
  showTimestamps = true;

  /** Disable the whole input surface. */
  @property({ type: Boolean })
  disabled = false;

  /** The conversation. Bindable and reflected back out via events. */
  @property({ attribute: false })
  messages: ChatMessage[] = [];

  @state() private _busy = false;
  @state() private _input = '';
  /** Shown when the user has scrolled up away from the latest message. */
  @state() private _showJump = false;

  private _abort?: AbortController;
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
  @query('textarea') private _textarea!: HTMLTextAreaElement;

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

  /** Clear the conversation and cancel any in-flight generation. Also clears any
   *  half-typed draft in the composer so a new chat starts truly empty. */
  clear(): void {
    this.stop();
    this.messages = [];
    this._input = '';
    if (this._textarea) {
      this._textarea.style.height = 'auto';
      this._textarea.style.overflowY = 'hidden';
    }
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
    const content = this.messages[lastUser].content;
    this.messages = this.messages.slice(0, lastUser);
    return this.send(content);
  }

  /** Cancel any in-flight generation. */
  stop(): void {
    this._abort?.abort();
    this._abort = undefined;
    this._busy = false;
    this.messages = this.messages.map((m) =>
      m.streaming ? { ...m, streaming: false } : m,
    );
  }

  /**
   * Send a message programmatically (same path as the send button).
   * Returns `false` without sending when the text is empty, a generation is
   * already in flight, or no transport is configured.
   */
  async send(content: string): Promise<boolean> {
    const text = content.trim();
    if (!text || this._busy) return false;
    if (!this.transport) {
      this._emitError(
        'No transport configured. Set the `.transport` property.',
      );
      return false;
    }

    // Sending always snaps the user back to the latest turn.
    this._stickToBottom = true;
    this._showJump = false;
    this.addMessage('user', text);
    this.dispatchEvent(
      new CustomEvent('ai-chat:submit', {
        detail: { content: text },
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
        if (chunk.type === 'delta') {
          this._patch(assistant.id, (m) => ({
            ...m,
            content: m.content + chunk.delta,
          }));
        } else if (chunk.type === 'error') {
          this._patch(assistant.id, (m) => ({
            ...m,
            streaming: false,
            error: chunk.error,
          }));
          this._emitError(chunk.error);
          break;
        } else if (chunk.type === 'done') {
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!signal.aborted) {
        this._patch(assistant.id, (m) => ({
          ...m,
          streaming: false,
          error: message,
        }));
        this._emitError(message);
      }
    } finally {
      // Only run cleanup if THIS send still owns the current stream. If a newer
      // send/clear replaced our controller (e.g. New-chat mid-stream), leave the
      // shared _busy/_abort alone — they now belong to the newer stream.
      if (this._abort === controller) {
        this._patch(assistant.id, (m) => ({ ...m, streaming: false }));
        this._busy = false;
        this._abort = undefined;
        const final = this.messages.find((m) => m.id === assistant.id);
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
    // Nothing to send, or a generation is in flight. In both cases leave the
    // box untouched so the user's text survives. The ⏹ stop button handles the
    // running stream. (`send()` also guards these, but we check here so we only
    // clear the input when the message is actually accepted — send() doesn't
    // resolve until the whole stream finishes, far too late to clear the box.)
    if (!text || this._busy) return;

    // Accepted: clear the box now and kick off the (long-running) send.
    this._input = '';
    if (this._textarea) {
      this._textarea.style.height = 'auto';
      this._textarea.style.overflowY = 'hidden';
    }
    void this.send(text);
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
    if ('IntersectionObserver' in window && this._scrollEl && this._sentinel) {
      this._bottomObserver = new IntersectionObserver(
        (entries) => {
          const atBottom = entries[0]?.isIntersecting ?? true;
          this._stickToBottom = atBottom;
          if (this._showJump === atBottom) this._showJump = !atBottom;
        },
        { root: this._scrollEl, threshold: 0 },
      );
      this._bottomObserver.observe(this._sentinel);
    }
  }

  override disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onHostKeydown);
    this._bottomObserver?.disconnect();
    this._bottomObserver = undefined;
    super.disconnectedCallback();
  }

  private _onHostKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._busy) {
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

  protected override updated(changed: PropertyValues): void {
    // Auto-follow new content only while pinned. `_stickToBottom` is maintained
    // by the IntersectionObserver (bottom visible) AND cleared immediately by a
    // real upward scroll (see _onScroll) — we must NOT re-derive "near bottom"
    // from post-append geometry here, because appended content grows scrollHeight
    // before scrollTop catches up, which would read as "not at bottom" and stop
    // following mid-stream.
    if (changed.has('messages') && this._stickToBottom) {
      this._scrollToBottom();
    }
  }

  /**
   * A real scroll event. Detects an upward scroll and unpins immediately — this
   * beats the async IntersectionObserver to the punch, killing the slow-scroll
   * jitter without the post-append geometry problems of measuring in updated().
   * (The observer still handles re-pinning and the jump button.)
   */
  private _lastScrollTop = 0;
  private _onScroll(e: Event): void {
    const el = e.currentTarget as HTMLElement;
    const top = el.scrollTop;
    if (top < this._lastScrollTop - 1) this._stickToBottom = false; // scrolled up
    this._lastScrollTop = top;
  }

  private _scrollToBottom(smooth = false): void {
    const el = this._scrollEl;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      // Sync the baseline so our own downward scroll isn't later misread as the
      // user scrolling up.
      this._lastScrollTop = el.scrollTop;
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
      <div class="layout" part="layout">
        ${aside}
        <div class="root" part="root">
          ${this._renderHeader()}
          <div class="scroll-region">
            <div class="messages" part="messages"
                 @click=${this._onMessagesClick} @scroll=${this._onScroll}
                 role="log" aria-live="polite" aria-label=${this._labels.messagesRegion}>
              ${hasMessages ? this._renderMessages() : this._renderEmpty()}
              <!-- Bottom sentinel watched by the IntersectionObserver to decide
                   whether we're pinned to the bottom (see firstUpdated). -->
              <div class="scroll-sentinel" aria-hidden="true"></div>
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
    return html`<div class="header-slot" part="header-slot"><slot name="header">${builtIn}</slot></div>
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
    });
    const isAssistant = m.role === 'assistant';
    // Avatars are opt-in: provide an `assistant-avatar` / `user-avatar` slot to
    // show one (an SVG, <img>, initial, emoji — anything). With no slot the
    // avatar column collapses (see the :not(:has(...)) rule in styles).
    const avatarSlot = isAssistant ? 'assistant-avatar' : 'user-avatar';
    const name = isAssistant
      ? this._labels.assistantName
      : this._labels.userName;
    const showMeta = this.showNames || this.showTimestamps;
    return html`
      <div class=${classes} part="message message-${m.role}" data-role=${m.role}>
        <div class="message__avatar" part="avatar" aria-hidden="true">
          <slot name=${avatarSlot}></slot>
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
        <div class="message__body" part="bubble">
          ${
            isAssistant
              ? html`<div class="markdown">${unsafeHTML(renderMarkdown(m.content, this._labels.copy))}</div>`
              : html`<div class="plain">${m.content}</div>`
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
        </div>
        </div>
      </div>
    `;
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
    // right. The `composer-actions-start` / `-end` slots are empty by default —
    // drop in attach / mic / text-to-speech buttons later with no re-layout.
    return html`
      <form class="composer" part="composer" @submit=${this._onSubmit}>
        <div class="composer__box" part="composer-box">
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
          ></textarea>
          <div class="composer__actions" part="composer-actions">
            <div class="composer__actions-start" part="composer-actions-start">
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
                          ?disabled=${this.disabled || !this._input.trim()} aria-label=${this._labels.send}>
                          <slot name="send-icon">${sendIcon}</slot>
                        </button>`
              }
            </div>
          </div>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-chat': AiChat;
  }
}
