import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index.ts';

import styles from '../src/styles.ts?raw';
import chatSource from '../src/ai-chat.ts?raw';
import indexSource from '../src/index.ts?raw';
import openaiSource from '../src/adapters/openai.ts?raw';
import anthropicSource from '../src/adapters/anthropic.ts?raw';
import decks from '../site/.vitepress/theme/demo/decks.ts?raw';
import scenarioSource from '../site/.vitepress/theme/demo/scenarios.ts?raw';
import iconsSource from '../src/icons.ts?raw';
import {
  slotDescriptions,
  cssVarDescriptions,
  attributeDescriptions,
  propertyDescriptions,
  methodDescriptions,
  eventDescriptions,
} from '../site/reference/descriptions.ts';
import { extractApi } from '../site/reference/extract.ts';
import { cssVarGroups } from '../site/reference/groups.ts';
import { DEFAULT_LABELS } from '../src/labels.ts';

/**
 * The docs site must only name things that exist in the code. Every page under
 * site/ and the home-page demo answers are scanned: CSS variables, imports,
 * events, <ai-chat> attributes and adapter options. Anything the site mentions
 * that the source doesn't have fails here, so a renamed or invented API can't
 * ship in the docs.
 */
const pages = import.meta.glob('../site/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const sources: Record<string, string> = {
  ...pages,
  'site/.vitepress/theme/demo/decks.ts': decks,
  'site/.vitepress/theme/demo/scenarios.ts': scenarioSource,
};
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
        // ai-chat:not(...) and friends are CSS pseudo-classes, not events.
        if (text[m.index! + m[0].length] === '(') continue;
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
    // The live demos build their <ai-chat> from each scenario's attrs string.
    const demoTags = [...scenarioSource.matchAll(/attrs:\s*'([^']*)'/g)].map((m) => `<ai-chat ${m[1]}>`);
    expect(demoTags.length).toBeGreaterThan(2);
    const tagSources: Array<[string, string]> = [
      ...all.map(([f, t]) => [f, codeIn(t)] as [string, string]),
      ['scenarios.ts attrs', demoTags.join('\n')],
    ];
    for (const [file, text] of tagSources) {
      for (const tag of text.matchAll(/<ai-chat\b([^>]*)>/g)) {
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

  describe('the generated reference is fully described', () => {
    const api = extractApi({
      styles,
      chat: chatSource,
      icons: iconsSource,
      labels: DEFAULT_LABELS as unknown as Record<string, string>,
    });

    // The counts the README and notes quote, so the extractor can't silently
    // start missing things (a regex that stops early lists fewer, not none).
    it('extracts everything the source declares', () => {
      expect(api.cssVars.length).toBe(new Set(styles.match(/--ai-chat-[a-z-]+/g)).size);
      expect(api.attributes.length + api.properties.length).toBe(chatSource.match(/@property\(/g)!.length);
      expect(api.slots.length).toBe(new Set([...(chatSource + iconsSource).matchAll(/<slot name="([a-z-]+)"/g)].map((m) => m[1])).size);
      expect(api.methods.map((m) => m.name).sort()).toEqual(
        ['addMessage', 'clear', 'isGenerating', 'openFilePicker', 'prependMessages', 'retry', 'send', 'stop'],
      );
    });

    // Each listed default must be a real declaration (or var() fallback) of
    // that variable, never text from a comment. A comment in styles.ts quotes
    // "--ai-chat-focus-width: 3px, a different hue is ..." and the reference
    // once showed that sentence, plus the next declaration, as the default.
    it('every CSS variable default is a real declaration, not comment text', () => {
      const code = styles.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
      const bad = api.cssVars
        .filter((v) => {
          if (!v.value || /\/\*|\*\//.test(v.value)) return true;
          const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return !new RegExp(`${esc(v.name)}: ${esc(v.value)};|var\\(${esc(v.name)}, ${esc(v.value)}\\)`).test(code);
        })
        .map((v) => `${v.name} = ${v.value}`);
      expect(bad).toEqual([]);
      expect(api.cssVars.find((v) => v.name === '--ai-chat-focus-width')?.value).toBe('2px');
    });

    // The CSS variables page shows them by group, so a variable missing from
    // the groups would vanish from the page, and one in two groups would show twice.
    it('every CSS variable is in exactly one group on the reference page', () => {
      const placed = Object.values(cssVarGroups).flat().map((v) => `--ai-chat-${v}`);
      const real = api.cssVars.map((v) => v.name);
      expect(real.filter((n) => !placed.includes(n)), 'not in any group').toEqual([]);
      expect(placed.filter((n) => !real.includes(n)), 'grouped but not a real variable').toEqual([]);
      expect(placed.filter((n, i) => placed.indexOf(n) !== i), 'in two groups').toEqual([]);
    });

    const check = (label: string, names: string[], described: Record<string, unknown>) => {
      const have = new Set(Object.keys(described));
      const real = new Set(names);
      expect(names.filter((n) => !have.has(n)), `${label} without a description`).toEqual([]);
      expect([...have].filter((n) => !real.has(n)), `${label} descriptions for things that don't exist`).toEqual([]);
    };
    it('slots', () => check('slots', api.slots, slotDescriptions));
    it('CSS variables', () => check('vars', api.cssVars.map((v) => v.name), cssVarDescriptions));
    it('attributes', () => check('attributes', api.attributes.map((a) => a.name), attributeDescriptions));
    // imageHosts is an attribute, but its array form is documented as a property too.
    it('properties', () => check('properties', [...api.properties.map((p) => p.name), 'imageHosts'], propertyDescriptions));
    it('methods', () => check('methods', api.methods.map((m) => m.name), methodDescriptions));
    it('events', () => check('events', api.events, eventDescriptions));
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

describe('the docs site is findable', () => {
  /** The frontmatter description: what search results and link previews show. */
  const descriptionOf = (src: string) => {
    const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const line = fm?.[1].match(/^description: (".*")$/m);
    return line ? (JSON.parse(line[1]) as string) : undefined;
  };

  it('every page has its own description, sized for a search result', () => {
    const bad: string[] = [];
    const seen = new Map<string, string>();
    for (const [file, src] of Object.entries(pages)) {
      const d = descriptionOf(src);
      if (!d) bad.push(`${file}: no description`);
      else if (d.length < 70 || d.length > 160) bad.push(`${file}: ${d.length} chars`);
      else if (seen.has(d)) bad.push(`${file}: same description as ${seen.get(d)}`);
      else seen.set(d, file);
    }
    expect(bad).toEqual([]);
  });
});
