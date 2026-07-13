# Customization & DX sweep — `ai-chat-element`

_Sweep date: 2026-07-13. Goal: find where a developer **using** this package
hits a wall or has to fork/wrap, and rank fixes by impact vs. effort._

The component is already in good shape — streaming, theming, i18n, a11y, and
slots are all solid. Everything below is a **gap**, not a bug. Items are grouped
by theme and each carries an **Impact** (to the consuming developer) and
**Effort** estimate.

---

## ⭐ Recommended starting point

**Start with Tier 1 (Conversation lifecycle: header slot + New/Clear button +
Retry on errors).** Reasons:

1. It's the single most-requested thing consumers can't add from the outside —
   there's no `<slot name="header">`, so today they must wrap `<ai-chat>` in
   their own bar and lose the shadow-DOM theming that's the whole selling point.
2. It's already on your own v2 list in `CLAUDE.md`.
3. Retry-on-error is a huge perceived-quality win for very little code — you
   already have `send()` and the failed message; you just need to re-run it.
4. It unblocks the demo story: a "New chat" button makes the playground and
   ollama example feel like a real product.

Everything in Tier 2 is cheap "expose a hardcoded value" work that can be
knocked out in a single pass afterwards.

---

## Tier 1 — High impact, can't be done from outside

### 1.1 Header slot + optional built-in header
- **What:** Add `<slot name="header">` above the message list (and a matching
  `part="header"`). Optionally a lightweight built-in header row that shows a
  title + a "New chat" button when enabled via attribute (`show-header`).
- **Why:** Consumers currently can't add a title bar, model picker, or clear
  button without wrapping the element and breaking shadow-DOM theming.
- **Impact:** ★★★★★  **Effort:** M

### 1.2 New / Clear conversation button
- **What:** Optional built-in button (attribute `show-clear`) that calls the
  existing `clear()`. Slot `clear-icon`, label `clearChat`, `part="clear-button"`.
- **Why:** `clear()` exists as a method but there's no UI. Nearly every chat has
  this. Pairs with 1.1.
- **Impact:** ★★★★☆  **Effort:** S

### 1.3 Retry on a failed message
- **What:** On a message with `error`, render a "Retry" button that removes the
  failed assistant turn and re-sends the last user turn. New label `retry`,
  `part="retry-button"`, slot `retry-icon`.
- **Why:** Biggest UX quality bump in the whole list; impossible to add from
  outside because the failed turn lives in shadow DOM.
- **Impact:** ★★★★★  **Effort:** S–M

### 1.4 Overridable error icon (consistency fix)
- **What:** The `⚠` on [ai-chat.ts:409](src/ai-chat.ts#L409) is a hardcoded
  emoji — violates the project's "no emoji, SVG icons" rule and isn't
  overridable. Replace with an SVG + `error-icon` slot.
- **Impact:** ★★☆☆☆  **Effort:** XS  _(do it alongside 1.3)_

---

## Tier 2 — Expose hardcoded values (cheap, high "customize everything" payoff)

These are all one-liners that honor the guiding principle: _prefer a knob over a
hardcoded value_.

### 2.1 Input max-height → CSS var
- `MAX_INPUT_HEIGHT = 200` is hardcoded in JS ([ai-chat.ts:242](src/ai-chat.ts#L242))
  **and** as `max-height: 200px` in CSS. Unify into `--ai-chat-input-max-height`
  and read it in `_autosize`.
- **Impact:** ★★★☆☆  **Effort:** S

### 2.2 Configurable Enter-to-send
- Enter-sends / Shift+Enter-newline is hardcoded
  ([ai-chat.ts:234](src/ai-chat.ts#L234)). Add `send-on="enter" | "mod-enter"`
  so forms/mobile can require Cmd/Ctrl+Enter.
- **Impact:** ★★★☆☆  **Effort:** S

### 2.3 Input `maxlength` + optional counter
- No character limit today. Add `maxlength` attribute (passthrough) and an
  optional counter shown near the composer.
- **Impact:** ★★☆☆☆  **Effort:** S

### 2.4 `autofocus` the input
- Add an `autofocus` attribute so the box is focused on mount.
- **Impact:** ★★☆☆☆  **Effort:** XS

### 2.5 Custom timestamp formatting
- Format is hardcoded to local `h:mm A`
  ([ai-chat.ts:418](src/ai-chat.ts#L418)). Add a `.timeFormatter?: (ts:number)
  => string` property so consumers can do relative times ("2m ago") or their
  own locale format.
- **Impact:** ★★★☆☆  **Effort:** S

---

## Tier 3 — Rendering & integration hooks

### 3.1 Markdown control
- **Disable markdown** for assistant messages (`markdown="off"`) — some
  consumers want plain text.
- **Link handling:** add `target="_blank" rel="noopener"` option, or a hook to
  intercept link clicks. Currently links render bare.
- **Impact:** ★★★☆☆  **Effort:** M

### 3.2 `regenerate()` / `editMessage()` methods
- Expose programmatic regenerate-last-turn and edit-a-message even before there's
  UI for them, so framework wrappers can build their own buttons.
- **Impact:** ★★★☆☆  **Effort:** M

### 3.3 Inject/stream into an assistant message
- `send()` always appends a **user** turn. Add a way to push a pre-authored
  assistant message or resend the last turn programmatically (partly overlaps
  with 1.3 Retry).
- **Impact:** ★★☆☆☆  **Effort:** M

---

## Tier 4 — Nice-to-have / v2+

- **Persistence hook** — `.storageKey` or events wired for localStorage so a
  conversation survives reload. (On your v2 list.)
- **Attachments** — file/image input slot + message content model change. (Big;
  your v2 list.)
- **Suggested prompts** — a slot/array of starter chips shown in the empty state.
- **Scroll-to-message / anchor** for long histories.
- **Publish to npm** — separate from features but the thing that makes the
  README's `npm install` / CDN URLs real. (Tracked in `CLAUDE.md`.)

---

## Suggested build order

1. **Tier 1** together (header slot → clear button → retry + error icon) — one
   cohesive "conversation chrome" PR. Update `playground.html` toggles + README.
2. **Tier 2** as a single "expose the knobs" pass.
3. **Tier 3** as integration hooks when a consumer actually asks.
4. **Tier 4** as real v2 planning.

Every change should follow the repo rules: after editing `src/`, run
`npm run build` (examples import from `dist/`), add a playground toggle for any
new option, and document new CSS vars / attributes / labels in the README.
