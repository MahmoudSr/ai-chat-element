---
version: 1
slug: "site-index-md"
primary_target: "site/index.md"
related_targets: ["site"]
---

## Scope

Docs website for ai-chat-element: landing page (Persuade) plus documentation pages (Read), one visual world. VitePress with a fully custom theme in `site/`, GitHub Pages. Evaluators first, returning users second.

## Direction contract

THESIS: The component is a colour standard you fan open: one rivet (one `<ai-chat>` tag) holds every strip (framework, model, theme). Refuses the category default of a dark hero with a centred headline over a demo window and a card grid.

OWN-WORLD: Bright white chip card on a cool pale ground, never cream; full-strength flat swatch chips with tiny mono codes; one steel rivet. Archivo (width axis) for display and UI, JetBrains Mono only for code and chip codes. Each docs section owns a chip colour. State is form, never hue: a strip lifts, a notch cuts, a code is struck.

STORY: The visitor sees the real chat on the pulled strip, reads "One tag. Any framework. Any model.", turns the fan to watch the same chat re-theme per framework/model, copies `npm i ai-chat-element`, and goes to Get started.

FIRST VIEWPORT: A fan of ten strips radiates from one rivet at bottom centre, filling the viewport. The centre strip is pulled out and widened: the live `<ai-chat>` on top, the headline, lede and install row with Get started on its label below. Framework and model names sit on the strip tips.

FORM: Paint-store colour fan deck, grounded list position 6 of 7. seed:634d34436f0b9110. Raises: state by form, not hue (emission rail); unset variables as ghost chips showing defaults (seven-segment); the rivet never moves, anchoring nav on every page (sleeping city); layouts snap to whole chip units (azulejo); docs hold one reading measure, extra width goes to a margin for demos and code (centre rail).

Signature interaction: turning the fan swings a strip to centre and re-themes the live chat through real CSS variables, with a damped single-axis rotation; reduced motion swaps instantly.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Open decisions

- Exact chip palettes per strip are real `<ai-chat>` themes (values must be valid component themes).
- Docs page chrome (sidebar as a vertical strip, section chip colours) to be confirmed with the first docs page build.
