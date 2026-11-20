---
name: ai-chat-element docs
description: A paint-store colour fan deck held by one steel rivet; every strip is a real <ai-chat> theme.
colors:
  chip-start: "#2f5bff"
  chip-model: "#00788f"
  chip-features: "#5b3fe0"
  chip-customize: "#c2410c"
  chip-reference: "#2c3039"
  chip-reference-dark: "#8b909c"
  link-blue: "#1f45e0"
  link-blue-dark: "#8fa8ff"
  ground: "#f4f5f7"
  card: "#ffffff"
  ink: "#16181d"
  ink-2: "#3a3e48"
  ink-3: "#5d6270"
  rule: "#e4e5e8"
  rule-strong: "#cfd2d8"
  ground-dark: "#0f1013"
  card-dark: "#17191e"
  ink-dark: "#eceef2"
  ink-2-dark: "#b9bdc7"
  ink-3-dark: "#8b909c"
  rule-dark: "#262931"
  rule-strong-dark: "#353945"
  code-slab: "#16181d"
  code-slab-dark: "#0c0d10"
  code-lang: "#9aa1ad"
  rivet-steel: "#b8bcc4"
  rivet-rim: "#7d838d"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, min(3.3vw, 4.8svh), 46px)"
    fontWeight: 850
    lineHeight: 0.98
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 88"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 92"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 750
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 92"
  wordmark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  strip-name:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(12px, 1.1vw, 16px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 76"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 650
  code:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 500
  chip-code:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  notch: "1px"
  nav-chip: "2px"
  group-chip: "3px"
  swatch: "4px"
  control-sm: "6px"
  control: "8px"
  strip: "10px"
  frame: "12px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "16px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 20px"
  install-command:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 8px 0 14px"
  button-tool:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control-sm}"
    padding: "6px 10px"
  input-filter:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  fan-strip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.strip}"
    width: "clamp(84px, 7.8vw, 112px)"
  demo-frame:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.frame}"
  demo-frame-bar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-3}"
    padding: "8px 10px 8px 14px"
  code-block:
    backgroundColor: "{colors.code-slab}"
    textColor: "#e6e8ee"
  accent-swatch:
    rounded: "{rounded.swatch}"
---

# Design System: ai-chat-element docs

## Overview

**Creative North Star: "The Colour Fan Deck"**

The site is a paint-store colour standard fanned open. One steel rivet (the one `<ai-chat>` tag) holds every strip: each strip is a framework or a model, and each carries a real, valid `<ai-chat>` theme. Turning the fan swings a strip to centre and re-themes the live chat through its actual CSS variables. Nothing on the home page is a picture of the product; the pulled card is the product.

The world is bright and dry: white chip card stock on a cool pale ground, flat full-strength swatches, ink type, one drawn steel disc. Colour is the content (it is what a fan deck is for), so the interface itself never spends hue on state. Selection, current page and hover are told by form: a strip slides out, a square notch sits beside the current link, a 2px ink underline marks the current section. The docs pages carry the same language quietly: each docs section owns one chip colour, shown as a swatch on its sidebar group and a cap-height chip on its nav link, and everything else is ink on white at a calm reading measure.

Density is low on the home page (exactly one screen on desktop, no footer) and editorial in the docs (64ch measure, generous heading space). Dark mode follows the visitor's system: page and live chat go dark, but the fan's strips keep light card stock, like a paint deck lying on a dark desk.

**Key Characteristics:**
- Cool pale ground (#f4f5f7), never cream; white cards; ink (#16181d) type.
- Five section chips, flat and full strength, one per docs section.
- State by form, never hue.
- Archivo on its width axis for everything readable; JetBrains Mono only for code and chip codes.
- One steel rivet as the mark, in the nav and at the fan's pivot; it never moves.
- Code is always a dark slab, in both modes.
- Live, mock-transport `<ai-chat>` instances wherever the product is shown.

## Colors

Neutral ink-and-paper chrome around five saturated section chips; the strips' own swatch families (per framework/model, in `site/.vitepress/theme/demo/decks.ts`) are content, not system colour.

### Primary
- **Standard Blue** (chip-start): the Get started chip, the nav and sidebar swatch for that section, the focus ring, the selection tint (at 22%) and the pulsing "still generating" dot in the history demo. Links use the deeper **Link Blue** (link-blue), lifted to a pale periwinkle (link-blue-dark) in dark mode.

### Secondary
- **Deep Teal** (chip-model): the Models section chip.
- **Violet Ink** (chip-features): the Features section chip.
- **Burnt Orange** (chip-customize): the Customize section chip.
- **Graphite** (chip-reference): the Reference section chip; lifts to a mid grey (chip-reference-dark) in dark mode because graphite vanishes on the dark nav and sidebar.

### Neutral
- **Cool Paper Ground** (ground): the page under the fan, the sidebar background, the demo-frame toolbar, the ThemeLab control column.
- **Chip Card White** (card): docs page background, every card, strip and demo frame.
- **Ink** (ink): headings, current-state text, the primary button fill, strip outlines in focus.
- **Ink 2 / Ink 3** (ink-2, ink-3): body copy and secondary text; captions, chip codes, table sub-lines.
- **Rule / Rule Strong** (rule, rule-strong): hairline dividers; input and frame borders.
- **Dark ground, card, inks and rules** (`*-dark`): the same roles in dark mode.
- **Code Slab** (code-slab, code-slab-dark): the background of every code block, with github-dark syntax colours in both modes; language labels in code-lang.
- **Rivet Steel** (rivet-steel, rivet-rim): the drawn rivet only.

### Named Rules
**The Hue Is Content Rule.** Hue belongs to chips and themes. No selected, current, hover or active state is ever expressed by changing a colour; it is expressed by lift, notch, underline, ring or dot in ink.

**The One Chip Per Section Rule.** Each docs section owns exactly one chip colour, used only as that section's swatch (nav chip, sidebar group swatch, current-page notch). Never as text colour, background wash or button fill.

**The Never Cream Rule.** The ground is cool (#f4f5f7). Warm off-whites are outside this world.

## Typography

**Display Font:** Archivo, variable width and weight (with ui-sans-serif, system-ui)
**Body Font:** Archivo (same family)
**Label/Mono Font:** JetBrains Mono 400/500/600 (with ui-monospace, SFMono-Regular, Menlo)

**Character:** One grotesque stretched and squeezed on its width axis does all the talking: condensed and heavy for headlines and strip names, extended for the wordmark, normal for reading. Mono is a tool for code and paint codes, never a voice.

### Hierarchy
- **Display** (850, clamp to 46px, 0.98, width 88%): the home headline on the pulled card only.
- **Headline** (850, 40px, 1.05, width 92%): docs page h1.
- **Title** (750, width 92%, -0.015em): docs h2/h3, with 48px above h2 and no rule over it; headings balance-wrap.
- **Wordmark** (800, 19px, width 112%): the nav title beside the rivet.
- **Strip name** (800, clamp 12-16px, width 76%, uppercase): framework and model names on strip tabs; narrows to width 70% below 1180px so long names fit.
- **Body** (400, 15px, 1.45): lede and prose; docs paragraphs and list items capped at 64ch (58ch inside tip boxes), pretty-wrapped.
- **Label** (650, 13-14px): sidebar current item, control labels, filter label, sidebar group titles (750, width 92%).
- **Code / Chip code** (JetBrains Mono 500, 14px / 11px): code, install command, paint codes on strip tabs and chips, demo-frame status (12px, uppercase, 0.05em).

### Named Rules
**The Mono Is Code Rule.** JetBrains Mono appears only on code, CSS variable names, and paint/chip codes. Never for headings, buttons or prose.

**The Whole Identifier Rule.** Inline code and table identifiers never break mid-name (`white-space: nowrap`); only long values (types, defaults, payloads) may wrap.

## Layout

The home page is exactly one screen on desktop (height `max(600px, 100svh - 64px nav)`), with no footer and nothing below the deck. Ten strips radiate from a pivot at bottom centre in fixed angular slots (±30° to ±72°, opening to ±39° to ±75° below 1366px) leaving a gap for the pulled card: a centred column `min(580px, 40vw)` wide, 18px from the top, holding the live chat above and the label (headline, lede, install row, code line) below. On short desktop windows (≤800px tall) the lede is dropped so the chat keeps its lines.

At 960px and below the deck lies flat: label card, then a horizontally scrolling, snap-aligned row of 104 x 84px strips (the selected one scrolled to centre), then the chat card at 560px tall. Page gutter 16px. At 420px the install row stacks.

Docs pages use VitePress's layout re-skinned: 64px nav, the nav title column locked to the sidebar width on every page so Search never jumps, and `scrollbar-gutter: stable` so the header does not slide between the scroll-free home and scrolling docs. Reading measure is 64ch. Tables take full width with the description column at least 18em; at 768px and below every table stacks into labelled cards (each cell prefixed by its column name, the first cell bold).

Spacing runs on small steps: 6px (chip gaps), 10px (row gaps), 14px (card padding), 16px (panel padding, page gutter), 28px (label side padding), 24-32px around demo frames.

## Elevation & Depth

Depth is physical and quiet: strips and cards are paper lying on paper, so they cast soft two-layer shadows. Docs content stays flat; only the live demo frames and fan elements lift.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 2px 3px rgb(22 24 29 / 0.12), 0 8px 24px rgb(22 24 29 / 0.1)`): resting strips, demo frames, mobile cards. Dark: `0 2px 3px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.35)`.
- **Lift High** (`box-shadow: 0 4px 8px rgb(22 24 29 / 0.16), 0 30px 60px -10px rgb(22 24 29 / 0.28)`): the pulled card, a hovered strip, the selected strip. Dark: `0 4px 8px rgb(0 0 0 / 0.45), 0 30px 60px -10px rgb(0 0 0 / 0.6)`.

### Named Rules
**The Lift Is State Rule.** A strip rises 8px on hover and 12px when selected, gaining Lift High. Rising is how the deck says "this one", never a colour change.

## Shapes

Softly cornered paper. Radii scale with the object, not one value: strips 10px, frames and the pulled card 12px, buttons and inputs 8px, small tool buttons 6px, accent swatches and inline code 4px, sidebar group swatches 3px (12 x 18px), nav chips 2px (7 x 10px, exactly cap height), the current-page notch 1px (6 x 6px). The rivet is the only circle in the chrome (plus the selected strip's 12px tab dot). Borders are hairlines (1px rule) except the install command, outlined in 1.5px ink as the one thing to copy.

## Components

### Buttons
- **Primary ("Get started")**: solid ink, card-white text, 700 15px, 44px tall, 8px corners; rises 1px on hover with the world ease.
- **Install command**: card-white with a 1.5px ink outline, mono 14px command, a 30px ground-filled copy well with a stroked SVG icon that swaps to a check; `cursor: copy`.
- **Tool buttons** (demo Replay, ThemeLab Reset): card fill, 1px rule-strong border, 6px corners, 600 12px Archivo; hover darkens the border to ink-3.
- **Focus**: 2px Standard Blue outline at 2px offset everywhere; strips use a 3px ink outline at 3px.

### Chips
- **Section chips**: flat solid rectangles in the section colour, no text; 7 x 10px in the nav before each section link, 12 x 18px before each sidebar group title.
- **Fan chips**: full-strength swatches filling each strip below its tab, the first two labelled with their hex in 11px mono, ink or white chosen per chip for WCAG contrast.

### Cards / Containers
- **Demo frame** (LiveDemo, ThemeLab): 12px corners, 1px rule-strong border, card fill, Lift, `overflow: hidden`; the embedded chat sets its own outer radius to 0 and inherits Archivo and JetBrains Mono. A ground-coloured toolbar below carries a mono uppercase "scripted demo" note, the last event, and a Replay button.
- **ThemeLab**: 220px ground control column beside the preview; collapses to one column at 760px. Generated code sits on the dark slab under the chat.

### Inputs / Fields
- **Filter input**: 36px tall, 1px rule-strong border, 8px corners, card fill, 500 14px Archivo, max 320px; a mono count beside it.
- **ThemeLab controls**: 6px corners, rule-strong border; range sliders use ink as `accent-color`.

### Navigation
- **Top nav**: wordmark beside the 16px rivet; section links 500 weight, each preceded by its section chip. Current section: ink text with a 2px ink underline at 8px offset.
- **Sidebar**: groups titled in 750 condensed Archivo with their chip swatch. Current page: ink 650 text and a 6px square notch in the group's chip colour, 14px left of the item.

### Fan Strip (signature)
A 10px-cornered card strip (width clamp 84-112px) rotated about a pivot 26px above its base. A 66px tab carries the name (condensed uppercase) and its paint code (mono, ink-3); swatches fill the rest. Rotation and lift transition over 0.7s on `cubic-bezier(0.16, 1, 0.3, 1)`; reduced motion swaps instantly. Selected: slides out 12px, gains Lift High, and carries a 12px ink dot on its tab. A radiogroup: arrows, Home and End move the selection. Codes covered by the card or a neighbour are hidden after measuring, never left half-visible. In dark mode strips keep light card stock (ground #f4f5f7) with ink text.

### History list row (demo)
Transparent rows, 8px corners, 500 13px; hover tints ink at 6%, active at 10% with ink 650 text; a pulsing 8px Standard Blue dot marks a conversation still generating (static under reduced motion).

## Do's and Don'ts

### Do:
- **Do** show state by form: lift (8px hover, 12px selected), a square notch, a 2px ink underline, a ring (`0 0 0 2px ground, 0 0 0 4px ink`) or a dot.
- **Do** give each docs section one chip colour and use it only as that section's swatch.
- **Do** put code on the dark slab (#16181d light, #0c0d10 dark) with github-dark colours in both modes.
- **Do** show the product as a live `<ai-chat>` on a mock transport, framed in a 12px demo frame with Lift.
- **Do** keep the home page one screen on desktop and stack label, strip row, chat on a phone.
- **Do** keep prose at 64ch and stack tables into labelled cards at 768px and below.
- **Do** honour `prefers-reduced-motion` on every transition and the pulsing dot.

### Don't:
- **Don't** change a colour to mark selected, current, hover or active.
- **Don't** use a warm or cream ground.
- **Don't** set headings, buttons or prose in JetBrains Mono.
- **Don't** add a second mark or move the rivet; it is the logo in the nav and the pivot of the fan.
- **Don't** put a light-themed code block on the page; light syntax colours on the dark slab are unreadable.
- **Don't** let a section chip become a text colour, a background wash or a button fill.
