<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useData, withBase } from 'vitepress';
import { strips, DEFAULT_STRIP, type Strip } from '../demo/decks';

/*
 * The home-page fan deck. Ten strips share one rivet: frameworks on the left,
 * models on the right. The strip turned to the centre themes the live
 * <ai-chat> on the pulled card through its real CSS variables and opens a
 * conversation about that framework or model.
 */

// Fixed slots like a real fan deck: a gap in the middle holds the pulled card.
// The innermost slots must clear the card, or those strips hide behind it.
const SLOTS = [-72, -61.5, -51, -40.5, -30, 30, 40.5, 51, 61.5, 72];

const sel = ref(Math.max(0, strips.findIndex((s) => s.id === DEFAULT_STRIP)));
const current = computed<Strip>(() => strips[sel.value]);
const chatEl = shallowRef<HTMLElement & Record<string, unknown>>();
const stripEls = ref<HTMLButtonElement[]>([]);
const copied = ref(false);

/* Solid white or solid ink on a chip, whichever reads better (WCAG). */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#16181d';
}
const { isDark } = useData();
const hero = ref<HTMLElement>();

/* A code that the card or a neighbouring strip lies over can't be read, so
   it isn't shown. What overlaps depends on the window size, so ask the
   browser what's on top at each code's corners: on load, on resize, and
   after a strip finishes sliding. */
function hideCoveredCodes() {
  const root = hero.value;
  if (!root) return;
  root.querySelectorAll<HTMLElement>('.fd-chip span, .fd-tab span').forEach((code) => {
    code.style.visibility = '';
    const owner = code.parentElement!;
    // The strip is rotated, so the text runs along that angle: sample its
    // middle and both ends on that line. (The upright bounding box's corners
    // fall outside rotated text and would land on a neighbour.)
    const strip = code.closest<HTMLElement>('.fd-strip')!;
    const angle = (parseFloat(getComputedStyle(strip).getPropertyValue('--a')) || 0) * (Math.PI / 180);
    const r = code.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const half = code.offsetWidth / 2 - 2;
    const points = [0, -half, half].map((d) => [cx + d * Math.cos(angle), cy + d * Math.sin(angle)]);
    const visible = points.every(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return !!top && (top === code || owner.contains(top));
    });
    if (!visible) code.style.visibility = 'hidden';
  });
}
let resizeObserver: ResizeObserver | undefined;

let functionAdapter: ((fn: (m: unknown[], s: AbortSignal) => AsyncIterable<string>) => unknown) | null = null;

function seed(strip: Strip) {
  const now = Date.now();
  return [
    { id: `${strip.id}-q`, role: 'user', content: strip.ask, createdAt: now - 60_000 },
    { id: `${strip.id}-a`, role: 'assistant', content: strip.answer, createdAt: now - 59_000 },
  ];
}

function applyStrip(strip: Strip) {
  const el = chatEl.value;
  if (!el) return;
  for (const [k, v] of Object.entries(strip.theme)) el.style.setProperty(k, v);
  el.messages = seed(strip);
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });

/** A scripted reply, streamed word by word so the demo shows real streaming. */
async function* demoStream(_messages: unknown[], signal: AbortSignal) {
  const strip = current.value;
  const text =
    `This is the scripted demo, so no model is connected here. ` +
    `Install the package and set a transport to talk to a real one. For ${strip.name}:\n\n` +
    strip.answer;
  for (const token of text.match(/\S+\s*|\s+/g) ?? []) {
    if (signal.aborted) return;
    await sleep(22, signal);
    yield token;
  }
}

/* On a phone the strips lie flat in a scrolling row; keep the selected one in
   view (centred) rather than wherever the row happens to start. */
function revealSelected(smooth: boolean) {
  const row = hero.value?.querySelector<HTMLElement>('.fd-fan');
  const strip = stripEls.value[sel.value];
  if (!row || !strip || row.scrollWidth <= row.clientWidth) return;
  const rr = row.getBoundingClientRect();
  const sr = strip.getBoundingClientRect();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  row.scrollBy({ left: sr.left - rr.left - (rr.width - sr.width) / 2, behavior: smooth && !reduce ? 'smooth' : 'auto' });
}

function select(i: number, focus = false) {
  sel.value = (i + strips.length) % strips.length;
  applyStrip(current.value);
  if (focus) nextTick(() => stripEls.value[sel.value]?.focus({ preventScroll: true }));
  nextTick(() => revealSelected(true));
  setTimeout(hideCoveredCodes, 750);
}

function onKey(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
    : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if (e.key === 'Home') { e.preventDefault(); return select(0, true); }
  if (e.key === 'End') { e.preventDefault(); return select(strips.length - 1, true); }
  if (!step) return;
  e.preventDefault();
  select(sel.value + step, true);
}

async function copyInstall() {
  try {
    await navigator.clipboard.writeText('npm i ai-chat-element');
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* clipboard blocked: the command stays visible and selectable */
  }
}

onMounted(async () => {
  const mod = await import('../../../../src/index');
  functionAdapter = mod.functionAdapter as typeof functionAdapter;
  await customElements.whenDefined('ai-chat');
  const el = chatEl.value;
  if (!el || !functionAdapter) return;
  el.transport = functionAdapter(demoStream);
  el.labels = { emptyHeading: 'Ask the demo something' };
  applyStrip(current.value);
  hideCoveredCodes();
  revealSelected(false);
  resizeObserver = new ResizeObserver(hideCoveredCodes);
  if (hero.value) resizeObserver.observe(hero.value);
});

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <section ref="hero" class="fd-hero" aria-labelledby="fd-title">
    <div class="fd-fan" role="radiogroup" aria-label="Show the chat in a framework or with a model">
      <button
        v-for="(strip, i) in strips"
        :key="strip.id"
        ref="stripEls"
        type="button"
        role="radio"
        class="fd-strip"
        :class="[`is-${strip.kind}`, { 'is-out': i === sel }]"
        :style="{ '--a': `${SLOTS[i]}deg` }"
        :aria-checked="i === sel"
        :aria-label="`${strip.name} (${strip.kind})`"
        :tabindex="i === sel ? 0 : -1"
        @click="select(i)"
        @keydown="onKey"
      >
        <span class="fd-tab">
          <b>{{ strip.name }}</b>
          <span>{{ strip.code }}</span>
        </span>
        <span
          v-for="(c, j) in strip.chips"
          :key="c"
          class="fd-chip"
          :style="{ background: c, color: inkOn(c) }"
        ><span v-if="j < 2" aria-hidden="true">{{ c.slice(1) }}</span></span>
      </button>
    </div>

    <div class="fd-card">
      <div class="fd-chat">
        <ai-chat
          ref="chatEl"
          :theme="isDark ? 'dark' : 'light'"
          show-names="false"
          placeholder="Ask the demo something…"
        ></ai-chat>
      </div>
      <div class="fd-label">
        <h1 id="fd-title">One tag. Any framework. Any model.</h1>
        <p class="fd-lede">
          A complete streaming AI chat as a Web Component. Drop it into React, Vue,
          Angular, Svelte or plain HTML and connect it to any model.
        </p>
        <div class="fd-install">
          <button type="button" class="fd-cmd" @click="copyInstall">
            <code>npm i ai-chat-element</code>
            <span class="fd-copy" aria-live="polite">{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
          <a class="fd-go" :href="withBase('/guide/')">Get started</a>
        </div>
        <p class="fd-codes">
          <span>{{ current.code }} {{ current.name }} · scripted demo</span>
          <span class="fd-rivet" aria-hidden="true"></span>
          <span class="fd-accent">--ai-chat-accent: {{ current.theme['--ai-chat-accent'] }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fd-hero {
  /* Exactly one screen: the home page never scrolls on desktop. */
  --h: max(600px, calc(100svh - var(--vp-nav-height)));
  --pivot: 26px;
  --strip-w: clamp(84px, 7.8vw, 112px);
  position: relative;
  height: var(--h);
  overflow: hidden;
  background: var(--fd-ground);
  isolation: isolate;
}

/* ---- the fan ---- */
.fd-fan {
  position: absolute;
  inset: 0;
}
.fd-strip {
  --lift: 0px;
  position: absolute;
  left: 50%;
  bottom: 0;
  width: var(--strip-w);
  height: min(calc(var(--h) - 8px), calc(50vw / 0.96 - 24px));
  margin-left: calc(var(--strip-w) / -2);
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  background: var(--fd-card);
  border-radius: var(--fd-radius);
  overflow: hidden;
  box-shadow: var(--fd-lift);
  transform-origin: 50% calc(100% - var(--pivot));
  transform: rotate(var(--a)) translateY(var(--lift));
  transition: transform 0.7s var(--fd-ease), box-shadow 0.3s ease;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--fd-ink);
}
.fd-strip:hover {
  --lift: -8px;
  box-shadow: var(--fd-lift-high);
}
/* State by form: the turned strip slides out of the deck, and its tab is struck through with a notch. */
.fd-strip.is-out {
  --lift: -12px;
  box-shadow: var(--fd-lift-high);
}
.fd-strip.is-out .fd-tab::after {
  content: '';
  position: absolute;
  right: 10px;
  top: 12px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--fd-ink);
}
.fd-strip:focus-visible {
  outline: 3px solid var(--fd-ink);
  outline-offset: 3px;
}
.fd-tab {
  position: relative;
  flex: none;
  height: 66px;
  padding: 12px 10px 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.fd-tab b {
  font-weight: 800;
  font-stretch: 82%;
  font-size: clamp(12px, 1.1vw, 16px);
  letter-spacing: 0.01em;
  text-transform: uppercase;
  line-height: 1.1;
}
.fd-tab span {
  font: 500 11px/1.2 var(--fd-mono);
  color: var(--fd-ink-3);
}
.fd-chip {
  flex: 1;
  position: relative;
}
.fd-chip span {
  position: absolute;
  left: 9px;
  bottom: 6px;
  font: 600 11px var(--fd-mono);
}

/* ---- the pulled card: the product ---- */
.fd-card {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 18px;
  bottom: 10px;
  width: min(580px, 40vw);
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  background: var(--fd-card);
  border-radius: 12px;
  box-shadow: var(--fd-lift-high);
  overflow: hidden;
}
.fd-chat {
  position: relative;
  flex: 1 1 auto;
  min-height: 180px;
  border-bottom: 1px solid var(--fd-rule);
}
.fd-chat ai-chat {
  position: absolute;
  inset: 0;
  display: block;
  /* The component defaults to min-height: 320px; on a short screen the card decides. */
  min-height: 0;
  --ai-chat-outer-radius: 0;
  --ai-chat-font: var(--fd-font);
  --ai-chat-font-mono: var(--fd-mono);
  transition: opacity 0.2s ease;
}
.fd-label {
  position: relative;
  flex: none;
  padding: clamp(16px, 2.2svh, 22px) 28px 12px;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.4svh, 12px);
}
.fd-label h1 {
  margin: 0;
  font-weight: 850;
  font-stretch: 88%;
  font-size: clamp(28px, min(3.3vw, 4.8svh), 46px);
  line-height: 0.98;
  letter-spacing: -0.025em;
  text-wrap: balance;
  color: var(--fd-ink);
}
.fd-lede {
  margin: 0;
  text-wrap: pretty;
  font-size: 15px;
  line-height: 1.45;
  color: var(--fd-ink-2);
  max-width: 58ch;
}
.fd-install {
  display: flex;
  gap: 10px;
}
.fd-cmd {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 8px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1.5px solid var(--fd-ink);
  border-radius: 8px;
  background: var(--fd-card);
  color: var(--fd-ink);
  font: inherit;
  cursor: copy;
}
.fd-cmd code {
  font: 500 14px var(--fd-mono);
  background: none;
  padding: 0;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fd-copy {
  font: 600 11px var(--fd-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--fd-ground);
}
.fd-go {
  flex: none;
  height: 44px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  background: var(--fd-ink);
  color: var(--fd-card);
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  transition: transform 0.2s var(--fd-ease);
}
.fd-go:hover {
  transform: translateY(-1px);
}
.fd-codes {
  margin: 2px 0 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  font: 600 10px var(--fd-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fd-ink-3);
}
.fd-accent {
  text-align: right;
}
.fd-rivet {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff 0 12%, #c9ccd3 35%, #6c727c 100%);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.4), inset 0 -1px 2px rgb(0 0 0 / 0.25);
}

/* ---- narrow: the deck lies flat as a row of strips above the card ---- */
@media (max-width: 960px) {
  .fd-hero {
    height: auto;
    padding: 16px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .fd-card {
    display: contents;
  }
  .fd-label {
    order: 1;
    background: var(--fd-card);
    border-radius: 12px;
    box-shadow: var(--fd-lift);
  }
  .fd-fan {
    order: 2;
  }
  .fd-chat {
    order: 3;
    background: var(--fd-card);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--fd-lift);
    border-bottom: 0;
  }
  .fd-fan {
    position: static;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px 14px;
    scroll-snap-type: x mandatory;
  }
  .fd-strip {
    position: relative;
    left: auto;
    flex: none;
    width: 104px;
    height: 84px;
    margin: 0;
    transform: none;
    scroll-snap-align: start;
  }
  .fd-strip:hover,
  .fd-strip.is-out {
    transform: translateY(-4px);
  }
  .fd-tab {
    height: 48px;
  }
  .fd-chip span {
    display: none;
  }
  .fd-chat {
    height: 420px;
    flex: none;
  }
  .fd-label {
    padding: 22px 18px 14px;
  }
  .fd-accent {
    display: none;
  }
}

@media (min-width: 961px) and (max-width: 1180px) {
  .fd-install {
    flex-direction: column;
  }
  .fd-go {
    justify-content: center;
  }
}

@media (min-width: 961px) and (max-height: 760px) {
  .fd-lede {
    font-size: 15px;
  }
}

@media (max-width: 420px) {
  .fd-install {
    flex-direction: column;
  }
  .fd-go {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fd-strip,
  .fd-go,
  .fd-chat ai-chat {
    transition: none;
  }
}
</style>
