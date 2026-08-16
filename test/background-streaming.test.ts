import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';

type BgDetail = {
  conversationId: string | null;
  message: { id: string; role: string; content: string };
  done: boolean;
};

const detailsOf = (events: Event[]): BgDetail[] =>
  events.map((e) => (e as CustomEvent).detail as BgDetail);

/**
 * Background streaming on conversation switch — ON BY DEFAULT.
 *
 * The defect this closes: `clear()` called `stop()`, which ABORTED an in-flight
 * request, and a `.messages` swap orphaned the streaming message so its deltas
 * landed nowhere. Either way the consumer silently lost a reply they paid for.
 *
 * Every real chat app keeps generating when you switch conversations, so that is
 * the default here too: the request is detached rather than aborted and its
 * deltas are re-routed to `ai-chat:background-message`, tagged with the
 * `conversation-id` that was active when the send started. `abort-on-switch`
 * restores the old kill-it-immediately behaviour.
 */
describe('background streaming', () => {
  afterEach(cleanupAll);

  it('keeps an orphaned stream alive and routes its deltas to ai-chat:background-message', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('question in conversation A');
    await until(() => c.started);
    c.delta('partial A');
    await tick(30);

    // Consumer switches to conversation B mid-stream.
    el.conversationId = 'conv-b';
    el.messages = [
      { id: 'b1', role: 'user', content: 'conversation B', createdAt: Date.now() },
    ];
    await tick(30);

    // The detached request MUST still be running — the whole point of the fix.
    c.delta(' plus more A');
    c.close();
    await tick(60);

    expect(bg.length, 'the orphaned stream must report progress').toBeGreaterThan(0);

    const settled = detailsOf(bg).filter((d) => d.done);
    expect(settled, 'exactly one settle event per background stream').toHaveLength(1);
    expect(
      settled[0].message.content,
      'the background reply must carry the WHOLE answer, including tokens that arrived after the switch',
    ).toBe('partial A plus more A');
    expect(
      settled[0].conversationId,
      'tagged with the conversation that was active when the send started',
    ).toBe('conv-a');
  });

  it('does not leak background deltas into the visible conversation', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    el.send('question in A');
    await until(() => c.started);
    c.delta('A tokens');
    await tick(30);

    el.conversationId = 'conv-b';
    el.messages = [
      { id: 'b1', role: 'user', content: 'conversation B', createdAt: Date.now() },
    ];
    await tick(30);

    c.delta(' MORE-A-TOKENS');
    c.close();
    await tick(60);

    const visible = el.messages.map((m) => m.content).join(' | ');
    expect(visible, `B must stay clean, got: ${visible}`).not.toContain('MORE-A-TOKENS');
    // And the widget must not be stuck busy — a detached stream is not OUR stream.
    expect(
      el.shadowRoot!.querySelector('button[part="stop-button"]'),
      'the visible conversation must be idle after the switch',
    ).toBeNull();
  });

  it('emits per-token progress events with done:false before the settle event', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('ask');
    await until(() => c.started);
    c.delta('one');
    await tick(20);

    el.messages = [];
    await tick(20);

    c.delta(' two');
    await tick(20);
    c.delta(' three');
    await tick(20);

    const progress = detailsOf(bg).filter((d) => !d.done);
    expect(
      progress.length,
      'each delta after the switch should report progress',
    ).toBeGreaterThanOrEqual(2);
    expect(progress[progress.length - 1].message.content).toContain('three');

    c.close();
    await tick(60);
    expect(detailsOf(bg).filter((d) => d.done)).toHaveLength(1);
  });

  it('new-chat mid-stream detaches instead of aborting', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('first');
    await until(() => c.started);
    c.delta('half an answer');
    await tick(30);

    el.clear();
    await tick(30);

    // Old behaviour aborted here and this delta would be swallowed.
    c.delta(' and the rest');
    c.close();
    await tick(60);

    const settled = detailsOf(bg).filter((d) => d.done);
    expect(settled, 'New-chat must not discard the running reply').toHaveLength(1);
    expect(settled[0].message.content).toBe('half an answer and the rest');
    expect(el.messages, 'the new chat itself starts empty').toHaveLength(0);
  });

  it('abort-on-switch opts back into the old kill-it-immediately behaviour', async () => {
    const el = mount('<ai-chat abort-on-switch conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('first');
    await until(() => c.started);
    c.delta('half');
    await tick(30);

    el.clear();
    await tick(30);
    c.delta(' rest');
    c.close();
    await tick(60);

    expect(bg, 'opted out: the stream is aborted, nothing is reported').toHaveLength(0);
  });

  it('an explicit stop() aborts rather than detaching', async () => {
    // Stop is the user saying "I do not want this reply" — that must still kill
    // it. Only an implicit orphaning (switch / new-chat) detaches.
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('ask');
    await until(() => c.started);
    c.delta('some tokens');
    await tick(30);

    el.stop();
    await tick(30);
    c.delta(' should never arrive');
    c.close();
    await tick(60);

    expect(bg, 'stop() means stop, not detach').toHaveLength(0);
    const streaming = el.messages.some((m) => (m as { streaming?: boolean }).streaming);
    expect(streaming).toBe(false);
  });

  it('a background stream that errors still settles with the error', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    const bg: Event[] = [];
    el.addEventListener('ai-chat:background-message', (e) => bg.push(e));

    el.send('ask');
    await until(() => c.started);
    c.delta('partial');
    await tick(20);

    el.messages = [];
    await tick(20);

    c.fail(new Error('upstream exploded'));
    await tick(60);

    const settled = detailsOf(bg).filter((d) => d.done);
    expect(settled, 'a failed background stream must still settle').toHaveLength(1);
    expect(
      (settled[0].message as { error?: string }).error,
      'the consumer needs to know it failed',
    ).toContain('upstream exploded');
  });

  it('switching BACK to a generating conversation shows it still streaming live', async () => {
    // The behaviour that matters: leave a conversation mid-reply, come back, and
    // the answer is still arriving in the chat — not frozen, not missing.
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    el.send('question in A');
    await until(() => c.started);
    c.delta('first half');
    await tick(30);

    const snapshotOfA = [...el.messages];

    // Switch away to B...
    el.conversationId = 'conv-b';
    el.messages = [];
    await tick(30);

    // ...tokens keep arriving for A while we're not looking...
    c.delta(' second half');
    await tick(30);

    // ...and now switch BACK to A, restoring the snapshot the consumer stored.
    el.conversationId = 'conv-a';
    el.messages = snapshotOfA;
    await tick(30);

    const visible = el.messages.map((m) => m.content).join(' ');
    expect(
      visible,
      'the reply must be caught up to everything that arrived while we were away',
    ).toContain('first half second half');

    const live = el.messages.find((m) => m.role === 'assistant');
    expect(live?.streaming, 'and it must still be marked as streaming').toBe(true);

    // Still LIVE: a token sent now must land in the visible conversation.
    c.delta(' third part');
    await tick(40);
    expect(
      el.messages.map((m) => m.content).join(' '),
      'tokens arriving after the switch back must render',
    ).toContain('third part');

    c.close();
    await tick(60);
    expect(
      el.messages.find((m) => m.role === 'assistant')?.streaming,
      'and it settles normally once finished',
    ).toBeFalsy();
  });

  it('re-arms the stop button when you return to a generating conversation', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    el.send('ask');
    await until(() => c.started);
    c.delta('working on it');
    await tick(30);
    const snapshot = [...el.messages];

    el.conversationId = 'conv-b';
    el.messages = [];
    await tick(30);
    expect(
      el.shadowRoot!.querySelector('button[part="stop-button"]'),
      'the OTHER conversation is idle',
    ).toBeNull();

    el.conversationId = 'conv-a';
    el.messages = snapshot;
    await tick(30);
    expect(
      el.shadowRoot!.querySelector('button[part="stop-button"]'),
      'back on the generating conversation, Stop must be available again',
    ).not.toBeNull();

    // And stopping it really does stop it.
    el.stop();
    await tick(30);
    c.delta(' should not arrive');
    await tick(40);
    expect(el.messages.map((m) => m.content).join(' ')).not.toContain('should not arrive');
    expect(
      (el as unknown as { isGenerating(id: string): boolean }).isGenerating('conv-a'),
      'an explicitly stopped stream is no longer generating',
    ).toBe(false);
  });

  it('isGenerating() reports which conversations are still streaming', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;
    const gen = (id: string) =>
      (el as unknown as { isGenerating(id: string): boolean }).isGenerating(id);

    el.send('ask');
    await until(() => c.started);
    c.delta('partial');
    await tick(20);

    expect(gen('conv-a'), 'not detached yet — it is the visible conversation').toBe(false);

    el.conversationId = 'conv-b';
    el.messages = [];
    await tick(20);
    c.delta(' more');
    await tick(40);

    expect(gen('conv-a'), 'A is generating in the background').toBe(true);
    expect(gen('conv-b'), 'B is not').toBe(false);

    c.close();
    await tick(60);
    expect(gen('conv-a'), 'settled streams are cleared from the registry').toBe(false);
  });

  it('disconnecting the element aborts detached streams (no leaks)', async () => {
    const el = mount('<ai-chat conversation-id="conv-a"></ai-chat>');
    const c = controllable();
    el.transport = c.transport;

    el.send('ask');
    await until(() => c.started);
    c.delta('partial');
    await tick(20);

    el.messages = [];
    await tick(20);

    el.remove();
    await tick(30);

    expect(
      (el as unknown as { _detached: Map<string, unknown> })._detached.size,
      'a removed element must not keep requests running',
    ).toBe(0);
  });
});
