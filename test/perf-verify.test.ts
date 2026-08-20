import { describe, expect, it, afterEach } from 'vitest';
import { cleanupAll, controllable, mount, until } from './helpers.ts';

/** End-to-end: real component, real DOM, real layout — worst frame cost. */
describe('component streaming perf (end to end)', () => {
  afterEach(cleanupAll);

  it('worst token stays inside a frame budget on a large reply', async () => {
    const el: any = mount('<ai-chat></ai-chat>');
    const c = controllable();
    el.transport = c.transport;
    el.send('go');
    await until(() => c.started);

    const para = 'This is a sentence of explanatory prose about the topic at hand. ';
    const block = '\n\n```js\nconst x = compute(value);\nreturn x.map((n) => n * 2);\n```\n\n- point one\n- point two\n\n';
    const full = (para.repeat(6) + block).repeat(120);   // ~58KB
    const step = Math.floor(full.length / 200);

    const samples: number[] = [];
    for (let i = step; i <= full.length; i += step) {
      const t0 = performance.now();
      c.delta(full.slice(i - step, i));
      await el.updateComplete;
      void el.shadowRoot.querySelector('.messages')?.scrollHeight;
      samples.push(performance.now() - t0);
    }
    c.close();

    // The invariant this fix establishes: per-token cost NO LONGER GROWS with
    // the message. An absolute ms threshold would be flaky under CI load; the
    // growth ratio is load-robust because contention hits early and late
    // tokens alike. On the old code the last third of a 58KB reply cost ~4-6x
    // the first third (the whole message re-parsed per token); now both thirds
    // do constant work. The first tokens are excluded as one-time warmup
    // (marked/hljs JIT, first layout) — measured spikes at tokens #0-#7 only.
    // Early window: tokens 10-30, while the message is still small (<9KB) —
    // past warmup, before old-code growth kicks in. Late window: the final 20
    // tokens, when the message is at full size. Wide windows would smear the
    // baseline: by a third of the way in, the old code is ALREADY slow, which
    // once let the old behaviour slip under this assertion (ratio 2.4).
    const p95Of = (xs: number[]) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)];
    const early = p95Of(samples.slice(10, 30));
    const late = p95Of(samples.slice(-20));
    console.log(
      `E2E 58KB: early-third p95=${early.toFixed(2)}ms late-third p95=${late.toFixed(2)}ms ratio=${(late / early).toFixed(2)}`,
    );
    expect(
      late,
      `late tokens (p95 ${late.toFixed(1)}ms) must not cost multiples of early ones (p95 ${early.toFixed(1)}ms) — growth means the whole message is being re-rendered per token again`,
    ).toBeLessThan(Math.max(early * 2.5, early + 2));
  });
});
