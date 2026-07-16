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
    const hadFocus = this._focusIsInside();
    this.stop();
    this.messages = [];
    this._input = '';
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
    // Keep focus in the composer. On Enter it's already there, but a *click* on
    // the Send button moved focus onto it — and it's immediately swapped for the
    // Stop button, so focus would be lost. Return it to the input either way.
    this._focusComposer();
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
    // avatar column collapses. Slot occupancy can't be detected in CSS —
    // projected light-DOM nodes never become children of <slot>, so a
    // `:has(slot > *)` rule never matches — hence the JS check below.
    const avatarSlot = isAssistant ? 'assistant-avatar' : 'user-avatar';
    const hasAvatar = this._hasSlotted(avatarSlot);
    // A clone, not a <slot>: one slotted node can't project into every message.
    const avatar = this._avatarClone(avatarSlot);
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
