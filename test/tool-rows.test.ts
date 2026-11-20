import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupAll, controllable, mount, tick, until } from './helpers.ts';
import type { AiChat } from '../src/ai-chat.ts';
import type { ToolStep } from '../src/types.ts';

/**
 * Tool-call rows: status, name, state and time on one line that opens to the
 * call's input and result; errors visible without opening; a stopped call
 * never spins forever; and an app can render a result itself.
 */

const root = (el: AiChat) => el.shadowRoot!;
const rows = (el: AiChat) => [...root(el).querySelectorAll<HTMLElement>('.tool')];
const header = (el: AiChat, i = 0) => rows(el)[i]?.querySelector<HTMLButtonElement>('.tool__header') ?? null;
const body = (el: AiChat, i = 0) => rows(el)[i]?.querySelector<HTMLElement>('.tool__body') ?? null;
const last = (el: AiChat) => el.messages[el.messages.length - 1];

async function start(attrs = '') {
  const el = mount(`<ai-chat ${attrs}></ai-chat>`);
  const c = controllable();
  el.transport = c.transport;
  el.send('use a tool');
  await until(() => c.started);
  return { el, c };
}

describe('tool-call rows', () => {
  afterEach(cleanupAll);

  it('a running call spins; when it lands it shows Done, its time, and opens to input + result', async () => {
    const { el, c } = await start();
    c.push({ type: 'tool', id: 't1', name: 'get_weather', args: { city: 'Beirut' } });
    await until(() => rows(el).length === 1);
    expect(rows(el)[0].classList.contains('tool--live')).toBe(true);
    expect(header(el)!.textContent).toContain('get_weather');
    expect(header(el)!.textContent).toContain('Running…');
    expect(header(el)!.getAttribute('aria-expanded'), 'collapsed by default').toBe('false');

    c.push({ type: 'tool', id: 't1', output: { tempC: 24, sky: 'clear' } });
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const row = rows(el)[0];
    expect(row.classList.contains('tool--success')).toBe(true);
    expect(row.classList.contains('tool--live')).toBe(false);
    expect(header(el)!.textContent).toContain('Done');
    expect(row.querySelector('.tool__time')!.textContent).toMatch(/^\d+s$/);

    header(el)!.click();
    await el.updateComplete;
    expect(body(el)!.hidden).toBe(false);
    const blocks = [...body(el)!.querySelectorAll('.code-block')];
    expect(blocks.map((b) => b.getAttribute('data-lang'))).toEqual(['json', 'json']);
    expect(blocks[0].querySelector('code')!.textContent).toContain('"city": "Beirut"');
    expect(blocks[1].querySelector('code')!.textContent).toContain('"tempC": 24');
    expect(blocks[1].querySelector('.code-block__copy'), 'result is copyable').not.toBeNull();
  });

  it('a failed call shows its error without being opened', async () => {
    const { el, c } = await start();
    c.push({ type: 'tool', id: 't1', name: 'query_db', args: { sql: 'select 1' } });
    c.push({ type: 'tool', id: 't1', error: 'connection refused (exit 1)' });
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const row = rows(el)[0];
    expect(row.classList.contains('tool--error')).toBe(true);
    expect(header(el)!.textContent).toContain('Failed');
    expect(row.querySelector('.tool__error')!.textContent).toBe('connection refused (exit 1)');
    expect(body(el)!.hidden, 'the error is visible while the row is still closed').toBe(true);
  });

  it('a call cut off by Stop reads "Didn\'t finish" and stops spinning', async () => {
    const { el, c } = await start();
    c.push({ type: 'tool', id: 't1', name: 'long_job', state: 'running' });
    await until(() => rows(el).length === 1);
    el.stop();
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const row = rows(el)[0];
    expect(row.classList.contains('tool--incomplete')).toBe(true);
    expect(row.classList.contains('tool--live')).toBe(false);
    expect(header(el)!.textContent).toContain("Didn't finish");
    expect(last(el).steps![0]).toMatchObject({ state: 'running' }); // display-only; the data is untouched
  });

  it('arguments show live while they stream in, before they parse', async () => {
    const { el, c } = await start('tools="expanded"');
    c.push({ type: 'tool', id: 't1', name: 'search', state: 'pending', argsDelta: '{"query": "lit ' });
    await until(() => body(el)?.querySelector('code'));
    expect(header(el)!.textContent).toContain('Preparing…');
    expect(body(el)!.querySelector('code')!.textContent).toContain('{"query": "lit ');
    c.push({ type: 'tool', id: 't1', argsDelta: 'web components"}' });
    await until(() => body(el)!.querySelector('code')!.textContent!.includes('"query": "lit web components"'));
    c.finish({});
  });

  it('tools="hidden" shows none; tools="expanded" opens them; the reader\'s toggle survives streaming', async () => {
    const a = await start('tools="hidden"');
    a.c.push({ type: 'tool', id: 't1', name: 'secret', output: 1 });
    a.c.delta('Answer.');
    a.c.finish({});
    await until(() => !last(a.el).streaming);
    await a.el.updateComplete;
    expect(rows(a.el)).toHaveLength(0);
    expect(root(a.el).querySelector('.message--assistant .markdown')!.textContent).toContain('Answer.');
    cleanupAll();

    const b = await start();
    b.c.push({ type: 'tool', id: 't1', name: 'search', args: { q: 'x' } });
    await until(() => header(b.el));
    header(b.el)!.click();
    await b.el.updateComplete;
    for (let i = 0; i < 10; i++) b.c.delta(`word${i} `);
    b.c.push({ type: 'tool', id: 't1', output: 'found' });
    await until(() => last(b.el).content.includes('word9'));
    await b.el.updateComplete;
    expect(header(b.el)!.getAttribute('aria-expanded'), 'still open after more tokens').toBe('true');
    b.c.finish({});
  });

  it('rows sit where the calls happened: text, tool, tool, text', async () => {
    const { el, c } = await start();
    c.delta('Looking it up.');
    await until(() => last(el).content === 'Looking it up.');
    c.push({ type: 'tool', id: 'a', name: 'search', output: 1 });
    c.push({ type: 'tool', id: 'b', name: 'fetch', output: 2 });
    c.delta('Here it is.');
    c.finish({});
    await until(() => !last(el).streaming);
    await el.updateComplete;
    const order = [...root(el).querySelector('.message--assistant .message__body')!.children].map((n) =>
      n.classList.contains('tool') ? `tool:${n.getAttribute('data-tool')}` : n.textContent!.trim(),
    );
    expect(order).toEqual(['Looking it up.', 'tool:search', 'tool:fetch', 'Here it is.']);
  });

  it("a row keeps its width while the text around it streams in", async () => {
    // Seen in Chrome: content-sized, the rows grew with each longer line.
    const { el, c } = await start();
    c.delta('Short. ');
    c.push({ type: 'tool', id: 't1', name: 'search', output: 1 });
    await until(() => rows(el).length === 1);
    await el.updateComplete;
    const before = rows(el)[0].getBoundingClientRect().width;
    for (let i = 0; i < 30; i++) c.delta('a much longer line of answer text that keeps going ');
    await until(() => last(el).content.length > 1200);
    await el.updateComplete;
    expect(rows(el)[0].getBoundingClientRect().width).toBe(before);
    c.finish({});
  });

  it('a value containing a code fence stays inside its block', async () => {
    const el = mount();
    el.messages = [{
      id: 'm', role: 'assistant', content: '', createdAt: 0,
      steps: [{ type: 'tool', id: 't', name: 'read_file', state: 'success', at: 0, startedAt: 0, endedAt: 1,
        output: 'line 1\n```\nnot the end\n```\nline 5' }],
    }];
    el.tools = 'expanded';
    await el.updateComplete;
    const blocks = body(el)!.querySelectorAll('.code-block');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].querySelector('code')!.textContent).toContain('not the end');
    expect(blocks[0].querySelector('code')!.textContent).toContain('line 5');
  });

  it('a turn of only tool calls is announced by what it did', async () => {
    const { el, c } = await start();
    const live = root(el).querySelector('[role="status"]')!;
    c.push({ type: 'tool', id: 'a', name: 'deploy', output: 'ok' });
    c.push({ type: 'tool', id: 'b', name: 'notify', error: 'no channel' });
    c.finish({});
    await until(() => live.textContent!.includes('deploy'));
    expect(live.textContent!.trim()).toBe('deploy: Done, notify: Failed');
    expect(root(el).querySelector('.empty-response')).toBeNull();
  });
});

describe('renderTool', () => {
  afterEach(cleanupAll);

  it('replaces the result with the app\'s own element, opens it, and is called per change, not per token', async () => {
    const { el, c } = await start();
    const calls: ToolStep[] = [];
    el.renderTool = (tool) => {
      calls.push(tool);
      if (tool.name !== 'chart' || tool.state !== 'success') return null;
      const div = document.createElement('div');
      div.className = 'my-chart';
      div.textContent = `chart of ${(tool.output as number[]).length} points`;
      return div;
    };
    c.push({ type: 'tool', id: 't1', name: 'chart', state: 'running' });
    c.push({ type: 'tool', id: 't1', output: [1, 2, 3] });
    await until(() => body(el)?.querySelector('.my-chart'));
    const callsAfterResult = calls.length;
    const node = body(el)!.querySelector('.my-chart');
    expect(header(el)!.getAttribute('aria-expanded'), 'a custom result starts open').toBe('true');
    expect(body(el)!.querySelector('[part~="tool-output"] .code-block'), 'no JSON in its place').toBeNull();

    for (let i = 0; i < 25; i++) c.delta(`token${i} `);
    await until(() => last(el).content.includes('token24'));
    await el.updateComplete;
    expect(calls.length, 'tokens around the call never re-run it').toBe(callsAfterResult);
    expect(body(el)!.querySelector('.my-chart'), 'the same element stays in place').toBe(node);
    c.finish({});
  });

  it('a callback that throws falls back to the default JSON', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const el = mount('<ai-chat tools="expanded"></ai-chat>');
    el.renderTool = () => { throw new Error('app bug'); };
    el.messages = [{
      id: 'm', role: 'assistant', content: 'x', createdAt: 0,
      steps: [{ type: 'tool', id: 't', name: 'n', state: 'success', at: 0, startedAt: 0, endedAt: 1, output: { ok: true } }],
    }];
    await el.updateComplete;
    await tick(10);
    expect(body(el)!.querySelector('[part~="tool-output"] code')!.textContent).toContain('"ok": true');
    expect(err).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });
});
