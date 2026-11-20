<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useData } from 'vitepress';
import { scenarios } from '../demo/scenarios';

/*
 * A live <ai-chat> on a docs page, driven by a scripted transport. The demo
 * plays its question on load; "Play again" clears and replays it, and the
 * reader can type their own message. The event line shows what the page's
 * app received, the way a real consumer would see it.
 */
const props = defineProps<{ scenario: string; height?: number }>();
const s = scenarios[props.scenario];
if (!s) throw new Error(`LiveDemo: unknown scenario "${props.scenario}"`);

const host = ref<HTMLElement>();
const chat = shallowRef<any>();
const lastEvent = ref('');
const { isDark } = useData();
let disposed = false;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const ctx = { log: (text: string) => (lastEvent.value = text) };

function play() {
  const el = chat.value;
  if (!el) return;
  lastEvent.value = '';
  if (s.play) return s.play(el, ctx);
  el.stop?.();
  el.messages = [];
  if (s.ask) void el.send(s.ask);
}

function summarize(name: string, detail: any): string {
  if (!detail) return name;
  if (name.endsWith('message-action')) return `${name}  actionId: "${detail.actionId}"`;
  if (name.endsWith('message-edit')) return `${name}  index: ${detail.index}, newContent: "${detail.newContent}"`;
  if (name.endsWith('attach-rejected')) return `${name}  reason: "${detail.reason}"`;
  if (name.endsWith('attach')) return `${name}  ${detail.attachments?.length ?? 0} file(s)`;
  if (name.endsWith('submit')) return `${name}  ${detail.attachments?.length ?? 0} attachment(s)`;
  return name;
}

onMounted(async () => {
  const mod = await import('../../../../src/index');
  await customElements.whenDefined('ai-chat');
  if (disposed || !host.value) return;

  // Attributes go in as real HTML, exactly as a page would write them.
  host.value.innerHTML = `<ai-chat ${s.attrs}>${s.slot ?? ''}</ai-chat>`;
  const el = host.value.querySelector('ai-chat') as any;
  el.setAttribute('theme', isDark.value ? 'dark' : 'light');
  el.transport = mod.functionAdapter((messages: any, signal: AbortSignal) =>
    s.reply(messages, (ms) => (signal.aborted ? Promise.resolve() : wait(ms))),
  );
  if (s.messageActions) el.messageActions = () => s.messageActions;
  for (const name of s.events ?? []) {
    el.addEventListener(name, (e: CustomEvent) => {
      lastEvent.value = summarize(name, e.detail);
      s.onEvent?.(name, e.detail, el);
    });
  }
  chat.value = el;
  s.setup?.(el, ctx);
  play();
});

watch(isDark, (dark) => chat.value?.setAttribute('theme', dark ? 'dark' : 'light'));

onBeforeUnmount(() => {
  disposed = true;
  chat.value?.stop?.();
});
</script>

<template>
  <figure class="ld" :style="{ '--ld-h': `${height ?? 440}px` }">
    <div ref="host" class="ld-chat" :data-theme="isDark ? 'dark' : 'light'"></div>
    <figcaption class="ld-bar">
      <span class="ld-note">Scripted demo · no model connected</span>
      <span v-if="s.events" class="ld-event" aria-live="polite">
        <template v-if="lastEvent">{{ lastEvent }}</template>
        <template v-else>Events: {{ s.events.join(', ') }}</template>
      </span>
      <button type="button" class="ld-play" @click="play">Play again</button>
    </figcaption>
  </figure>
</template>

<style scoped>
.ld {
  margin: 24px 0 32px;
  border: 1px solid var(--fd-rule-strong);
  border-radius: 12px;
  overflow: hidden;
  background: var(--fd-card);
  box-shadow: var(--fd-lift);
}
.ld-chat {
  height: var(--ld-h);
}
.ld-chat :deep(ai-chat) {
  display: block;
  height: 100%;
  min-height: 0;
  --ai-chat-outer-radius: 0;
  --ai-chat-font: var(--fd-font);
  --ai-chat-font-mono: var(--fd-mono);
}
.ld-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border-top: 1px solid var(--fd-rule);
  background: var(--fd-ground);
  font: 500 11px/1.4 var(--fd-mono);
  color: var(--fd-ink-3);
}
.ld-note {
  flex: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ld-event {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--fd-ink-2);
}
.ld-play {
  flex: none;
  margin-left: auto;
  padding: 6px 10px;
  border: 1px solid var(--fd-rule-strong);
  border-radius: 6px;
  background: var(--fd-card);
  color: var(--fd-ink);
  font: 600 12px var(--fd-font);
  cursor: pointer;
}
.ld-play:hover {
  border-color: var(--fd-ink-3);
}
@media (max-width: 640px) {
  .ld-note {
    display: none;
  }
}
</style>
