import { describe, expect, it } from 'vitest';
import { renderMarkdown, StreamingMarkdown } from '../src/markdown/markdown.ts';

/**
 * The incremental streaming renderer must produce the SAME html as a single
 * full parse. If it ever diverges, a streamed message renders differently from
 * the same message re-rendered after settle — a visible flicker at best, and
 * broken markup at worst.
 *
 * Every case here streams the source one character at a time (the harshest
 * possible token boundaries) and compares the final output to renderMarkdown().
 */
const streamAll = (src: string, chunk = 1) => {
  const sm = new StreamingMarkdown('Copy');
  let out = '';
  for (let i = chunk; i <= src.length; i += chunk) out = sm.render(src.slice(0, i));
  if (src.length % chunk !== 0) out = sm.render(src);
  return out;
};

/**
 * The equivalence contract is what the USER SEES, i.e. the rendered DOM — not
 * the raw HTML string. The one place the strings legitimately differ is
 * whitespace-only text nodes between block elements (e.g. the residue left
 * where DOMPurify strips a `<script>` block): invisible in layout, but enough
 * to fail a byte comparison. Normalize exactly that — drop whitespace-only
 * text nodes, but NEVER inside `<pre>`, where whitespace is meaningful — and
 * require everything else to match exactly.
 */
const domNormalize = (html: string): string => {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (
        child.nodeType === Node.TEXT_NODE &&
        !child.textContent?.trim() &&
        !(node instanceof Element && node.closest('pre'))
      ) {
        child.remove();
      } else {
        walk(child);
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
};

const CASES: Record<string, string> = {
  'plain prose': 'Hello world.\n\nSecond paragraph here.\n\nThird one.',
  'code fence with blank lines inside': [
    'Intro text.',
    '',
    '```js',
    'const a = 1;',
    '',
    'const b = 2;',
    '```',
    '',
    'After the code.',
  ].join('\n'),
  'unterminated fence (still typing)': 'Text.\n\n```py\nprint("hi")\n\nprint("more")',
  'tilde fence': 'A.\n\n~~~\nraw\n\ntext\n~~~\n\nB.',
  'nested-looking fence inside fence': 'X.\n\n````md\n```js\nlet q = 1;\n```\n````\n\nY.',
  'table': 'Before.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\nAfter.',
  'list then code': '- one\n- two\n\n```bash\necho hi\n```\n\ndone',
  'blockquote': '> quoted line\n> more quote\n\nplain again',
  'headings': '# H1\n\nsome text\n\n## H2\n\nmore text',
  'consecutive blank lines': 'A.\n\n\n\nB.\n\n\nC.',
  'trailing blank line': 'Only paragraph.\n\n',
  'no blank lines at all': 'One single long paragraph that never breaks anywhere at all.',
  'crlf line endings': 'A.\r\n\r\n```js\r\nlet x = 1;\r\n```\r\n\r\nB.',
  'html-ish content (sanitizer path)': 'Text.\n\n<script>alert(1)</script>\n\nMore.',
  'inline code with backticks': 'Use `const x = 1` here.\n\nAnd ``a ` b`` too.',
};

describe('StreamingMarkdown equivalence', () => {
  for (const [name, src] of Object.entries(CASES)) {
    it(`matches a full parse: ${name}`, () => {
      const expected = domNormalize(renderMarkdown(src, 'Copy'));
      expect(domNormalize(streamAll(src, 1)), 'char-by-char streaming').toBe(expected);
      expect(domNormalize(streamAll(src, 3)), '3-char chunks').toBe(expected);
      expect(domNormalize(streamAll(src, 17)), '17-char chunks').toBe(expected);
    });
  }

  it('never splits a fenced block across the cache boundary', () => {
    // The dangerous case: a blank line INSIDE a fence. Cutting there would
    // render half a fence as prose and lose highlighting.
    const src = '```js\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter.';
    const out = streamAll(src, 1);
    expect(domNormalize(out)).toBe(domNormalize(renderMarkdown(src, 'Copy')));
    // Exactly one code block, not two fragments.
    expect(out.match(/class="code-block"/g) ?? []).toHaveLength(1);
  });

  it('recovers when the source is rewritten rather than appended', () => {
    const sm = new StreamingMarkdown('Copy');
    sm.render('First message.\n\nWith a second block.');
    // A retry reuses the element: content is REPLACED, not extended.
    const next = 'Totally different.\n\nOther content.';
    expect(domNormalize(sm.render(next))).toBe(domNormalize(renderMarkdown(next, 'Copy')));
  });

  it('is dramatically cheaper than re-parsing, and does not grow with length', () => {
    const block = '\n\n```js\nconst x = compute(v);\nreturn x.map((n) => n * 2);\n```\n\n- a\n- b\n\n';
    const full = ('Prose sentence here. '.repeat(6) + block).repeat(60);
    const step = Math.floor(full.length / 150);

    const worst = (fn: (s: string) => void) => {
      let max = 0;
      for (let n = step; n <= full.length; n += step) {
        const t0 = performance.now();
        fn(full.slice(0, n));
        max = Math.max(max, performance.now() - t0);
      }
      return max;
    };

    const before = worst((s) => { renderMarkdown(s, 'Copy'); });
    const sm = new StreamingMarkdown('Copy');
    const after = worst((s) => { sm.render(s); });

    // The metric that matters is the WORST frame, not the average.
    expect(after, `worst frame ${after.toFixed(1)}ms should be well under ${before.toFixed(1)}ms`)
      .toBeLessThan(before / 3);
  });
});
