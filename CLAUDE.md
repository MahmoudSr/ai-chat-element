# CLAUDE.md — project context for Claude Code

Read this first when starting a new session on this repo.

## What we're building

`ai-chat-element` — a **reusable, framework-agnostic AI chat UI** shipped as a
**Web Component** (`<ai-chat>`), intended for publishing to npm. It must work in
React, Angular, Vue, and plain HTML, and connect to any AI chat API. Built with
**Lit + TypeScript + Vite**.

The guiding principle the user cares most about: **the developer using this
package should be able to customize almost everything**, with sensible defaults.
Prefer exposing a CSS variable / attribute / label over hardcoding.

## Tech stack & build

- **Lit 3** (Web Component), **TypeScript**, **Vite** (library build).
- Deps bundled in: `marked` (markdown), `dompurify` (sanitize), `highlight.js`
  (syntax highlight — only a subset of languages registered to keep size down).
- Build output: `dist/ai-chat-element.js` (~78 KB gzipped) + `dist/adapters/`.
- Styles live in `src/styles.ts` as a Lit `css\`\`` template (NOT SCSS — must be
  inside the Shadow DOM; this is idiomatic for Lit). Never convert to `.scss`.

### Commands
- `npm run dev` — Vite dev server; auto-opens `index.html` (examples landing).
- `npm run build` — typecheck emit + Vite library build into `dist/`.
- `npm run typecheck` — `tsc --noEmit`.
- After editing `src/`, **always `npm run build`** — the examples import from
  `dist/`, so they won't reflect changes until rebuilt.

### Gotcha: `css\`\`` template literals
Backticks and `${}` inside CSS **comments** break the Lit `css` tag (they start
JS interpolation). Never put backticks in comments inside `src/styles.ts` /
`src/hljs-theme.ts`.

## File map

```
src/
  ai-chat.ts       # the <ai-chat> LitElement — state, streaming, render, events
  styles.ts        # ALL CSS + the CSS-variable theming API (top of file)
  hljs-theme.ts    # highlight.js token colors, scoped for the shadow DOM
  markdown.ts      # marked + dompurify + hljs pipeline; copy-button markup
  labels.ts        # ChatLabels interface + DEFAULT_LABELS (i18n strings)
  types.ts         # ChatMessage, ChatTransport, StreamChunk, Role
  index.ts         # main entry — registers element, re-exports public API
  adapters/
    openai.ts      # openAIAdapter (OpenAI + OpenAI-compatible, e.g. Ollama)
    anthropic.ts   # anthropicAdapter (Anthropic Messages API)
    function.ts    # functionAdapter (wrap any async generator of text)
    sse.ts         # shared SSE parser over a fetch Response
    index.ts       # adapters entry point
examples/
  playground.html  # full control panel — toggle every option live (mock transport)
  ollama.html      # real local AI via Ollama; just a centered chat, no chrome
index.html         # examples landing page (dev server opens this)
README.md          # public docs
AI_USAGE.md        # guide to paste into a consumer's AI assistant
```

## Current feature state (done)

- Core chat: streaming tokens, stop button, jump-to-latest, auto-scroll that
  doesn't fight the user (sticks to bottom only when already at bottom).
- Markdown + syntax-highlighted code blocks with copy buttons.
- Transports: OpenAI-compatible, Anthropic, custom `functionAdapter`.
  API request formats verified against current OpenAI/Anthropic docs.
- Theming via CSS variables; one-line accent rebrand (`--ai-chat-accent`).
- `theme` attribute: `auto` (default, follows OS) / `light` / `dark`.
- Sender **names** ("You" / "AI bot") + **timestamps**, both toggleable
  (`show-names`, `show-timestamps`) and customizable via `labels`.
- **No emoji by default** — avatars are opt-in via slots; icons are SVGs.
- AI messages are **borderless plain text by default** (ChatGPT/Claude style);
  `assistant-bubble` opts into a bubble.
- All UI/accessibility strings overridable via the `.labels` object (i18n).
- **Conversation chrome (added):** optional built-in header (`show-header`,
  chat-column only — NOT across the sidebar) with a `header` slot override;
  New-chat button (`show-clear`) that fires a cancelable `ai-chat:new-chat` event
  then clears; Retry on failed messages (`show-retry`, on by default) via
  `retry()`.
- **History sidebar (added):** `show-aside` renders an `aside` slot column
  (`aside-side` left/right). Layout mirrors ChatGPT/Claude — a full-width
  New-chat button pinned at the TOP of the sidebar (`.aside__top`), the
  consumer's list scrolls below it (`.aside__list`). When there's no sidebar the
  New-chat button falls back to the header/floating icon. Component stays
  SINGLE-conversation on purpose — consumer owns the list + storage, driven by
  `ai-chat:new-chat` and swapping `.messages`. Working demo in `playground.html`.
- **Composer redesign (added):** the input is one rounded box (`.composer__box`)
  with the send/stop button INSIDE on the right and a bottom action row. Empty
  `composer-actions-start` / `composer-actions-end` slots are the drop-in points
  for FUTURE attach / image-paste / mic / text-to-speech buttons (user plans
  these). `--ai-chat-input-max-height` caps grow height and is read by the JS
  autosize so CSS and JS can't diverge.
- **Icons live in `src/icons.ts`** (extracted so `ai-chat.ts` stays lean); each
  is overridable via a named slot.
- **Keyboard:** Enter sends, Shift+Enter newline, **Esc stops** an in-flight
  stream (host-level listener in `connectedCallback`, works regardless of focus
  within the widget).

## Docs must stay in lockstep (IMPORTANT)

`README.md` and `AI_USAGE.md` each contain a **complete, hand-maintained** list of
every CSS variable, `::part()`, slot, attribute, and label. They are currently in
sync with the code (verified: all 47 `--ai-chat-*` vars documented in both). When
you add ANY new variable / part / slot / label / attribute, update BOTH docs (and
the relevant table/list here). A quick check:
`grep -oE '\-\-ai-chat-[a-z-]+' src/styles.ts | sort -u` diffed against each doc.

## Key design decisions / user preferences (IMPORTANT — honor these)

- **Border radius:** default **8px**, and EVERY inner element derives from the
  single `--ai-chat-radius`. The user explicitly wants all radii unified at the
  same value by default, with per-surface overrides available.
- **Outer frame:** `--ai-chat-outer-radius: 0` — the whole widget is square by
  default (the consumer's own container rounds it). No box-shadow from the
  component.
- **Examples:** keep only `playground.html` + `ollama.html`. The user removed
  the light/dark examples (they'll set page background themselves). Example
  wrappers should have NO border-radius and NO box-shadow.
- The user tests mostly via the **ollama.html** example against a local model.

## Local AI testing (Ollama)

The user runs a real model locally for free:
- Model pulled: `llama3.2`. Runs on their **NVIDIA RTX 3050 Ti** (GPU-accelerated
  once `CUDA_VISIBLE_DEVICES=0` was set — they also have a weak AMD iGPU that
  Ollama wrongly picked first).
- Start Ollama for browser access:
  `$env:OLLAMA_ORIGINS="*"; $env:CUDA_VISIBLE_DEVICES="0"; ollama serve`
  (kill background instances first if "address already in use").
- `examples/ollama.html` points `openAIAdapter` at
  `http://localhost:11434/v1/chat/completions`, model `llama3.2`, no key.

## Not done yet / possible next steps

- **Publish to npm** — not published yet, so `npm install ai-chat-element` and
  the `esm.sh` CDN URLs in the docs won't work for real users until then.
  Would need: confirm package name is free, npm account, `npm publish`.
- **v2 features** discussed but not built: conversation history / persistence,
  new/clear conversation button, file/image attachments, edit & regenerate.

## Environment notes

- Windows 11, PowerShell primary. Git is NOT initialized in this repo (the user
  hasn't wanted git/GitHub yet — a `.gitignore` exists and is ready).
- Dev server sometimes lands on 5174 if a stale process holds 5173; clear ports
  with PowerShell `Get-NetTCPConnection -LocalPort 5173 | ... Stop-Process`.
