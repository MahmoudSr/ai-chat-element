import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * The library is built in TWO passes (see the `build` script): the component,
 * then `--mode adapters` for the `ai-chat-element/adapters` entry.
 *
 * One pass with both entries makes Rolldown (Vite 8) move the shared adapter
 * code into a third, hashed chunk that BOTH files import — so
 * `dist/ai-chat-element.js` stops being a single drop-in file, and anyone who
 * self-hosts it by copying the file gets a 404 and a dead page. Two passes
 * keep each entry self-contained, exactly as 0.6.0 shipped; the adapters'
 * few KB are duplicated in the main file, which re-exports them anyway.
 */
export default defineConfig(({ mode }) => ({
  // `npm run dev` opens the examples landing page directly.
  server: {
    open: '/index.html',
  },
  build: {
    lib: {
      entry:
        mode === 'adapters'
          ? { 'adapters/index': resolve(import.meta.dirname, 'src/adapters/index.ts') }
          : { 'ai-chat-element': resolve(import.meta.dirname, 'src/index.ts') },
      formats: ['es'],
    },
    // Bundle all dependencies so the Web Component is a drop-in <script> with
    // no peer deps to install. Consumers who prefer to dedupe can import from
    // source and mark these external in their own build.
    rollupOptions: {},
    // No source maps in the published package: they'd nearly triple the tarball
    // and ship our original source. The build script cleans dist/ up front, so
    // we must NOT let Vite wipe it again here — that would delete the .d.ts
    // declaration files tsc just emitted (and the first pass's output).
    sourcemap: false,
    emptyOutDir: false,
    target: 'es2021',
  },
}));
