import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // `npm run dev` opens the examples landing page directly.
  server: {
    open: '/index.html',
  },
  build: {
    lib: {
      entry: {
        'ai-chat-element': resolve(__dirname, 'src/index.ts'),
        'adapters/index': resolve(__dirname, 'src/adapters/index.ts'),
      },
      formats: ['es'],
    },
    // Bundle all dependencies so the Web Component is a drop-in <script> with
    // no peer deps to install. Consumers who prefer to dedupe can import from
    // source and mark these external in their own build.
    rollupOptions: {},
    // No source maps in the published package: they'd nearly triple the tarball
    // and ship our original source. The build script cleans dist/ up front, so
    // we must NOT let Vite wipe it again here — that would delete the .d.ts
    // declaration files tsc just emitted, leaving consumers with no types.
    sourcemap: false,
    emptyOutDir: false,
    target: 'es2021',
  },
});
