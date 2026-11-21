import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Builds the playground for GitHub Pages. scripts/assemble-pages.mjs then puts
 * it at /playground/ inside the docs site (npm run build:pages).
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
  // Must match the repo name: Pages serves a project site from
  // https://<user>.github.io/<repo>/, so every asset URL needs that prefix.
  // Serving this output from any other path 404s all of them.
  base: '/ai-chat-element/',
  build: {
    outDir: 'dist-site',
    emptyOutDir: true,
    // Its own folder, so it can't collide with the docs site's assets/.
    assetsDir: 'playground/assets',
    rollupOptions: {
      input: {
        playground: resolve(import.meta.dirname, 'examples/playground.html'),
      },
    },
  },
});
