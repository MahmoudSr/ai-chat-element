/**
 * The public styling and text surface, read from the source at build time:
 * CSS variables (with their defaults), ::part() names, slots, labels (with
 * their default text) and attributes (with their defaults). The docs render
 * these lists instead of retyping them, so they can't drift from the code.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LABELS } from '../../src/labels.ts';

const src = (f: string) => readFileSync(fileURLToPath(new URL(`../../src/${f}`, import.meta.url)), 'utf8');

export interface CssVar { name: string; value: string }
export interface Attribute { name: string; property: string; type: string; default: string }
export interface ApiData {
  cssVars: CssVar[];
  parts: string[];
  slots: string[];
  labels: { key: string; text: string }[];
  attributes: Attribute[];
}

export declare const data: ApiData;

export default {
  watch: ['../../src/styles.ts', '../../src/ai-chat.ts', '../../src/icons.ts', '../../src/labels.ts'],
  load(): ApiData {
    const styles = src('styles.ts');
    const chat = src('ai-chat.ts');
    const icons = src('icons.ts');

    // Every --ai-chat-* declaration in the :host block, with its default value.
    // Some variables are only read with a fallback (var(--x, fallback)); those
    // are listed with that fallback.
    const cssVars = new Map<string, string>();
    for (const m of styles.matchAll(/^\s*(--ai-chat-[a-z-]+):\s*([^;]+);/gm)) {
      if (!cssVars.has(m[1])) cssVars.set(m[1], m[2].replace(/\s+/g, ' ').trim());
    }
    for (const m of styles.matchAll(/var\((--ai-chat-[a-z-]+),\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      if (!cssVars.has(m[1])) cssVars.set(m[1], m[2].trim());
    }
    for (const name of new Set(styles.match(/--ai-chat-[a-z-]+/g) ?? [])) {
      if (!cssVars.has(name)) cssVars.set(name, '');
    }

    const parts = new Set<string>();
    for (const m of chat.matchAll(/part="([a-z0-9 -]+)"/g)) {
      for (const p of m[1].split(/\s+/)) if (p) parts.add(p);
    }
    // Parts built from a value, e.g. part="message message-${m.role}": keep the
    // fixed names, and expand the per-sender one.
    for (const m of chat.matchAll(/part="([^"]*\$\{[^"]*)"/g)) {
      for (const p of m[1].split(/\s+/)) if (p && !p.includes('$')) parts.add(p);
    }
    for (const role of ['user', 'assistant', 'system']) parts.add(`message-${role}`);

    const slots = new Set<string>();
    for (const m of (chat + icons).matchAll(/<slot name="([a-z-]+)"/g)) slots.add(m[1]);

    // @property({...}) followed by the field and its initial value.
    const attributes: Attribute[] = [];
    for (const m of chat.matchAll(/@property\((\{[^)]*\})?\)\s*(?:override\s+)?(\w+)(\??)(?::\s*([^=;]+?))?\s*(?:=\s*([^;]+))?;/g)) {
      const opts = m[1] ?? '';
      if (/attribute:\s*false/.test(opts)) continue;
      const property = m[2];
      const name = opts.match(/attribute:\s*'([a-z-]+)'/)?.[1] ?? property.toLowerCase();
      const type = /type:\s*Boolean/.test(opts) ? 'boolean' : /type:\s*Number/.test(opts) ? 'number' : (m[4]?.trim() || 'string');
      attributes.push({ name, property, type, default: (m[5] ?? '').trim() });
    }

    return {
      cssVars: [...cssVars].map(([name, value]) => ({ name, value })),
      parts: [...parts],
      slots: [...slots],
      labels: Object.entries(DEFAULT_LABELS).map(([key, text]) => ({ key, text: String(text) })),
      attributes,
    };
  },
};
