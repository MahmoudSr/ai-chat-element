# Changelog

All notable changes to `ai-chat-element` are documented here. This project
adheres to [Semantic Versioning](https://semver.org/) and the format is based on
[Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.2.0] - 2026-07-17

Feature release: stop-reason + token-usage metadata, a streaming auto-follow
fix, and a docs pass (React/SSR, parts, imperative API).

### Added

- **Finish reason & token usage on completed turns.** A settled assistant
  message now carries two new optional fields — `finishReason` and `usage` —
  which flow out on `ai-chat:message`, letting consumers detect a reply truncated
  at the token limit, a safety refusal, or show token cost. Both are normalized
  across providers:
  - `finishReason: FinishReason` — one vocabulary regardless of backend:
    `'stop'` | `'length'` (truncated) | `'content_filter'` | `'tool_calls'` |
    `'other'`. The provider's raw string is preserved on the transport's `done`
    chunk as `rawFinishReason`.
  - `usage: TokenUsage` — `{ inputTokens?, outputTokens? }`, populated when the
    provider reports them.

  The OpenAI adapter now sends `stream_options: { include_usage: true }` so the
  provider emits a trailing usage chunk (consumers pass nothing); the Anthropic
  adapter reads `message_start` (input tokens) and `message_delta` (stop reason +
  output tokens). Providers/servers that don't report this metadata (e.g. some
  Ollama builds) simply leave the fields `undefined`. New exported types
  `FinishReason` and `TokenUsage`; the `StreamChunk` `done` variant gained
  optional `finishReason` / `rawFinishReason` / `usage`. Additive — existing
  transports and consumers are unaffected. Verified with red-on-old-code tests
  for both adapters and the component (77 tests total this release, up from 67).

### Fixed

- **Auto-follow no longer stops when streamed markdown restyles.** Mid-stream,
  each token re-renders the message's markdown, and the rendered content can
  suddenly shrink (prose collapsing into a code block/table). Pinned at the
  bottom, that shrink made the browser clamp `scrollTop` down and fire a scroll
  event indistinguishable from the user scrolling up — so the view stopped
  following the reply exactly when markdown styling kicked in. The scroll
  handler now unpins only on a *genuine* upward scroll (one that ends away from
  the bottom with unchanged content); reflow clamps are ignored. A real user
  scroll still unpins instantly. Regression-tested in a sized real viewport
  (red-on-old-code verified).

### Documentation

- **React / Next.js docs corrected and expanded.** The JSX shim now augments
  `React.JSX.IntrinsicElements` (typed, not `any`); documented that custom events
  (`ai-chat:message` etc.) use `addEventListener`, not `onXxx` props; and added an
  **SSR warning** — importing the package calls `customElements.define`, which
  crashes on the server, so Next.js needs `'use client'` + `dynamic(…, { ssr:false })`.
  Fleshed out the Vue (`isCustomElement`) and Angular (`CUSTOM_ELEMENTS_SCHEMA`
  placement) notes.
- **Documented the per-role message parts** `message-user` / `message-assistant` /
  `message-system` (already rendered, previously undocumented), so one side can be
  styled without a `[data-role]` selector.
- **Documented imperative-API return types and event payloads** — `send()` /
  `retry()` return `Promise<boolean>`, `addMessage()` returns the created
  `ChatMessage` without sending, and `ai-chat:new-chat` is cancelable — as tables
  in both docs.

## [0.1.5] - 2026-07-16

Bug-fix + accessibility release. No breaking changes; all additive or corrective.

### Added

- **Keyboard focus ring.** Every interactive control (send/stop, retry, new-chat,
  clear, jump, code-copy, composer) now shows a visible ring on keyboard focus
  (`:focus-visible` only — never on a mouse click), fixing an invisible-focus
  WCAG 2.4.7 gap. It's deliberately subtle by default (a thin, softened-accent
  ring) and fully customizable via three new CSS variables:
  `--ai-chat-focus-color`, `--ai-chat-focus-width` (`0` removes it), and
  `--ai-chat-focus-offset`. Documented in both docs; brings the total to 54 vars.

### Changed

- `--ai-chat-bubble-padding` default `4px 14px` → `6px 14px` (a little more
  breathing room in bubbles).

### Fixed

- **SSE parser dropped the last event when a stream closed without a trailing
  blank line.** The read loop only emitted an event once it saw the separating
  blank line, so a server/proxy that closed right after the final event — the
  common case for Ollama's OpenAI-compat shim and its `data: [DONE]` line — lost
  the last token(s) or the `[DONE]` sentinel, cutting responses short. The parser
  now flushes any trailing buffer as a final event at stream end.
- **Multi-byte characters split across the last two network chunks were lost.**
  The `TextDecoder` was never flushed, so trailing bytes of an emoji/CJK/accented
  character buffered at the split point vanished when the stream ended. Now flushed.
- **Multiple `data:` lines in one SSE event are concatenated with `\n`** per the
  spec, instead of being parsed as separate (and, for split JSON, invalid) lines.
  No effect on OpenAI/Anthropic (single-line data today); hardens "any compatible
  server".
- **Failed requests now surface the provider's actual error message** instead of
  a raw JSON envelope truncated mid-token. A 401 that used to read
  `Request failed: 401 Unauthorized – {"error":{"message":"Incorrect API ke`
  now reads `Request failed (401 Unauthorized): Incorrect API key provided.`
  The error parser (new shared `adapters/errors.ts`) understands the
  `{ error: { message } }`, flattened `{ error }`, and top-level `{ message }`
  shapes, and falls back to a cleanly ellipsised body for anything else.
- **The jump-to-latest scroll now honors `prefers-reduced-motion`.** It used
  `scrollTo({behavior:'smooth'})`, which ignores the CSS `scroll-behavior: auto`
  reduced-motion override, so users who asked for reduced motion still got an
  animated scroll (WCAG 2.3.3). The behavior is now gated on the media query in JS.
- **Keyboard focus is no longer dropped when a focused control disappears.**
  Retry (removes the failed message), Stop (swaps Stop→Send), New-chat/clear
  (empties the view), and a click on Send (swaps Send→Stop) all destroyed the
  element under focus, leaving focus on `<body>`. Focus now returns to the
  composer input in each case — but only when focus was already inside the
  widget, so a programmatic `clear()` from elsewhere on the page never yanks
  focus in.
- **Streaming no longer spams the screen reader.** The message list was a
  `role="log"` with `aria-live="polite"`, so every streamed token re-announced
  the growing partial reply token-by-token — an unusable firehose. The log is no
  longer a live region; instead a single visually-hidden `role="status"` region
  announces the settled reply (or the error / empty-response note) ONCE per turn,
  after streaming completes.

## [0.1.3] - 2026-07-15

**Critical fix. Every earlier version (0.1.0, 0.1.1, 0.1.2) is broken for any
consumer who bundles the package — please upgrade.**

### Fixed

- **The component was silently deleted from consumers' production builds.**
  `package.json` declared `"sideEffects": ["**/register.js", "**/register.ts"]`
  — files that have never existed in this project. That tells every bundler
  nothing else here has side effects, so it may drop what looks unused. But
  importing the entry point IS the side effect: it registers `<ai-chat>` via
  Lit's `@customElement` decorator, and no export is referenced. Rollup/webpack
  therefore tree-shook the entire component away: `import 'ai-chat-element'`
  (the first line of the README's quick start) produced an ~0.8 kB bundle with
  no element in it, `customElements.get('ai-chat')` returned undefined, and
  `<ai-chat>` rendered as an inert unknown tag.

  Dev servers don't tree-shake, so this worked in development and failed only in
  a production build — with no error or warning. Now `"sideEffects": true`,
  which is correct: importing this package's entry is a side effect by design.

### Added

- `npm run verify:bundling` — builds a throwaway consumer app against the real
  packaged `dist/`, resolved through `node_modules` as a bare specifier, and
  fails if the element registration doesn't survive production tree-shaking. It
  now gates `prepublishOnly`, alongside the typecheck, tests and build. No
  existing test could catch this class of bug: our own tests import symbols
  directly (nothing to shake) and never bundle the package as a consumer would.

## [0.1.2] - 2026-07-15

Bug-fix release. Found by building a real consumer app against the published
0.1.1 package. No behaviour was removed; the one new API is additive.

### Added

- `--ai-chat-new-chat-radius` (defaults to `--ai-chat-button-radius`) — the
  sidebar's full-width New-chat button now has its own radius knob. Setting
  `--ai-chat-button-radius: 50%` for circular icon buttons used to turn that
  button into a pill, with no way to opt out short of `::part(clear-button)`.

### Fixed

- **A slotted `header` landed in an unstyled wrapper.** The `header` slot's
  container had no CSS at all — no padding, no divider, no layout — because the
  bar's styling lived only on the built-in header the slot replaces. Consumers
  had to re-derive the padding/border by eye, and content could wrap. Slotted
  header content now keeps the bar's frame (padding + bottom divider, centered
  row). The `header-slot` `::part()` is now documented in both docs.
- **Avatars only rendered on the first message of each role.** A slotted node is
  a single live DOM node, so it can only be projected into one `<slot>` — but a
  `<slot name="assistant-avatar">` was rendered inside *every* message, leaving
  all but the first empty. The slots now live in one hidden container per role
  and each message renders a clone. The authoring API is unchanged
  (`<span slot="user-avatar">`). This affected every consumer using avatars with
  more than one message per role since 0.1.0; 0.1.1 fixed the *detection* of
  slotted avatars but not this underlying projection problem.
- Slotted avatar content could overflow its round frame and be clipped square by
  the container's `overflow: hidden`, rendering as a squircle instead of a circle.
- **`ChatLabels` was not exported** from the package entry point, so TypeScript
  consumers couldn't import it to type their `labels` / i18n object — even though
  it was documented as a public type. It is now exported alongside the other
  types (runtime behaviour is unchanged).

### Docs

- Documented the adapter options that were missing from the reference lists:
  `params` (both adapters), `headers`, and Anthropic's `browserAccess`.

## [0.1.1] - 2026-07-14

Bug-fix release. All fixes were found by end-to-end browser testing against the
published package; no public API was removed. Two additive API surfaces were
introduced (see **Added**).

### Added

- `emptyResponse` label and matching `empty-response` `::part()` — an empty
  assistant reply now renders a muted placeholder instead of a blank bubble.
- The empty state now shows a default chat-bubble icon (still replaceable via the
  `empty-icon` slot).

### Changed

- **`--ai-chat-outer-radius` now defaults to `var(--ai-chat-radius)`** (8px)
  instead of `0`, so the widget is rounded out of the box. Set it to `0` for the
  previous square frame — e.g. when your own container already rounds and clips
  the widget. (Note: a wrapper with `overflow: hidden` and square corners will
  clip the widget's rounding.)
- **`--ai-chat-bubble-padding` default tightened** from `10px 14px` to
  `4px 14px`; slightly more space below the name/timestamp row.

### Fixed

- **Streaming could become unstoppable.** Starting a new chat (or a new send)
  while a reply was still streaming orphaned the in-flight request's abort
  controller, so the Stop button and Esc no longer cancelled the new stream.
  Each send now owns its controller and cleanup is guarded accordingly.
- **Auto-scroll fought the user.** Slowly scrolling up during streaming jittered
  the view back down. Scroll pinning was rewritten around an
  `IntersectionObserver` plus a direct scroll-direction check, eliminating the
  jitter while still auto-following new content and re-pinning at the bottom.
- **`ai-chat:message` fired for empty replies**, causing consumers who persist on
  that event to save blank turns. It now fires only when the reply has content.
- **Empty replies left a blank "ghost" bubble.** They now show the
  `emptyResponse` placeholder.
- **Code-block language label** showed `text` for languages the bundled
  highlighter doesn't know (e.g. `mermaid`); it now keeps the fence's own tag.
- **New-chat kept a half-typed draft** in the composer; `clear()` now resets it.
- **Markdown tables crushed their columns on narrow screens**; they now keep
  their natural width and scroll horizontally instead.
- **Esc didn't stop a stream after clicking the message area.** The stop-on-Esc
  listener now lives on `document`, so it works regardless of focus (still only
  acting on a widget that is actively streaming).
- **Avatars never appeared, even when slotted.** The column's visibility was
  driven by a CSS `:has(slot > *)` rule, which can never match — content assigned
  to a slot is projected, not parented into it. Slot occupancy is now detected
  properly, so `assistant-avatar` / `user-avatar` work as documented.
- **An empty chat showed a phantom scrollbar**, caused by the full-height empty
  state plus the bottom scroll sentinel overflowing the container.

## [0.1.0] - 2026-07-13

Initial public release.

- Framework-agnostic `<ai-chat>` Web Component (Lit + TypeScript), usable in
  React, Angular, Vue, Svelte, and plain HTML.
- Token-by-token streaming with a stop button and jump-to-latest.
- Markdown rendering with syntax-highlighted code blocks and copy buttons;
  output sanitized with DOMPurify.
- Pluggable transports: OpenAI-compatible, Anthropic, and a custom
  `functionAdapter` for server-backed (key-on-server) setups.
- Full CSS-variable theming, `auto`/`light`/`dark` themes, sender names,
  timestamps, avatars, and complete label/i18n overrides.
- Optional header, New-chat button, retry-on-failure, and a history sidebar
  shell (consumer owns storage).
- Accessibility: ARIA live region, keyboard support, reduced-motion.
- Licensed under MPL-2.0.

[Unreleased]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.3...v0.1.5
[0.1.3]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MahmoudSr/ai-chat-element/releases/tag/v0.1.0
