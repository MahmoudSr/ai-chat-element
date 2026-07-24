import { css } from 'lit';

/**
 * All theming flows through CSS custom properties so consumers can restyle the
 * component from the outside without piercing the shadow DOM. Defaults adapt to
 * the user's light/dark preference. Override any `--ai-chat-*` variable on the
 * `ai-chat` element (or :root) to theme it.
 */
export const chatStyles = css`
  :host {
    /* ---- Palette (light defaults) ---- */
    --ai-chat-bg: #ffffff;
    --ai-chat-fg: #1a1a1a;
    --ai-chat-muted: #6b7280;
    --ai-chat-border: #e5e7eb;
    --ai-chat-accent: #4f46e5;
    --ai-chat-accent-fg: #ffffff;

    /* User bubble defaults to the accent, so setting --ai-chat-accent alone
       themes the buttons, focus ring, links AND the user bubble in one line. */
    --ai-chat-user-bg: var(--ai-chat-accent);
    --ai-chat-user-fg: var(--ai-chat-accent-fg);
    --ai-chat-assistant-bg: #f3f4f6;
    --ai-chat-assistant-fg: #1a1a1a;

    --ai-chat-code-bg: #0d1117;
    --ai-chat-code-fg: #e6edf3;
    --ai-chat-error: #dc2626;

    /* ---- Keyboard focus ring ----
       Shown only for keyboard focus (:focus-visible), never on mouse click, so
       pointer users see nothing. Deliberately subtle by default: a thin ring in
       a softened accent. Customize any of these — e.g. a bolder ring is just
       --ai-chat-focus-width: 3px, a different hue is --ai-chat-focus-color, and
       --ai-chat-focus-offset: 0 tucks it flush against the control. Set the
       width to 0 to remove the ring entirely (not recommended — it's an
       accessibility affordance). */
    --ai-chat-focus-color: color-mix(in srgb, var(--ai-chat-accent) 55%, transparent);
    --ai-chat-focus-width: 2px;
    --ai-chat-focus-offset: 2px;

    /* ---- Borders ----
       Set any of these to 0 to remove that border entirely. The generic
       --ai-chat-border-width drives all of them; override the specific ones for
       finer control (e.g. borders only around the input). */
    --ai-chat-border-width: 1px;
    --ai-chat-input-border-width: var(--ai-chat-border-width);
    --ai-chat-composer-border-width: 0px;   /* top divider above the input; off by default */
    --ai-chat-code-border-width: var(--ai-chat-border-width);
    --ai-chat-table-border-width: var(--ai-chat-border-width);

    /* ---- Corner rounding ----
       ONE knob controls every rounded corner: --ai-chat-radius. Change it and
       bubbles, input, code blocks, buttons, and avatars all move together. Set
       it to 0 for fully sharp corners. Each surface can still be overridden
       individually if you want (e.g. circular buttons via --ai-chat-button-radius:50%). */
    --ai-chat-radius: 8px;
    --ai-chat-radius-sm: var(--ai-chat-radius);
    --ai-chat-bubble-radius: var(--ai-chat-radius);
    --ai-chat-input-radius: var(--ai-chat-radius);
    --ai-chat-code-radius: var(--ai-chat-radius);
    --ai-chat-button-radius: var(--ai-chat-radius);
    --ai-chat-new-chat-radius: var(--ai-chat-button-radius);
    --ai-chat-avatar-radius: var(--ai-chat-radius);
    --ai-chat-attachment-radius: var(--ai-chat-radius);
    /* The component's own outer corners. Rounded by default (follows the master
       radius) so the widget looks finished on its own. Set to 0 for a square
       frame when your surrounding container (a card, panel, etc.) already
       rounds/clips the widget. */
    --ai-chat-outer-radius: var(--ai-chat-radius);
    --ai-chat-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --ai-chat-font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace;
    --ai-chat-font-size: 15px;
    --ai-chat-line-height: 1.55;
    --ai-chat-max-width: 760px;
    --ai-chat-gap: 16px;

    /* ---- Sizing knobs ---- */
    --ai-chat-avatar-size: 32px;
    /* Horizontal inset of the bubble's text. The bubble padding derives from it,
       and the name/time meta row aligns to it — so the label sits above the TEXT,
       not the bubble edge, and they stay in sync if you change it. Override
       --ai-chat-bubble-padding wholesale only if you don't need that alignment. */
    --ai-chat-bubble-inset-x: 14px;
    --ai-chat-bubble-padding: 6px var(--ai-chat-bubble-inset-x);
    --ai-chat-input-padding: 8px 14px 2px;
    /* How tall the input grows before it starts scrolling internally. */
    --ai-chat-input-max-height: 200px;
    --ai-chat-button-size: 42px;
    /* The send/stop button now sits inside the composer box, so it's a touch
       smaller than the old outside button. Derives from the base button knobs. */
    --ai-chat-send-size: 34px;
    --ai-chat-send-radius: var(--ai-chat-button-radius);
    /* Compact icon button (header / floating New-chat). */
    --ai-chat-clear-size: 32px;
    /* Attachment thumbnail size in the composer tray; max inline image width in
       a sent message. */
    --ai-chat-attachment-thumb-size: 32px;
    --ai-chat-attachment-image-max-width: 320px;
    /* Jump-to-latest floating button. Circular by default, but still derives
       from a var so it can be squared off with the rest via --ai-chat-radius. */
    --ai-chat-jump-size: 36px;
    --ai-chat-jump-radius: 50%;
    --ai-chat-messages-padding: 20px 16px;
    --ai-chat-composer-padding: 12px 16px 16px;
    --ai-chat-header-padding: 10px 16px;
    /* Divider under the built-in header; matches the border color by default. */
    --ai-chat-header-border-width: var(--ai-chat-border-width);
    /* Sidebar (history) column, shown only with show-aside. */
    --ai-chat-aside-width: 260px;
    --ai-chat-aside-bg: transparent;
    --ai-chat-aside-padding: 12px;
    --ai-chat-show-avatars: grid;   /* set to 'none' to hide avatars */

    display: block;
    height: 100%;
    min-height: 320px;
    color: var(--ai-chat-fg);
    background: var(--ai-chat-bg);
    font-family: var(--ai-chat-font);
    font-size: var(--ai-chat-font-size);
    line-height: var(--ai-chat-line-height);
    box-sizing: border-box;
    /* Round + clip the whole widget to its own corners by default. */
    border-radius: var(--ai-chat-outer-radius);
    overflow: hidden;
  }

  /* ---- Dark palette ----
     The dark values live in one place (--_dark-*) and get applied in two cases:
       1. theme="dark"                    → forced dark
       2. OS prefers dark AND not theme="light" → auto (the default)
     Set theme="light" on the element to force light regardless of the OS. */
  :host {
    --_dark-bg: #0f1117;
    --_dark-fg: #e6e6e6;
    --_dark-muted: #9ca3af;
    --_dark-border: #262a35;
    --_dark-assistant-bg: #1b1e27;
    --_dark-assistant-fg: #e6e6e6;
  }
  :host([theme='dark']) {
    --ai-chat-bg: var(--_dark-bg);
    --ai-chat-fg: var(--_dark-fg);
    --ai-chat-muted: var(--_dark-muted);
    --ai-chat-border: var(--_dark-border);
    --ai-chat-assistant-bg: var(--_dark-assistant-bg);
    --ai-chat-assistant-fg: var(--_dark-assistant-fg);
  }
  @media (prefers-color-scheme: dark) {
    :host(:not([theme='light']):not([theme='dark'])) {
      --ai-chat-bg: var(--_dark-bg);
      --ai-chat-fg: var(--_dark-fg);
      --ai-chat-muted: var(--_dark-muted);
      --ai-chat-border: var(--_dark-border);
      --ai-chat-assistant-bg: var(--_dark-assistant-bg);
      --ai-chat-assistant-fg: var(--_dark-assistant-fg);
    }
  }

  *, *::before, *::after { box-sizing: border-box; }

  /* Outer horizontal layout: [aside] [chat]. Without show-aside there's no
     aside element, so .root simply fills the whole width. */
  .layout {
    display: flex;
    height: 100%;
    min-height: 0;
  }
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }

  /* ---- Sidebar (history) ----
     A flex column: a fixed top holding the full-width New-chat button, then the
     consumer's conversation list which scrolls independently below it. */
  .aside {
    flex: 0 0 var(--ai-chat-aside-width);
    width: var(--ai-chat-aside-width);
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--ai-chat-aside-bg);
    border-right: var(--ai-chat-border-width) solid var(--ai-chat-border);
  }
  .aside__top {
    flex: 0 0 auto;
    padding: var(--ai-chat-aside-padding);
    padding-bottom: 0;
  }
  .aside__list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
    padding: var(--ai-chat-aside-padding);
    scrollbar-width: thin;
    scrollbar-color: var(--ai-chat-border) transparent;
  }
  /* Full-width New-chat button pinned atop the sidebar (ChatGPT/Claude style). */
  .new-chat-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    border: var(--ai-chat-border-width) solid var(--ai-chat-border);
    /* Own knob, defaulting to the shared one: this button is full-width, so a
       --ai-chat-button-radius of 50% (fine for the square icon buttons) would
       resolve per-axis here and render a pill. Override just this surface. */
    border-radius: var(--ai-chat-new-chat-radius);
    background: var(--ai-chat-bg);
    color: var(--ai-chat-fg);
    font: inherit; font-size: 14px; font-weight: 500;
    cursor: pointer;
    transition: border-color 0.1s ease, background 0.1s ease;
  }
  .new-chat-btn:hover {
    border-color: var(--ai-chat-accent);
    background: color-mix(in srgb, var(--ai-chat-accent) 8%, var(--ai-chat-bg));
  }
  .new-chat-btn__label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Right-side variant: put the chat first, aside last, and move the divider. */
  :host([aside-side='right']) .layout { flex-direction: row-reverse; }
  :host([aside-side='right']) .aside {
    border-right: none;
    border-left: var(--ai-chat-border-width) solid var(--ai-chat-border);
  }
  /* On narrow widths the sidebar would crush the chat — hide it by default.
     Consumers who want a drawer can override this breakpoint or roll their own. */
  @media (max-width: 560px) {
    .aside { display: none; }
  }

  /* ---- Header ----
     The header slot is always in the tree so consumers can override it. Its
     wrapper carries no padding/border of its own, so an empty slot (default,
     chrome-free) takes zero visible space. All header chrome lives on .header,
     which only renders when show-header is set (or the consumer slots their own). */
  /* The header bar. Padding + divider live here — NOT on the inner content —
     so a consumer's slotted header lands in the same frame as the built-in one
     (see .header-slot:has(...) below) instead of having to recreate it. */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: var(--ai-chat-header-padding);
    border-bottom: var(--ai-chat-header-border-width) solid var(--ai-chat-border);
  }
  .header__title { font-weight: 600; font-size: 15px; }

  /* When the consumer fills the header slot, their content replaces the
     built-in bar's CONTENT but should keep its frame: same padding, same
     divider, same centered row. Without this the slot is a bare div and every
     consumer has to re-derive the padding/border by eye.
     The --filled class is set in JS: CSS cannot detect slot occupancy, because
     projected light-DOM nodes never become children of a slot element, so a
     :has() rule would never match. Same reason as .message__avatar. */
  .header-slot--filled {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: var(--ai-chat-header-padding);
    border-bottom: var(--ai-chat-header-border-width) solid var(--ai-chat-border);
  }
  /* Slotted content spans the bar so the consumer's own flex/grid can lay out. */
  .header-slot--filled ::slotted(*) { flex: 1; min-width: 0; }

  /* Clear button — shared look whether it sits in the header or floats. */
  .clear-btn {
    display: grid; place-items: center;
    width: var(--ai-chat-clear-size); height: var(--ai-chat-clear-size);
    border: var(--ai-chat-border-width) solid var(--ai-chat-border);
    border-radius: var(--ai-chat-button-radius);
    background: var(--ai-chat-bg);
    color: var(--ai-chat-fg);
    cursor: pointer;
    transition: border-color 0.1s ease;
  }
  .clear-btn:hover { border-color: var(--ai-chat-accent); }

  /* When there's no header bar, the clear button floats over the top-right. */
  .clear-float {
    position: absolute;
    top: 10px; right: 12px;
    z-index: 2;
  }
  .clear-float .clear-btn {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  /* ---- Message list ---- */
  .scroll-region {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;             /* let the inner scroller shrink in flex layout */
    display: flex;
  }
  .messages {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;             /* never scroll sideways — wide code blocks scroll inside themselves */
    overscroll-behavior: contain;   /* don't chain scroll to the page */
    /* Reserve the scrollbar's space up front so the centered message column
       doesn't shift sideways when the scrollbar appears/disappears (Windows
       classic scrollbars take layout width). */
    scrollbar-gutter: stable;
    padding: var(--ai-chat-messages-padding);
    scrollbar-width: thin;          /* Firefox: slim scrollbar */
    scrollbar-color: var(--ai-chat-border) transparent;
  }
  /* Thin, inset scrollbar that doesn't collide with the container's rounded
     corners. The transparent border pushes the thumb a few px off the edge. */
  .messages::-webkit-scrollbar { width: 8px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb {
    background: var(--ai-chat-border);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  .messages::-webkit-scrollbar-thumb:hover {
    background: var(--ai-chat-muted);
    background-clip: padding-box;
  }

  /* ---- Jump-to-latest button ---- */
  .jump {
    position: absolute;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    width: var(--ai-chat-jump-size); height: var(--ai-chat-jump-size);
    display: grid; place-items: center;
    border: var(--ai-chat-border-width) solid var(--ai-chat-border);
    border-radius: var(--ai-chat-jump-radius);
    background: var(--ai-chat-bg);
    color: var(--ai-chat-fg);
    font-size: 18px; line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    /* Dedicated keyframe: keeps the translateX(-50%) centering for the whole
       animation. The shared fade-in animates transform to none, which would
       drop the horizontal centering and make the button jump sideways. */
    animation: jump-in 0.15s ease;
    z-index: 2;
  }
  .jump:hover { border-color: var(--ai-chat-accent); }

  @keyframes jump-in {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .empty {
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--ai-chat-muted);
  }
  .empty__inner {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  /* Icon slot. Shows a default chat-bubble SVG (muted, so it reads as a quiet
     placeholder); a slotted empty-icon replaces it. The margin applies in both
     cases so the heading always sits below the icon. */
  .empty__icon {
    font-size: 40px;
    line-height: 1;
    margin-bottom: 12px;
    color: var(--ai-chat-muted);
    opacity: 0.7;
  }
  .empty__heading { font-size: 18px; font-weight: 600; color: var(--ai-chat-fg); margin: 0; }
  .empty__body { margin: 6px 0 0; font-size: 14px; color: var(--ai-chat-muted); }

  .message {
    display: flex;
    gap: 12px;
    max-width: var(--ai-chat-max-width);
    margin: 0 auto var(--ai-chat-gap);
    animation: fade-in 0.18s ease;
  }
  .message--user { flex-direction: row-reverse; }

  /* Avatars are opt-in: the column is hidden unless a *-avatar slot has
     content. --ai-chat-show-avatars can force-hide them ('none') even when a
     slot is provided. */
  .message__avatar {
    display: none;
    flex: 0 0 auto;
    width: var(--ai-chat-avatar-size); height: var(--ai-chat-avatar-size);
    place-items: center;
    overflow: hidden;
    border-radius: var(--ai-chat-avatar-radius);
    background: var(--ai-chat-assistant-bg);
    font-size: 16px;
    user-select: none;
  }
  /* Shown only when the consumer actually slotted an avatar (the component sets
     --filled in JS; CSS can't detect projected slot content). */
  .message__avatar--filled { display: var(--ai-chat-show-avatars); }

  /* Column holding the name/time meta row above the bubble. */
  .message__col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    max-width: 100%;
  }
  .message--user .message__col { align-items: flex-end; }

  .message__meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    /* Align the name/time to where the bubble TEXT starts, not the bubble edge.
       The horizontal margin tracks the bubble's text inset so the label sits
       directly above the first line of text. */
    margin: 0 var(--ai-chat-bubble-inset-x) 5px;
    font-size: 12px;
    line-height: 1.2;
  }
  .message--user .message__meta { flex-direction: row-reverse; }
  /* The assistant message is borderless plain text by default (no horizontal
     padding), so its text starts at the column edge — align the meta there too.
     When assistant-bubble is on, it regains the inset (rule below). */
  .message--assistant .message__meta { margin-left: 0; margin-right: 0; }
  .message__name { font-weight: 600; color: var(--ai-chat-fg); }
  .message__time { color: var(--ai-chat-muted); font-variant-numeric: tabular-nums; }

  .message__body {
    padding: var(--ai-chat-bubble-padding);
    border-radius: var(--ai-chat-bubble-radius);
    max-width: 100%;
    overflow-wrap: anywhere;
    width: fit-content;
  }
  /* By default the assistant message is borderless plain text (ChatGPT/Claude
     style); only the user message sits in a bubble. */
  .message--assistant .message__body {
    color: var(--ai-chat-fg);
    padding-left: 0;
    padding-right: 0;
    max-width: 100%;
    width: 100%;
  }
  .message--user .message__body {
    background: var(--ai-chat-user-bg);
    color: var(--ai-chat-user-fg);
    border-top-right-radius: var(--ai-chat-radius-sm);
  }
  /* assistant-bubble: opt back into a bubble around the AI message. */
  :host([assistant-bubble]) .message--assistant .message__body {
    background: var(--ai-chat-assistant-bg);
    color: var(--ai-chat-assistant-fg);
    padding: var(--ai-chat-bubble-padding);
    width: fit-content;
    border-top-left-radius: var(--ai-chat-radius-sm);
  }
  /* With the bubble back, the AI text is inset again — realign its meta to match. */
  :host([assistant-bubble]) .message--assistant .message__meta {
    margin-left: var(--ai-chat-bubble-inset-x);
    margin-right: var(--ai-chat-bubble-inset-x);
  }
  .plain { white-space: pre-wrap; }

  /* Visually-hidden but screen-reader-audible live region (the standard sr-only
     clip pattern). Carries the settled assistant reply for a single polite
     announcement per turn — see the note on .messages in the render. */
  .sr-live {
    position: absolute;
    width: 1px; height: 1px;
    margin: -1px; padding: 0; border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* Invisible marker at the very bottom of the message list. An
     IntersectionObserver watches it to know if the user is at the bottom (so we
     keep auto-following the stream) vs. scrolled up (so we don't). The small
     height gives a tiny grace zone so "at bottom" trips naturally. */
  .scroll-sentinel { height: 1px; width: 100%; flex: 0 0 auto; }

  /* Placeholder for an empty assistant response (finished, no content, no
     error) — muted so it reads as a system note, not real reply text. */
  .empty-response { color: var(--ai-chat-muted); font-style: italic; }

  .message__error {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ai-chat-error);
    font-size: 13px;
  }
  .message__error-icon { display: inline-flex; flex: 0 0 auto; }
  .message__error-text { min-width: 0; overflow-wrap: anywhere; }
  /* Retry is a recovery action, not a destructive one, so it uses the neutral
     foreground/border colors rather than the alarming error red beside it. */
  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 4px;
    flex: 0 0 auto;
    padding: 3px 9px;
    border: var(--ai-chat-border-width) solid var(--ai-chat-border);
    border-radius: var(--ai-chat-button-radius);
    background: transparent;
    color: var(--ai-chat-fg);
    font: inherit; font-size: 12px;
    cursor: pointer;
    transition: border-color 0.1s ease, background 0.1s ease;
  }
  .retry-btn:hover {
    border-color: var(--ai-chat-accent);
    background: color-mix(in srgb, var(--ai-chat-accent) 8%, transparent);
  }

  /* ---- Typing indicator ---- */
  .typing { display: inline-flex; gap: 4px; padding: 4px 0; }
  .typing i {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--ai-chat-muted);
    animation: blink 1.2s infinite ease-in-out;
  }
  .typing i:nth-child(2) { animation-delay: 0.2s; }
  .typing i:nth-child(3) { animation-delay: 0.4s; }

  /* ---- Markdown ---- */
  .markdown > :first-child { margin-top: 0; }
  .markdown > :last-child { margin-bottom: 0; }
  .markdown p { margin: 0.5em 0; }
  .markdown a { color: var(--ai-chat-accent); }
  .markdown ul, .markdown ol { padding-left: 1.4em; margin: 0.5em 0; }
  .markdown :not(pre) > code {
    font-family: var(--ai-chat-font-mono);
    font-size: 0.9em;
    background: color-mix(in srgb, var(--ai-chat-fg) 12%, transparent);
    padding: 0.15em 0.4em;
    border-radius: var(--ai-chat-radius);
  }
  /* Tables scroll horizontally instead of crushing their columns on narrow
     screens. display:block + overflow-x makes the <table> itself the scroll
     container (the markdown pipeline emits a bare <table>, so we can't wrap it);
     width:max-content lets it stay natural width and scroll, capped at 100% so a
     small table still fills nicely. */
  .markdown table {
    border-collapse: collapse;
    display: block;
    max-width: 100%;
    width: max-content;
    overflow-x: auto;
    margin: 0.5em 0;
    scrollbar-width: thin;
    scrollbar-color: var(--ai-chat-border) transparent;
  }
  .markdown th, .markdown td {
    border: var(--ai-chat-table-border-width) solid var(--ai-chat-border);
    padding: 6px 10px;
    white-space: nowrap;
  }
  .markdown blockquote {
    margin: 0.5em 0; padding-left: 12px;
    border-left: 3px solid var(--ai-chat-border);
    color: var(--ai-chat-muted);
  }

  /* ---- Code blocks ---- */
  .code-block {
    margin: 0.6em 0;
    border-radius: var(--ai-chat-code-radius);
    overflow: hidden;
    background: var(--ai-chat-code-bg);
    border: var(--ai-chat-code-border-width) solid color-mix(in srgb, var(--ai-chat-code-fg) 15%, transparent);
  }
  .code-block__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 12px;
    font-size: 12px;
    color: color-mix(in srgb, var(--ai-chat-code-fg) 70%, transparent);
    font-family: var(--ai-chat-font-mono);
    border-bottom: 1px solid color-mix(in srgb, var(--ai-chat-code-fg) 12%, transparent);
  }
  .code-block__copy {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ai-chat-code-fg) 25%, transparent);
    color: color-mix(in srgb, var(--ai-chat-code-fg) 85%, transparent);
    font: inherit; font-size: 11px;
    padding: 2px 8px; border-radius: var(--ai-chat-radius); cursor: pointer;
  }
  .code-block__copy:hover { background: color-mix(in srgb, var(--ai-chat-code-fg) 12%, transparent); }
  .code-block pre {
    margin: 0; padding: 12px 14px; overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--ai-chat-code-fg) 30%, transparent) transparent;
  }
  .code-block pre::-webkit-scrollbar { height: 8px; }
  .code-block pre::-webkit-scrollbar-track { background: transparent; }
  .code-block pre::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--ai-chat-code-fg) 25%, transparent);
    border-radius: 999px;
    border: 2px solid transparent;
    background-clip: padding-box;
  }
  .code-block code {
    font-family: var(--ai-chat-font-mono);
    font-size: 13px;
    color: var(--ai-chat-code-fg);
    background: none;
  }

  /* ---- Composer ----
     The composer is one rounded box (.composer__box) that carries the border,
     radius and focus ring. Inside it, the textarea sits on top (borderless,
     transparent) and a bottom action row holds tool slots on the left and the
     send/stop button on the right. This structure makes future buttons (attach,
     mic, text-to-speech) a drop-in via the composer-actions-* slots. */
  .composer {
    flex: 0 0 auto;
    max-width: var(--ai-chat-max-width);
    width: 100%;
    margin: 0 auto;
    padding: var(--ai-chat-composer-padding);
    border-top: var(--ai-chat-composer-border-width) solid var(--ai-chat-border);
  }
  .composer__box {
    display: flex;
    flex-direction: column;
    border: var(--ai-chat-input-border-width) solid var(--ai-chat-border);
    border-radius: var(--ai-chat-input-radius);
    background: var(--ai-chat-bg);
    padding: 6px 6px 6px 0;
    transition: border-color 0.1s ease;
  }
  /* Focus ring lives on the box now that the textarea has no border. :focus-within
     lights it up whenever the textarea (or a slotted control) is focused. */
  .composer__box:focus-within { border-color: var(--ai-chat-accent); }

  .composer__input {
    flex: 1 1 auto;
    width: 100%;
    resize: none;              /* no drag handle */
    /* Hidden by default so no scrollbar shows on a single line. JS flips this
       to auto only once the content actually exceeds max-height. */
    overflow-y: hidden;
    scrollbar-width: thin;                                  /* Firefox: slim */
    scrollbar-color: var(--ai-chat-border) transparent;
    max-height: var(--ai-chat-input-max-height);
    padding: var(--ai-chat-input-padding);
    border: none;
    background: transparent;
    color: var(--ai-chat-fg);
    font: inherit;
    line-height: 1.4;
    outline: none;
    -webkit-appearance: none;  /* strip native chrome (the spinner arrows) */
    appearance: none;
  }
  /* Some engines paint resize/scroll affordances via ::-webkit-* — hide them. */
  .composer__input::-webkit-resizer { display: none; }
  /* Thin, inset scrollbar that matches the message list and stays clear of the
     box's rounded corner (the transparent border pushes the thumb off the edge). */
  .composer__input::-webkit-scrollbar { width: 10px; }
  .composer__input::-webkit-scrollbar-track { background: transparent; }
  .composer__input::-webkit-scrollbar-thumb {
    background: var(--ai-chat-border);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  .composer__input::-webkit-scrollbar-thumb:hover {
    background: var(--ai-chat-muted);
    background-clip: padding-box;
  }
  .composer__input:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Bottom action row: [ tool slots …………… ] [ … send ] */
  .composer__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 14px;
  }
  .composer__actions-start {
    display: flex; align-items: center; gap: 4px;
    flex: 1 1 auto; min-width: 0;
  }
  .composer__actions-end {
    display: flex; align-items: center; gap: 4px;
    flex: 0 0 auto;
  }
  /* The action row collapses its height when there are no left-side tools, so
     the single send button hugs the bottom-right cleanly. */

  .btn {
    flex: 0 0 auto;
    width: var(--ai-chat-send-size); height: var(--ai-chat-send-size);
    display: grid; place-items: center;
    border: none; border-radius: var(--ai-chat-send-radius);
    cursor: pointer;
    font-size: 16px;
    transition: transform 0.1s ease, opacity 0.1s ease;
  }
  .btn:active { transform: scale(0.94); }
  .btn--send { background: var(--ai-chat-accent); color: var(--ai-chat-accent-fg); }
  .btn--send:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn--stop { background: var(--ai-chat-fg); color: var(--ai-chat-bg); }
  .btn__square { width: 12px; height: 12px; border-radius: 3px; background: currentColor; }
  /* Attach button: a quiet, transparent icon button so it recedes next to the
     accent-colored send button. */
  .btn--attach {
    background: transparent;
    color: var(--ai-chat-muted);
    border-radius: var(--ai-chat-button-radius);
  }
  .btn--attach:hover:not(:disabled) {
    background: var(--ai-chat-border);
    color: var(--ai-chat-fg);
  }
  .btn--attach:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ---- Attachments ---- */
  /* Drop-zone feedback: a dashed accent outline while a file is dragged over. */
  .composer__box--dragover {
    border-color: var(--ai-chat-accent);
    outline: 2px dashed var(--ai-chat-accent);
    outline-offset: -4px;
  }
  /* Staged-attachment tray above the textarea. */
  .composer__attachments {
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 10px 12px 4px;
  }
  /* A flat, wide, thin pill: a small image thumb (or file icon) on the left, the
     name on the right, an inline remove (x) at the end. No border — just a subtle
     fill — so it reads as light and horizontal, not a chunky bordered card. */
  .attachment-chip {
    display: inline-flex; align-items: center; gap: 8px;
    max-width: 240px;
    padding: 4px 8px 4px 4px;
    border-radius: var(--ai-chat-attachment-radius);
    background: color-mix(in srgb, var(--ai-chat-fg) 7%, var(--ai-chat-bg));
    font-size: 0.82em; line-height: 1.2;
  }
  .attachment-chip__thumb {
    width: var(--ai-chat-attachment-thumb-size);
    height: var(--ai-chat-attachment-thumb-size);
    object-fit: cover;
    border-radius: calc(var(--ai-chat-attachment-radius) - 4px);
    flex: 0 0 auto;
    display: block;
  }
  /* File (non-image) chips get an icon tile the same size as a thumbnail so image
     and file chips line up to the same height. */
  .attachment-chip__icon {
    flex: 0 0 auto;
    display: grid; place-items: center;
    width: var(--ai-chat-attachment-thumb-size);
    height: var(--ai-chat-attachment-thumb-size);
    border-radius: calc(var(--ai-chat-attachment-radius) - 4px);
    color: var(--ai-chat-muted);
  }
  .attachment-chip__name {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--ai-chat-fg); font-weight: 500;
  }
  /* Inline remove at the trailing edge — no floating badge, keeps the pill flat. */
  .attachment-chip__remove {
    flex: 0 0 auto;
    display: grid; place-items: center;
    width: 18px; height: 18px; padding: 0; margin-left: 2px;
    border: none; border-radius: 50%;
    background: transparent; color: var(--ai-chat-muted);
    cursor: pointer;
    transition: background 0.1s ease, color 0.1s ease;
  }
  .attachment-chip__remove:hover { background: color-mix(in srgb, var(--ai-chat-fg) 12%, transparent); color: var(--ai-chat-fg); }
  .attachment-chip__remove .icon { width: 12px; height: 12px; }

  /* Attachments rendered on a sent message (above the text). */
  .message__attachments {
    display: flex; flex-direction: column; gap: 8px;
    margin-bottom: 6px;
    /* Never let a wide image stretch the bubble past the text column. */
    max-width: 100%;
  }
  /* A single image: capped, keeps its aspect ratio, hugs its own width. The IMG
     itself is width-capped (not just the wrapper) so a wide screenshot can't push
     the fit-content bubble wider than the cap. */
  .message__images--single {
    display: block;
    width: fit-content;
    max-width: 100%;
  }
  .message__images--single .message__attachment--image {
    width: auto; height: auto;
    max-width: min(100%, var(--ai-chat-attachment-image-max-width));
    max-height: 360px; object-fit: contain;
    border-radius: var(--ai-chat-attachment-radius);
    display: block;
  }
  /* 2+ images: a fixed grid of uniform square thumbnails (Messenger/WhatsApp
     style). --_cols (1-3) is set inline from the image count; the whole grid is
     width-capped so it never blows out the bubble. */
  .message__images--grid {
    display: grid;
    grid-template-columns: repeat(var(--_cols, 3), 1fr);
    gap: 4px;
    /* Flat pixel width (NOT a percentage): a percentage resolves against the
       fit-content bubble circularly and fails to cap, letting a multi-image grid
       blow out to full message width. A fixed cap keeps the bubble tight; the
       outer wrapper's max-width:100% still shrinks it on a narrow screen. */
    width: var(--ai-chat-attachment-image-max-width);
  }
  .message__images--grid .message__attachment--image {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: calc(var(--ai-chat-attachment-radius) - 2px);
    display: block;
  }
  .message__attachment--file {
    display: inline-flex; align-items: center; gap: 6px;
    max-width: 240px;
    padding: 6px 10px;
    border: var(--ai-chat-input-border-width) solid var(--ai-chat-border);
    border-radius: var(--ai-chat-attachment-radius);
    background: color-mix(in srgb, var(--ai-chat-fg) 4%, var(--ai-chat-bg));
    font-size: 0.9em;
  }
  .message__attachment-icon { display: grid; place-items: center; color: var(--ai-chat-muted); flex: 0 0 auto; }
  .message__attachment-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ---- Keyboard focus ring ----
     One subtle, customizable ring for every interactive control. :focus-visible
     means keyboard focus only — a mouse click shows nothing. outline (not
     box-shadow) is used on purpose: it isn't clipped by the ancestor
     overflow:hidden on :host / .code-block, so the ring stays whole on the copy
     button and the edge controls. All three knobs are consumer-overridable. */
  .btn:focus-visible,
  .clear-btn:focus-visible,
  .new-chat-btn:focus-visible,
  .retry-btn:focus-visible,
  .jump:focus-visible,
  .code-block__copy:focus-visible,
  .attachment-chip__remove:focus-visible,
  .composer__box:focus-within {
    outline: var(--ai-chat-focus-width) solid var(--ai-chat-focus-color);
    outline-offset: var(--ai-chat-focus-offset);
  }
  /* The composer box already tints its border on focus; keep that, and only add
     the ring for keyboard users so a mouse click into the input stays clean. */
  .composer__box:focus-within:not(:has(:focus-visible)) { outline: none; }

  .icon { display: block; }
  /* Slotted custom icons/avatars fill their box nicely. */
  ::slotted(svg), ::slotted(img) { display: block; max-width: 100%; }
  /* Avatars are clones of the slotted node, not projected content, so these are
     real shadow-DOM children — plain descendant selectors, not ::slotted().
     The clone must not outgrow the round frame: anything larger than the box
     gets clipped to the container's square corners and reads as a squircle. */
  .message__avatar > * {
    max-width: 100%; max-height: 100%;
    border-radius: inherit;
  }
  .message__avatar img { width: 100%; height: 100%; object-fit: cover; }

  /* The live projection points for the avatar slots. Kept out of layout: the
     consumer's node lands here (so slotchange fires and authoring stays
     <span slot="user-avatar">), while each message renders a clone of it. */
  .avatar-sources { display: none; }

  @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes blink { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }

  @media (prefers-reduced-motion: reduce) {
    .message { animation: none; }
    .messages { scroll-behavior: auto; }
    .typing i { animation: none; }
    /* Keep the centering transform, just drop the entrance animation. */
    .jump { animation: none; }
  }
`;
