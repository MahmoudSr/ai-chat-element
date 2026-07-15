import { describe, expect, it } from 'vitest';
import * as pkg from '../src/index.ts';
import * as adapters from '../src/adapters/index.ts';

// Vite inlines these at build time, so the docs are readable from the browser.
import readme from '../README.md?raw';
import aiUsage from '../AI_USAGE.md?raw';
import styles from '../src/styles.ts?raw';
import chatSource from '../src/ai-chat.ts?raw';
import { DEFAULT_LABELS } from '../src/labels.ts';

/**
 * Contract tests: the docs are hand-maintained, so make the machine check them.
 *
 * `ChatLabels` was documented as public but not exported for two releases;
 * `--ai-chat-new-chat-radius` and the `header-slot` part shipped undocumented.
 * All three classes of mistake are caught here.
 */
describe('public API', () => {
  it('exports everything the docs tell people to import', () => {
    for (const name of ['AiChat', 'openAIAdapter', 'anthropicAdapter', 'functionAdapter']) {
      expect(pkg, `${name} is documented but not exported`).toHaveProperty(name);
    }
    for (const name of ['openAIAdapter', 'anthropicAdapter', 'functionAdapter']) {
      expect(adapters, `${name} missing from the adapters entry point`).toHaveProperty(name);
    }
  });

  it('registers the custom element on import', () => {
    expect(customElements.get('ai-chat')).toBeTruthy();
  });
});

describe('docs stay in lockstep with the code', () => {
  const varsIn = (s: string) => new Set(s.match(/--ai-chat-[a-z-]+/g) ?? []);
  const codeVars = varsIn(styles);

  it('documents every CSS variable in BOTH README and AI_USAGE', () => {
    const inReadme = varsIn(readme);
    const inUsage = varsIn(aiUsage);
    const missingReadme = [...codeVars].filter((v) => !inReadme.has(v));
    const missingUsage = [...codeVars].filter((v) => !inUsage.has(v));

    expect(missingReadme, 'CSS vars missing from README').toEqual([]);
    expect(missingUsage, 'CSS vars missing from AI_USAGE').toEqual([]);
  });

  it('does not document variables that no longer exist', () => {
    // Catches the reverse drift: a var removed from code but left in the docs.
    const documented = [...varsIn(readme)].filter((v) => !codeVars.has(v));
    expect(documented, 'README documents vars absent from styles.ts').toEqual([]);
  });

  it('documents every ::part() in BOTH docs', () => {
    const parts = new Set<string>();
    for (const m of chatSource.matchAll(/part="([a-z0-9 -]+)"/g)) {
      for (const p of m[1].split(/\s+/)) {
        if (p && !p.startsWith('message-')) parts.add(p);
      }
    }
    const missingReadme = [...parts].filter((p) => !readme.includes(`\`${p}\``));
    const missingUsage = [...parts].filter((p) => !aiUsage.includes(`\`${p}\``));
    expect(missingReadme, 'parts missing from README').toEqual([]);
    expect(missingUsage, 'parts missing from AI_USAGE').toEqual([]);
  });

  it('documents every label key in BOTH docs', () => {
    const keys = Object.keys(DEFAULT_LABELS);
    const missingReadme = keys.filter((k) => !readme.includes(k));
    const missingUsage = keys.filter((k) => !aiUsage.includes(k));
    expect(missingReadme, 'labels missing from README').toEqual([]);
    expect(missingUsage, 'labels missing from AI_USAGE').toEqual([]);
  });
});
