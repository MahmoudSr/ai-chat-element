import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Builds the examples into a static site for GitHub Pages.
 *
 * Separate from vite.config.ts (the library build) so the two can never
 * interfere: that one emits a package into dist/, this one emits a website into
 * dist-site/. The examples import `../src/*.ts` directly, which the dev server
 * compiles on the fly — static hosting can't, hence this build step.
 *
 * `base` must match the repo name: Pages serves the project site from
 * https://<user>.github.io/<repo>/, so asset URLs need that prefix.
 */
export default defineConfig({
  base: '/ai-chat-element/',
  // The component relies on Lit's @customElement/@property decorators, which are
  // TypeScript's experimental (legacy) flavour. esbuild — Vite's default .ts
  // transform — silently DROPS them, so the element never registers and the page
  // dies with "addMessage is not a function". The library build avoids this by
  // running tsc first; this build has to opt in explicitly.
  esbuild: {
    target: 'es2021',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    // MUST be false. This config is loaded via --config, which does NOT replace
    // vite.config.ts's settings wholesale — `build.lib` from there survives, and
    // lib mode silently overrides rollupOptions.input. The result builds the
    // LIBRARY while ignoring the HTML entries below: the page then loads a bundle
    // containing none of its own code and dies with "addMessage is not a
    // function". Turning lib mode off restores normal multi-page HTML bundling.
    lib: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        playground: resolve(__dirname, 'examples/playground.html'),
      },
    },
  },
});
