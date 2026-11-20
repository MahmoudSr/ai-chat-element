<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { useData } from 'vitepress';
import { strips } from '../demo/decks';

/*
 * A live theme editor: every control sets a real attribute or CSS variable on
 * a real <ai-chat>, and the code below shows only what differs from the
 * component's defaults, ready to paste.
 */
const DEFAULTS = { accent: '#4f46e5', radius: 8, fontSize: 15, font: 'system', theme: 'auto', bubble: false };
const FONTS: Record<string, { label: string; value: string }> = {
  system: { label: 'System (default)', value: '' },
  archivo: { label: 'Archivo', value: "'Archivo', sans-serif" },
  serif: { label: 'Georgia', value: 'Georgia, serif' },
  mono: { label: 'Monospace', value: "ui-monospace, 'Cascadia Code', monospace" },
};

const state = reactive({ ...DEFAULTS });
const host = ref<HTMLElement>();
const chat = shallowRef<any>();
const copied = ref(false);
const { isDark } = useData();

/** White or ink text on the accent, whichever reads better (WCAG contrast). */
function accentText(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#16181d';
}

const vars = computed(() => {
  const v: Record<string, string> = {};
  if (state.accent.toLowerCase() !== DEFAULTS.accent) {
    v['--ai-chat-accent'] = state.accent;
    const fg = accentText(state.accent);
    if (fg !== '#ffffff') v['--ai-chat-accent-fg'] = fg;
  }
  if (state.radius !== DEFAULTS.radius) v['--ai-chat-radius'] = `${state.radius}px`;
  if (state.fontSize !== DEFAULTS.fontSize) v['--ai-chat-font-size'] = `${state.fontSize}px`;
  if (state.font !== DEFAULTS.font) v['--ai-chat-font'] = FONTS[state.font].value;
  return v;
});

const attrs = computed(() => {
  const a: string[] = [];
  if (state.theme !== DEFAULTS.theme) a.push(`theme="${state.theme}"`);
  if (state.bubble) a.push('assistant-bubble');
  return a;
});

const code = computed(() => {
  const css = Object.entries(vars.value);
  const tag = `<ai-chat${attrs.value.length ? ' ' + attrs.value.join(' ') : ''}></ai-chat>`;
  if (!css.length) return tag;
  return `${tag}\n\n<style>\n  ai-chat {\n${css.map(([k, v]) => `    ${k}: ${v};`).join('\n')}\n  }\n</style>`;
});

function apply() {
  const el = chat.value;
  if (!el) return;
  for (const k of ['--ai-chat-accent', '--ai-chat-accent-fg', '--ai-chat-radius', '--ai-chat-font-size', '--ai-chat-font']) {
    el.style.removeProperty(k);
  }
  for (const [k, v] of Object.entries(vars.value)) el.style.setProperty(k, v);
  const theme = state.theme === 'auto' ? (isDark.value ? 'dark' : 'light') : state.theme;
  el.setAttribute('theme', theme);
  el.toggleAttribute('assistant-bubble', state.bubble);
}

watch([vars, () => state.theme, () => state.bubble, isDark], apply);

function reset() {
  Object.assign(state, DEFAULTS);
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    /* the code stays visible and selectable */
  }
}

const fence = '```';
let disposed = false;
onMounted(async () => {
  const mod = await import('../../../../src/index');
  await customElements.whenDefined('ai-chat');
  if (disposed || !host.value) return;
  host.value.innerHTML = '<ai-chat show-timestamps="false"></ai-chat>';
  const el = host.value.querySelector('ai-chat') as any;
  el.transport = mod.functionAdapter(async function* () {
    yield 'Every colour, corner and font here comes from the controls on the left.';
  });
  el.messages = [
    { id: 't-u', role: 'user', content: 'Can it match our brand?', createdAt: Date.now() },
    {
      id: 't-a',
      role: 'assistant',
      content: `Yes. One variable recolours it:\n\n- the send button and your bubbles\n- links like [this one](#) and the focus ring\n\n${fence}css\nai-chat { --ai-chat-accent: #0a7a60; }\n${fence}`,
      createdAt: Date.now(),
    },
  ];
  chat.value = el;
  apply();
});
onBeforeUnmount(() => (disposed = true));
</script>

<template>
  <div class="tl">
    <div class="tl-controls">
      <fieldset class="tl-group">
        <legend>Accent</legend>
        <div class="tl-swatches">
          <button
            v-for="s in strips"
            :key="s.id"
            type="button"
            class="tl-swatch"
            :class="{ 'is-on': state.accent.toLowerCase() === s.theme['--ai-chat-accent'].toLowerCase() }"
            :style="{ background: s.theme['--ai-chat-accent'] }"
            :aria-label="`${s.theme['--ai-chat-accent']} accent`"
            :aria-pressed="state.accent.toLowerCase() === s.theme['--ai-chat-accent'].toLowerCase()"
            @click="state.accent = s.theme['--ai-chat-accent']"
          ></button>
        </div>
        <label class="tl-row">
          <span>Any colour</span>
          <input v-model="state.accent" type="color" />
        </label>
      </fieldset>

      <label class="tl-row tl-range">
        <span>Corners <output>{{ state.radius }}px</output></span>
        <input v-model.number="state.radius" type="range" min="0" max="20" step="1" />
      </label>

      <label class="tl-row tl-range">
        <span>Text size <output>{{ state.fontSize }}px</output></span>
        <input v-model.number="state.fontSize" type="range" min="13" max="18" step="1" />
      </label>

      <label class="tl-row">
        <span>Font</span>
        <select v-model="state.font">
          <option v-for="(f, key) in FONTS" :key="key" :value="key">{{ f.label }}</option>
        </select>
      </label>

      <label class="tl-row">
        <span>Theme</span>
        <select v-model="state.theme">
          <option value="auto">Follow the page</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label class="tl-row tl-check">
        <input v-model="state.bubble" type="checkbox" />
        <span>Replies in a bubble</span>
      </label>

      <button type="button" class="tl-reset" @click="reset">Reset</button>
    </div>

    <div class="tl-preview">
      <div ref="host" class="tl-chat"></div>
      <div class="tl-code">
        <pre><code>{{ code }}</code></pre>
        <button type="button" class="tl-copy" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tl {
  display: grid;
  grid-template-columns: 220px 1fr;
  margin: 24px 0 32px;
  border: 1px solid var(--fd-rule-strong);
  border-radius: 12px;
  overflow: hidden;
  background: var(--fd-card);
  box-shadow: var(--fd-lift);
}
.tl-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border-right: 1px solid var(--fd-rule);
  background: var(--fd-ground);
  font-size: 13px;
}
.tl-group {
  margin: 0;
  padding: 0;
  border: 0;
}
.tl-group legend {
  margin-bottom: 8px;
  font-weight: 650;
}
.tl-swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}
.tl-swatch {
  aspect-ratio: 1;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.15s var(--fd-ease);
}
.tl-swatch:hover {
  transform: translateY(-2px);
}
/* Selected by form: a ring, never a different colour. */
.tl-swatch.is-on {
  box-shadow: 0 0 0 2px var(--fd-ground), 0 0 0 4px var(--fd-ink);
}
.tl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 650;
}
.tl-range {
  flex-direction: column;
  align-items: stretch;
}
.tl-range span {
  display: flex;
  justify-content: space-between;
}
.tl-range output {
  font: 500 12px var(--fd-mono);
  color: var(--fd-ink-3);
}
.tl-check {
  justify-content: flex-start;
}
.tl-controls select,
.tl-controls input[type='color'] {
  font: 500 13px var(--fd-font);
  color: var(--fd-ink);
  background: var(--fd-card);
  border: 1px solid var(--fd-rule-strong);
  border-radius: 6px;
  padding: 4px 6px;
}
.tl-controls input[type='color'] {
  width: 44px;
  height: 28px;
  padding: 2px;
}
.tl-controls input[type='range'] {
  accent-color: var(--fd-ink);
}
.tl-reset {
  align-self: flex-start;
  margin-top: auto;
  padding: 6px 10px;
  border: 1px solid var(--fd-rule-strong);
  border-radius: 6px;
  background: var(--fd-card);
  color: var(--fd-ink);
  font: 600 12px var(--fd-font);
  cursor: pointer;
}
.tl-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tl-chat {
  height: 340px;
}
.tl-chat :deep(ai-chat) {
  display: block;
  height: 100%;
  min-height: 0;
  --ai-chat-outer-radius: 0;
}
.tl-code {
  position: relative;
  border-top: 1px solid var(--fd-rule);
  background: #16181d;
}
.tl-code pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  font: 13px/1.6 var(--fd-mono);
  color: #e6e8ee;
}
.tl-code code {
  background: none;
  padding: 0;
  color: inherit;
}
.tl-copy {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border: 1px solid #3a3e48;
  border-radius: 6px;
  background: #16181d;
  color: #e6e8ee;
  font: 600 11px var(--fd-font);
  cursor: pointer;
}
@media (max-width: 760px) {
  .tl {
    grid-template-columns: 1fr;
  }
  .tl-controls {
    border-right: 0;
    border-bottom: 1px solid var(--fd-rule);
  }
}
</style>
