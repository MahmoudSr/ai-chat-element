import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index.ts';

import styles from '../src/styles.ts?raw';
import chatSource from '../src/ai-chat.ts?raw';
import indexSource from '../src/index.ts?raw';
import openaiSource from '../src/adapters/openai.ts?raw';
import anthropicSource from '../src/adapters/anthropic.ts?raw';
import decks from '../site/.vitepress/theme/demo/decks.ts?raw';

/**
 * The docs site must only name things that exist in the code. Every page under
 * site/ and the home-page demo answers are scanned: CSS variables, imports,
 * events, <ai-chat> attributes and adapter options. Anything the site mentions
 * that the source doesn't have fails here, so a renamed or invented API can't
 * ship in the docs.
 */
const pages = import.meta.glob('../site/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const sources: Record<string, string> = { ...pages, 'site/.vitepress/theme/demo/decks.ts': decks };
const all = Object.entries(sources);

/** Every fenced code block, plus inline code, across the site. */
function codeIn(text: string): string {
  const fences = [...text.matchAll(/```[\w-]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return fences.join('\n');
}

describe('the docs site only names real API', () => {
  it('scans at least the pages we know exist', () => {
    expect(Object.keys(pages).some((p) => p.endsWith('quick-start.md'))).toBe(true);
  });

  it('every --ai-chat-* variable it mentions exists in styles.ts', () => {
    const real = new Set(styles.match(/--ai-chat-[a-z-]+/g) ?? []);
    const bad: string[] = [];
    for (const [file, text] of all) {
      for (const v of text.match(/--ai-chat-[a-z-]+/g) ?? []) if (!real.has(v)) bad.push(`${file}: ${v}`);
    }
    expect(bad).toEqual([]);
  });

  it('every name it imports from the package is exported', () => {
    const typeExports = new Set([...indexSource.matchAll(/\b([A-Z]\w+)\b/g)].map((m) => m[1]));
    const bad: string[] = [];
    for (const [file, text] of all) {
      for (const m of text.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](?:https:\/\/esm\.sh\/)?ai-chat-element[^'"]*['"]/g)) {
        for (const raw of m[1].split(',')) {
          const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0];
          if (!name) continue;
          if (!(name in pkg) && !typeExports.has(name)) bad.push(`${file}: ${name}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every ai-chat event it names is one the element fires', () => {
    const fired = new Set([...chatSource.matchAll(/'ai-chat:([a-z-]+)'/g)].map((m) => m[1]));
    expect(fired.size).toBeGreaterThan(5);
    const bad: string[] = [];
    for (const [file, text] of all) {
      for (const m of text.matchAll(/\bai-chat[:-]([a-z]+(?:-[a-z]+)*)\b/g)) {
        const name = m[1];
        // "ai-chat-element" is the package; --ai-chat-* vars are checked above.
        if (name === 'element' || name.startsWith('element')) continue;
        const before = text.slice(Math.max(0, m.index! - 2), m.index);
        if (before.endsWith('--')) continue;
        if (!fired.has(name)) bad.push(`${file}: ai-chat:${name}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every attribute it puts on <ai-chat> exists', () => {
    const attrs = new Set<string>(['style', 'class', 'id', 'ref', 'slot', 'hidden', 'lang', 'dir']);
    for (const m of chatSource.matchAll(/attribute:\s*'([a-z-]+)'/g)) attrs.add(m[1]);
    // @property({ type: X }) with no attribute name -> the lowercased property name.
    for (const m of chatSource.matchAll(/@property\(\{(?![^}]*attribute)[^}]*\}\)\s*(?:override\s+)?(\w+)/g)) {
      attrs.add(m[1].toLowerCase());
    }
    const bad: string[] = [];
    for (const [file, text] of all) {
      for (const tag of codeIn(text).matchAll(/<ai-chat\b([^>]*)>/g)) {
        // Drop attribute values first, or words inside them read as attributes.
        const names = tag[1].replace(/=\s*("[^"]*"|'[^']*'|\{[^}]*\})/g, ' ');
        for (const a of names.matchAll(/([:@#(\[]?[\w:-]+\)?\]?)(?=[\s=/>]|$)/g)) {
          let name = a[1];
          // Framework bindings: events and refs aren't attributes.
          if (/^[@(#]/.test(name) || name.startsWith('bind:') || name.startsWith('v-') || name.startsWith('on:')) continue;
          name = name.replace(/^:/, '').replace(/^\[|\]$/g, '');
          if (!/^[a-z]/.test(name)) continue;
          if (!attrs.has(name)) bad.push(`${file}: <ai-chat ${name}>`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('every adapter option it passes exists on that adapter', () => {
    const fields = (src: string, iface: string) => {
      const body = src.slice(src.indexOf(`interface ${iface}`));
      const block = body.slice(0, body.indexOf('\n}'));
      return new Set([...block.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]));
    };
    const known: Record<string, Set<string>> = {
      openAIAdapter: fields(openaiSource, 'OpenAIAdapterOptions'),
      anthropicAdapter: fields(anthropicSource, 'AnthropicAdapterOptions'),
    };
    expect(known.openAIAdapter.has('baseURL')).toBe(true);
    expect(known.anthropicAdapter.has('maxTokens')).toBe(true);

    const bad: string[] = [];
    for (const [file, text] of all) {
      for (const m of text.matchAll(/(openAIAdapter|anthropicAdapter)\(\{/g)) {
        // Walk to the matching brace and read the top-level keys.
        let depth = 0;
        let i = m.index! + m[0].length - 1;
        const start = i;
        for (; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}' && --depth === 0) break;
        }
        const obj = text.slice(start + 1, i);
        let d = 0;
        let top = '';
        for (const ch of obj) {
          if (ch === '{' || ch === '[' || ch === '(') d++;
          else if (ch === '}' || ch === ']' || ch === ')') d--;
          else if (d === 0) top += ch;
        }
        for (const k of top.matchAll(/(?:^|[,\n])\s*(\w+)\s*(?=[:,\n]|$)/g)) {
          const key = k[1];
          if (key === '…' || !key) continue;
          if (!known[m[1]].has(key)) bad.push(`${file}: ${m[1]}({ ${key} })`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
