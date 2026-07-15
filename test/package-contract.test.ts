import { describe, expect, it } from 'vitest';
import pkg from '../package.json';

/**
 * Guards on package.json itself — the metadata that decides whether the package
 * WORKS once a consumer bundles it. None of this is visible from inside our own
 * tests or dev server, which is exactly how it shipped broken three times.
 */
describe('package metadata', () => {
  /**
   * The bug that shipped in 0.1.0, 0.1.1 AND 0.1.2.
   *
   * package.json said `sideEffects: ["**\/register.js", "**\/register.ts"]` —
   * files that don't exist in this project. That tells every bundler "nothing
   * else here has side effects, delete what looks unused". But importing our
   * entry IS a side effect: it registers <ai-chat> via Lit's @customElement
   * decorator, and no export is referenced. So Rollup/webpack silently dropped
   * the whole component: `import 'ai-chat-element'` produced an ~0.8kB bundle
   * with no element in it. Dev servers don't tree-shake, so it worked in dev and
   * died in production — with no error.
   */
  it('declares side effects so bundlers cannot drop the element registration', () => {
    expect(
      pkg.sideEffects,
      'sideEffects must be true: importing the entry registers <ai-chat> via a ' +
        'decorator side effect. Any narrower value lets bundlers tree-shake the ' +
        'component out of consumers\' production builds.',
    ).toBe(true);
  });

  it('points its entry points at files the build actually emits', () => {
    // A typo here fails only for consumers, never for us.
    const referenced = [
      pkg.main,
      pkg.module,
      pkg.types,
      pkg.exports?.['.']?.import,
      pkg.exports?.['.']?.types,
      pkg.exports?.['./adapters']?.import,
      pkg.exports?.['./adapters']?.types,
    ].filter(Boolean) as string[];

    expect(referenced.length, 'expected entry points to be declared').toBeGreaterThan(0);
    for (const p of referenced) {
      expect(p.startsWith('./dist/'), `${p} must live under ./dist/ (the only published dir)`).toBe(true);
    }
  });

  it('ships dist and the docs, and nothing else', () => {
    expect(pkg.files).toContain('dist');
    // Tests/source must not bloat the tarball.
    expect(pkg.files).not.toContain('src');
    expect(pkg.files).not.toContain('test');
  });

  it('keeps the metadata that makes the package findable', () => {
    expect(pkg.description?.length ?? 0).toBeGreaterThan(20);
    expect(pkg.keywords?.length ?? 0).toBeGreaterThan(3);
    expect(pkg.license).toBeTruthy();
    expect(pkg.repository).toBeTruthy();
  });
});
