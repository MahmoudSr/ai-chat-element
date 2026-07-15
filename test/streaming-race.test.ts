import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';

/**
 * Races around an in-flight stream.
 *
 * These are the bugs that don't survive manual testing: they need the stream
 * paused mid-flight while something else happens. `controllable()` gives us that.
 */
describe('streaming races', () => {
  afterEach(cleanupAll);

  it('does not leak deltas into a conversation you switched to mid-stream', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;

    // Conversation A: ask, and start receiving.
    el.send('question in conversation A');
    await until(() => c.started);
    c.delta('partial answer for A');
    await tick(30);

    // The consumer switches to conversation B while A is still streaming —
    // exactly what the README's history pattern tells you to do.
    el.messages = [{ id: 'b1', role: 'user', content: 'conversation B', createdAt: Date.now() }];
    await tick(30);

    // The old stream keeps producing. These tokens belong to A, not B.
    c.delta(' ...more A tokens');
    c.close();
    await tick(60);

    const texts = el.messages.map((m) => m.content).join(' | ');
    expect(texts, `conversation B must not contain A's tokens, got: ${texts}`)
      .not.toContain('more A tokens');
  });

  it('new chat mid-stream leaves the next stream stoppable', async () => {
    // Regression guard for the 0.1.1 fix: each send owns its own controller.
    const el = mount();
    const a = controllable();
    el.transport = a.transport;
    el.send('first');
    await until(() => a.started);
    a.delta('streaming...');
    await tick(20);

    el.clear();               // aborts the first stream
    await tick(20);

    const b = controllable();
    el.transport = b.transport;
    el.send('second');
    await until(() => b.started);
    b.delta('second stream');
    await tick(20);

    el.stop();                // must actually stop THIS stream
    await tick(30);

    const streaming = el.messages.some((m) => (m as { streaming?: boolean }).streaming);
    expect(streaming, 'stop() must clear the streaming flag').toBe(false);
  });

  it('does not fire ai-chat:message for an empty reply', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;

    const fired: unknown[] = [];
    el.addEventListener('ai-chat:message', (e) => fired.push((e as CustomEvent).detail));

    el.send('ask');
    await until(() => c.started);
    c.close();                // reply with nothing at all
    await tick(60);

    expect(fired, 'empty replies must not be persisted by consumers').toHaveLength(0);
  });

  it('fires ai-chat:message once for a reply with content', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;

    const fired: unknown[] = [];
    el.addEventListener('ai-chat:message', (e) => fired.push((e as CustomEvent).detail));

    el.send('ask');
    await until(() => c.started);
    c.delta('a real answer');
    c.close();
    await tick(60);

    expect(fired).toHaveLength(1);
  });
});
