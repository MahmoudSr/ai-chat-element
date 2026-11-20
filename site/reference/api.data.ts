/**
 * The public API, read from the source at build time (see extract.ts): CSS
 * variables with their defaults, ::part() names, slots, labels with their
 * default text, attributes and properties with their defaults, methods with
 * their signatures, and events. The docs render these lists instead of
 * retyping them, so they can't drift from the code.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LABELS } from '../../src/labels.ts';
import { extractApi, type ApiData } from './extract.ts';

export type { ApiData } from './extract.ts';

const src = (f: string) => readFileSync(fileURLToPath(new URL(`../../src/${f}`, import.meta.url)), 'utf8');

export declare const data: ApiData;

export default {
  watch: ['../../src/styles.ts', '../../src/ai-chat.ts', '../../src/icons.ts', '../../src/labels.ts'],
  load(): ApiData {
    return extractApi({
      styles: src('styles.ts'),
      chat: src('ai-chat.ts'),
      icons: src('icons.ts'),
      labels: DEFAULT_LABELS as unknown as Record<string, string>,
    });
  },
};
