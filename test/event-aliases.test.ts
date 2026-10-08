import { afterEach, describe, expect, it } from 'vitest';
import { cleanupAll, controllable, mount, until } from './helpers.ts';

/**
 * Angular can't bind `(ai-chat:message)` in a template — it reads the colon as a
 * global target — so every event is also fired with a dash.
 */
describe('dash-named event aliases', () => {
  afterEach(cleanupAll);

  it('fires ai-chat-* with the same detail as ai-chat:*', async () => {
    const el = mount();
    const c = controllable();
    el.transport = c.transport;
    const colon: unknown[] = [];
    const dash: unknown[] = [];
    el.addEventListener('ai-chat:submit', (e) => colon.push((e as CustomEvent).detail));
    el.addEventListener('ai-chat-submit', (e) => dash.push((e as CustomEvent).detail));
    const sent = el.send('hello');
    await until(() => c.started);
    c.delta('hi');
    c.close();
    await sent;
    expect(dash.length).toBe(1);
    expect(dash[0]).toBe(colon[0]);
  });

  it('cancelling the dash form cancels the event (new-chat keeps the conversation)', async () => {
    const el = mount('<ai-chat show-clear></ai-chat>');
    el.messages = [{ id: 'a', role: 'user', content: 'keep me', createdAt: 0 }];
    await el.updateComplete;
    el.addEventListener('ai-chat-new-chat', (e) => e.preventDefault());
    const button = el.shadowRoot!.querySelector('[part~="clear-button"]') as HTMLButtonElement;
    button.click();
    await el.updateComplete;
    expect(el.messages.length).toBe(1);
  });
});
