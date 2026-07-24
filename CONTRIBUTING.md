# Contributing to ai-chat-element

Thanks for your interest! This is a small, focused project — a single
framework-agnostic `<ai-chat>` Web Component — so a few conventions keep it
consistent and safe to release.

## Getting set up

```bash
git clone https://github.com/MahmoudSr/ai-chat-element.git
cd ai-chat-element
npm install
npx playwright install --with-deps chromium   # tests run in a real browser
npm run dev                                    # Vite dev server, opens the playground
```

- **Node 24** is what CI and the lockfile expect. On an older npm, `npm ci` may
  reject the lockfile.
- The **playground** (`examples/playground.html`) is the main testing surface —
  every attribute, CSS variable, label, and slot is controllable there, and it
  can drive a real local model via **Ollama**.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server; opens the examples landing page. |
| `npm run build` | Typecheck-emit + Vite library build into `dist/`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest in **real Chromium** (Playwright). |
| `npm run test:watch` | Same, in watch mode. |

> **After editing `src/`, run `npm run build`.** The examples import from
> `dist/`, so they won't reflect your changes until you rebuild.

## Project layout

- `src/ai-chat.ts` — the `<ai-chat>` LitElement (state, streaming, render, events).
- `src/styles.ts` — **all** CSS + the CSS-variable theming API. This is a Lit
  `` css`` `` template, not SCSS — it must live inside the Shadow DOM. Don't
  convert it to `.scss`. (Gotcha: backticks or `${}` inside CSS **comments**
  break the `css` tag — avoid them.)
- `src/labels.ts`, `src/icons.ts`, `src/types.ts` — i18n strings, inline SVG
  icons, and public types.
- `src/markdown/` — the marked → DOMPurify → highlight.js render pipeline.
- `src/adapters/` — transport adapters (OpenAI-compatible, Anthropic, function).

## Testing philosophy (please follow)

The suite runs in a **real browser on purpose** — every bug this component has
had lived in the Shadow DOM (slot projection, `::slotted`, `:host`), which a
fake DOM (jsdom/happy-dom) renders wrong. Don't switch the test runner to a
fake DOM.

Two rules that have repeatedly saved this project:

1. **Write a test that fails on the old code first.** Before trusting a fix,
   revert it and watch the test go red. A test that passes on both the broken
   and fixed code proves nothing (this has bitten us more than once).
2. **Assertions must be able to fail.** e.g. asserting a slotted node "exists"
   false-passes on an empty `<slot>` — assert it's *not* a `<slot>` and actually
   paints.

## Docs stay in lockstep (enforced)

`README.md` and `AI_USAGE.md` each carry a **complete** list of every CSS
variable, `::part()`, slot, attribute, and label. If you add or rename any of
these, **update both docs**. `test/public-api.test.ts` mechanically checks this
and will go red if you forget.

## Design principles

- **The consumer can customize almost everything.** Prefer exposing a CSS
  variable / attribute / slot / label over hardcoding. Every rounded surface
  derives from `--ai-chat-radius` and gets its own override knob.
- **No emoji in the default UI**; icons are overridable SVGs.
- The component owns the **chat UI shell**; the consumer owns **data and
  storage**. When a gap appears, the usual fix is to expose a hook, not to build
  the feature into the component.

## Submitting a change

1. Branch off `main`.
2. Make the change with a test that's red-on-old-code.
3. Run `npm run typecheck && npm test && npm run build` — all green.
4. Update `README.md` / `AI_USAGE.md` if you touched the public API, and add a
   `CHANGELOG.md` entry under **Unreleased**.
5. Open a PR against `main`. CI (typecheck + tests + build) must pass — it's a
   required check.

## Releases

Releases are cut by the maintainer. The npm account has 2FA enabled, so
`npm publish` is run manually by the maintainer — please don't add automated
publish steps without discussing it first.

## License

By contributing, you agree your contributions are licensed under the project's
[MPL-2.0](./LICENSE) license.
