import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/markdown/markdown.ts';

/**
 * Sanitization. This is the one area where a bug is a security hole rather than
 * a glitch: model output is untrusted input rendered as HTML.
 */
describe('markdown sanitization', () => {
  const attacks: Array<[string, string]> = [
    ['script tag', '<script>window.__pwned = 1<\/script>'],
    ['img onerror', '<img src=x onerror="window.__pwned=1">'],
    ['svg onload', '<svg onload="window.__pwned=1"></svg>'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['javascript: link', '[click](javascript:window.__pwned=1)'],
    ['body onload', '<body onload="window.__pwned=1">'],
    ['form action', '<form action="https://evil.example"><input name="x"></form>'],
  ];

  for (const [name, payload] of attacks) {
    it(`neutralizes ${name}`, () => {
      const html = renderMarkdown(payload);
      expect(html.toLowerCase(), name).not.toContain('<script');
      expect(html.toLowerCase(), name).not.toContain('<iframe');
      expect(html.toLowerCase(), name).not.toContain('onerror=');
      expect(html.toLowerCase(), name).not.toContain('onload=');
      expect(html.toLowerCase(), name).not.toContain('javascript:');
    });
  }

  it('actually executes nothing when inserted into the DOM', () => {
    // The real test: sanitized output must be inert once it's live.
    const host = document.createElement('div');
    host.innerHTML = renderMarkdown(attacks.map(([, p]) => p).join('\n\n'));
    document.body.appendChild(host);
    expect((window as unknown as { __pwned?: unknown }).__pwned).toBeUndefined();
    expect(host.querySelectorAll('script, iframe')).toHaveLength(0);
    host.remove();
  });

  it('still renders legitimate markdown', () => {
    const html = renderMarkdown('**bold** and `code` and [link](https://ok.example)');
    expect(html).toContain('<strong>');
    expect(html).toContain('<code>');
    expect(html).toContain('https://ok.example');
  });

  it('labels a fenced block with its own lang, even one hljs cannot highlight', () => {
    // 0.1.1 fix #2: the header used to say "text" for e.g. mermaid.
    const html = renderMarkdown('```mermaid\ngraph TD;\n  A-->B;\n```');
    expect(html).toContain('mermaid');
  });
});
