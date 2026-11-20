import { afterEach, expect, test } from 'vitest';
import { cleanupAll, mount, until } from './helpers';

afterEach(cleanupAll);

/*
 * Code blocks are dark in every theme (--ai-chat-code-bg: #0d1117), but the
 * syntax colours used to switch to GitHub's LIGHT palette whenever the OS was
 * in light mode: dark-blue strings and dark-red keywords on a near-black block,
 * about 1.3:1. Token colours must follow the code block, not the OS.
 */

function rgb(c: string): number[] {
  const m = c.match(/[\d.]+/g)!.map(Number);
  return m.slice(0, 3);
}
function lum([r, g, b]: number[]): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: string, b: string): number {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const SOURCE = [
  '```js',
  "import { openAIAdapter } from 'ai-chat-element';",
  'const retries = 3; // try again',
  'function connect() { return true; }',
  '```',
].join('\n');

async function tokens(html: string) {
  const el = mount(html);
  el.messages = [{ id: 'a', role: 'assistant', content: SOURCE, createdAt: 1 }];
  await el.updateComplete;
  const root = el.shadowRoot!;
  const pre = await until(() => root.querySelector<HTMLElement>('.code-block pre, pre'));
  const block = pre.closest<HTMLElement>('.code-block') ?? pre;
  const bg = getComputedStyle(block).backgroundColor;
  const spans = [...pre.querySelectorAll<HTMLElement>('[class^="hljs-"]')];
  expect(spans.length).toBeGreaterThan(3); // highlighting really ran
  return spans.map((s) => ({
    cls: s.className,
    ratio: contrast(getComputedStyle(s).color, bg),
  }));
}

test('precondition: the test browser reports a light OS scheme', () => {
  // The bug only shows under a light OS; if this ever flips, the next test
  // would pass without proving anything.
  expect(matchMedia('(prefers-color-scheme: light)').matches).toBe(true);
});

test('syntax colours stay readable on the code block under a light OS', async () => {
  for (const t of await tokens('<ai-chat></ai-chat>')) {
    expect(t.ratio, `${t.cls} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});

test('and with theme="light" forced', async () => {
  for (const t of await tokens('<ai-chat theme="light"></ai-chat>')) {
    expect(t.ratio, `${t.cls} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});

test('and with theme="dark" forced', async () => {
  for (const t of await tokens('<ai-chat theme="dark"></ai-chat>')) {
    expect(t.ratio, `${t.cls} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});
