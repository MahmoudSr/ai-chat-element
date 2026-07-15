import '../src/index.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ChatTransport, StreamChunk } from '../src/types.ts';

/** Mount an <ai-chat> and clean it up after the test. */
export function mount(html = '<ai-chat></ai-chat>'): AiChat {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  const el = host.querySelector('ai-chat') as AiChat;
  cleanup.push(() => host.remove());
  return el;
}

const cleanup: Array<() => void> = [];
export function cleanupAll() {
  while (cleanup.length) cleanup.pop()!();
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Wait until `fn` is truthy, or throw. Beats a fixed sleep. */
export async function until<T>(fn: () => T, timeout = 2000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('until() timed out');
    await tick(10);
  }
}

/**
 * A transport you drive by hand: emit deltas exactly when you choose, so tests
 * can act *mid-stream* (the only way to catch the races that matter).
 */
export function controllable() {
  let push!: (c: StreamChunk) => void;
  let close!: () => void;
  let fail!: (e: Error) => void;
  let started = false;
  const queue: StreamChunk[] = [];
  let notify: (() => void) | null = null;
  let done = false;
  let error: Error | null = null;

  const transport: ChatTransport = {
    async *send(_messages, signal) {
      started = true;
      for (;;) {
        if (error) throw error;
        if (queue.length) { yield queue.shift()!; continue; }
        if (done) return;
        if (signal.aborted) return;
        await new Promise<void>((r) => {
          notify = r;
          signal.addEventListener('abort', () => r(), { once: true });
        });
      }
    },
  };

  push = (c) => { queue.push(c); notify?.(); notify = null; };
  close = () => { done = true; notify?.(); notify = null; };
  fail = (e) => { error = e; notify?.(); notify = null; };

  return {
    transport,
    delta: (t: string) => push({ type: 'delta', delta: t }),
    close,
    fail,
    get started() { return started; },
  };
}

/** Text of every rendered message bubble, in order. */
export function bubbles(el: AiChat): string[] {
  return [...el.shadowRoot!.querySelectorAll('.message')].map(
    (m) => m.querySelector('.bubble')?.textContent?.trim() ?? '',
  );
}
