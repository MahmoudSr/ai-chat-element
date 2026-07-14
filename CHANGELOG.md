# Changelog

All notable changes to `ai-chat-element` are documented here. This project
adheres to [Semantic Versioning](https://semver.org/) and the format is based on
[Keep a Changelog](https://keepachangelog.com/).

## [0.1.1] - 2026-07-14

Bug-fix release. All fixes were found by end-to-end browser testing against the
published package; no public API was removed. Two additive API surfaces were
introduced (see **Added**).

### Added

- `emptyResponse` label and matching `empty-response` `::part()` — an empty
  assistant reply now renders a muted placeholder instead of a blank bubble.

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

[0.1.1]: https://github.com/MahmoudSr/ai-chat-element/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MahmoudSr/ai-chat-element/releases/tag/v0.1.0
