/**
 * Proves a consumer's production build keeps <ai-chat>.
 *
 * THE BUG THIS CATCHES (shipped in 0.1.0, 0.1.1 and 0.1.2): package.json's
 * `sideEffects` listed files that don't exist, so bundlers were told nothing
 * here has side effects. Importing our entry IS the side effect — it registers
 * the element via Lit's @customElement decorator, with no export referenced — so
 * Rollup silently deleted the whole component. `import 'ai-chat-element'`
 * produced an ~0.8kB bundle containing no element.
 *
 * Nothing else catches it: our tests import symbols directly (nothing to shake)
 * and dev servers don't tree-shake. It worked everywhere except a real
 * production build. Hence this script — it builds a throwaway app against the
 * built dist/ and asserts the registration survives.
 *
 * Run: node scripts/verify-bundling.mjs   (npm run verify:bundling)
 */
import { build } from 'vite';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'ai-chat-bundle-'));

try {
  // The import MUST resolve through node_modules as a bare specifier: the
  // `sideEffects` field only applies to packages resolved that way. Importing
  // dist/ by path bypasses it entirely and the check silently passes even when
  // the package is broken (this exact mistake made the first version of this
  // script useless). So: link the real package into a real node_modules.
  const nm = join(dir, 'node_modules', 'ai-chat-element');
  mkdirSync(nm, { recursive: true });
  cpSync(join(root, 'dist'), join(nm, 'dist'), { recursive: true });
  // Copy the REAL package.json — sideEffects/exports must be the shipped ones.
  cpSync(join(root, 'package.json'), join(nm, 'package.json'));

  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  // A consumer app written exactly as the README's quick start tells them to.
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html><body><ai-chat id="c"></ai-chat>
<script type="module">
  import 'ai-chat-element';
</script></body></html>`);

  await build({
    root: dir,
    logLevel: 'silent',
    build: { outDir: join(dir, 'out'), emptyOutDir: true },
  });

  const assets = join(dir, 'out', 'assets');
  const code = readdirSync(assets)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(assets, f), 'utf8'))
    .join('\n');

  const registers = /customElements\.define\s*\(/.test(code);
  const bytes = code.length;

  if (!registers) {
    console.error(
      `\nFAIL: a consumer's production build has NO custom-element registration.\n` +
      `      Bundle is ${bytes} bytes — the component was tree-shaken away.\n` +
      `      Check package.json "sideEffects" (must be true).\n`,
    );
    process.exit(1);
  }
  if (bytes < 50_000) {
    console.error(`\nFAIL: bundle is only ${bytes} bytes — too small to contain the component.\n`);
    process.exit(1);
  }
  console.log(`OK: consumer build keeps <ai-chat> (${Math.round(bytes / 1024)} kB, registration present)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
