import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, until } from './helpers.ts';
import type { ChatMessage } from '../src/types.ts';

/**
 * #8 (0.2.0) — when a transport reports finishReason / usage on its `done`
 * chunk, the component must stash them on the settled assistant message and
 * hand them to consumers on `ai-chat:message`. Goes RED on the pre-0.2.0
 * component, which ignored everything on the done chunk but `type`.
 */
describe('finishReason / usage surfaced on the settled turn', () => {
  afterEach(cleanupAll);

  it('carries finishReason + usage on the ai-chat:message detail', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;

    let received: ChatMessage | undefined;
    el.addEventListener('ai-chat:message', (e) => {
      received = (e as CustomEvent).detail.message;
    });

    el.send('hi'); // don't await: send() resolves only after the stream ends
    await until(() => c.started);
    c.delta('the answer');
    c.finish({
      finishReason: 'length',
      rawFinishReason: 'max_tokens',
      usage: { inputTokens: 12, outputTokens: 34 },
    });

    await until(() => received);
    expect(received!.content).toBe('the answer');
    expect(received!.finishReason).toBe('length');
    expect(received!.usage).toEqual({ inputTokens: 12, outputTokens: 34 });

    // Also stashed on the live message in the component's state.
    const settled = el.messages.find((m) => m.role === 'assistant');
    expect(settled!.finishReason).toBe('length');
    expect(settled!.usage).toEqual({ inputTokens: 12, outputTokens: 34 });
  });

  it('leaves the fields undefined when the transport reports nothing', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;

    let received: ChatMessage | undefined;
    el.addEventListener('ai-chat:message', (e) => {
      received = (e as CustomEvent).detail.message;
    });

    el.send('hi'); // don't await: send() resolves only after the stream ends
    await until(() => c.started);
    c.delta('plain reply');
    c.close(); // bare done, no metadata

    await until(() => received);
    expect(received!.finishReason).toBeUndefined();
    expect(received!.usage).toBeUndefined();
  });
});
