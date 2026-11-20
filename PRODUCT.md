# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: evaluators.** Frontend developers deciding whether to drop in a
  ready-made AI chat UI instead of building one. They are often comparing it
  against React-only kits (assistant-ui, the Vercel AI SDK UI components) or
  against writing their own. They arrive skeptical, scan fast, and want proof
  that it works in their stack, with their model, and can be made to look like
  their product.
- **Secondary: existing users.** Developers who already installed the package
  and come back to look something up: a CSS variable, an event payload, a slot
  name, an adapter option. They know what they want and need to find it in
  seconds.
- **Also: AI coding assistants** reading the docs on a developer's behalf
  (the repo already ships `AI_USAGE.md` for this).

## Product Purpose

`ai-chat-element` is a reusable, framework-agnostic AI chat UI shipped as a
standard Web Component, `<ai-chat>`, on npm. It gives any web app a complete
streaming chat interface (Markdown, code highlighting, attachments, reasoning
and tool-call display, history sidebar, background streaming) without tying the
app to a framework or an AI provider.

The docs website exists to turn an evaluator into an installer, and then to make
every installer self-sufficient. Success: a developer gets a working chat in
their own framework from the site alone, and finds any customization knob
without reading source.

## Positioning

**Works everywhere, with any model.** One `<ai-chat>` tag runs in React, Vue,
Angular, Svelte or plain HTML, because it is a standard custom element, and it
connects to OpenAI, Anthropic, Ollama and other OpenAI-compatible servers, or
any backend through a function adapter. Competing kits are bound to one
framework (usually React) or one SDK. This is the lead claim.

The supporting proof is depth of customization: nothing is hardcoded, so it can
be made to look like the host product rather than like a widget.

## Operating Context

- Developers read the docs next to their editor, often with a framework
  project open, copying snippets.
- Many test locally against Ollama (free, on-device models); many will connect
  to OpenAI or Anthropic through their own backend in production.
- The live playground (`examples/playground.html`, deployed on GitHub Pages)
  already lets people tweak every knob and export the code. The site links to it
  and borrows its idea: show, don't describe.

## Capabilities and Constraints

- Current version 0.7.0. Public surface: 95 CSS variables, 63 `::part()`
  hooks, 19 slots, 45 labels, plus attributes, methods and events. Main bundle
  about 100 KB gzipped, adapters about 4 KB. License MPL-2.0.
- Built-in adapters: `openAIAdapter` (OpenAI-compatible), `anthropicAdapter`,
  `functionAdapter` (any async generator).
- Site stack (decided): VitePress in `site/`, fully custom theme, hosted on
  GitHub Pages at `mahmoudsr.github.io/ai-chat-element/`. The playground moves to
  `/playground/`; the old `/examples/playground.html` URL must keep working.
- Reference tables (CSS variables, parts, slots, labels, attributes) are
  generated from source so they cannot drift; only descriptions are hand-written,
  and a test fails when one is missing.
- Live `<ai-chat>` demos on the site run on mock transports: no API key, no
  network.
- After launch, the README shrinks to intro, install, quick start and a link.
  `AI_USAGE.md` stays complete because it ships on npm.

## Brand Commitments

- Name: `ai-chat-element` (lowercase, package name). No logo exists yet; a
  typographic wordmark will be designed. No emoji, no mascot.
- The component's own defaults carry the maintainer's taste and must be shown
  honestly: unified 8px radius derived from one variable, no box-shadow from the
  component, AI replies as borderless plain text (ChatGPT/Claude style), no
  emoji by default, SVG icons.
- Voice: plain, precise, developer-to-developer. Claims are specific and
  checkable (counts, sizes, test numbers), never vague superlatives.

## Evidence on Hand

- The component itself, live: it can be embedded on every page.
- The playground (deployed) and `local-demo/` (a full consumer app, "Atlas
  Research").
- `CHANGELOG.md` with seven releases; a 313-test suite running in real
  Chromium; CI on every PR; bundle size and test counts.
- Real adoption signals exist (an outside consumer app; a GitHub issue from a
  fork owner that became the 0.7.0 feature), but there are **no testimonials,
  logos, download numbers or star counts to quote**. Do not invent any.

## Product Principles

1. **Show the real thing.** Every claim on the site is backed by a live
   `<ai-chat>` instance, not a screenshot.
2. **Copy-paste to working.** Every page gets a developer to running code in
   their framework; snippets are complete, not fragments.
3. **Nothing hidden.** Every knob the component has is findable on the site,
   generated from source so the docs can't lie.
4. **Respect the reader's stack.** Framework-neutral by default; framework
   specifics are tabs, never assumptions.

## Accessibility & Inclusion

The component already ships keyboard support, a focus ring, reduced-motion
handling, screen-reader announcements and RTL support. The site must meet the
same bar: WCAG 2.2 AA contrast in light and dark, full keyboard navigation,
visible focus, `prefers-reduced-motion` honored, readable at 380px wide.
