import { defineConfig } from 'vitest/config';

/**
 * Tests run in a REAL browser (Playwright/Chromium), not happy-dom or jsdom.
 *
 * That's deliberate and non-negotiable for this component: its bugs live in the
 * Shadow DOM — slot projection, ::slotted, :host, IntersectionObserver. A faked
 * DOM either doesn't implement those or implements them differently, so it would
 * happily pass tests for code that's broken in every real browser. The avatar
 * bug (a slotted node can only project into ONE slot) is exactly that: no fake
 * DOM would have caught it.
 *
 * Kept separate from vite.config.ts so test settings can never affect the
 * published library build.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
      headless: true,
      screenshotFailures: false,
    },
  },
});
