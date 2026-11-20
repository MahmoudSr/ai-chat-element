// Checks the docs home page (the fan deck) at the window sizes people really
// have. Run after `npm run docs:build`:  npm run verify:home
//
// On a desktop window (961px wide or more, 540px tall or more) the home page
// must be exactly one screen and nothing on it may be unreadable:
//   - the page doesn't scroll;
//   - no strip's name is covered by its neighbour (the fan is fitted to the
//     window in FanDeck.vue's fitSlots(); a short window means short strips);
//   - no one-line text in the card (the install command, the codes row) is
//     cut off with an ellipsis.
// Each of these was a real bug at a common size (1366x657, 1536x720, 961x700)
// that no unit test could see: it only shows in the laid-out page.
//
// No server: every request to a made-up origin is answered from the built
// site folder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'site/.vitepress/dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('verify:home: no built site. Run `npm run docs:build` first.');
  process.exit(1);
}

const pw = await import(pathToFileURL(createRequire(import.meta.url).resolve('playwright')).href);
const { chromium } = pw.default ?? pw;

const SIZES = [
  '1920x1080', '1680x1050', '1536x864', '1536x776', '1536x720', '1440x900',
  '1440x760', '1366x768', '1366x657', '1280x800', '1280x720', '1280x650',
  '1280x600', '1280x550', '1600x560', '1100x700', '1024x768', '1024x600',
  '961x700', '961x540',
];
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png',
};

const browser = await chromium.launch();
const failures = [];
for (const size of SIZES) {
  const [width, height] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.route('http://site.test/**', (route) => {
    let p = new URL(route.request().url()).pathname.replace(/^\/ai-chat-element\//, '');
    if (p === '' || p.endsWith('/')) p += 'index.html';
    let f = path.join(dist, p);
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] ?? 'application/octet-stream' });
  });
  await page.goto('http://site.test/ai-chat-element/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Let the strips finish turning to their fitted angles (0.7s transition).
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => {
    const scroll = document.documentElement.scrollHeight - innerHeight;
    const covered = [...document.querySelectorAll('.fd-tab b')]
      .filter((name) => {
        const strip = name.closest('.fd-strip');
        const a = ((parseFloat(getComputedStyle(strip).getPropertyValue('--a')) || 0) * Math.PI) / 180;
        // Measure the text, not a box stretched to the strip's width.
        const was = name.style.alignSelf;
        name.style.alignSelf = 'flex-start';
        const box = name.getBoundingClientRect();
        const cx = (box.left + box.right) / 2;
        const cy = (box.top + box.bottom) / 2;
        // The name runs along the strip's angle: sample both ends and the
        // middle, on its top and bottom lines.
        const half = name.offsetWidth / 2 - 1;
        const up = name.offsetHeight / 2 - 3;
        name.style.alignSelf = was;
        const points = [];
        for (const d of [-half, 0, half])
          for (const e of [-up, up]) points.push([cx + d * Math.cos(a) - e * Math.sin(a), cy + d * Math.sin(a) + e * Math.cos(a)]);
        return !points.every(([x, y]) => strip.contains(document.elementFromPoint(x, y)));
      })
      .map((name) => name.textContent);
    const cut = [...document.querySelectorAll('.fd-card *')]
      .filter((el) => getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent.trim().slice(0, 30));
    return { scroll, covered, cut };
  });

  const problems = [];
  if (r.scroll > 0) problems.push(`scrolls ${r.scroll}px`);
  if (r.covered.length) problems.push(`names covered: ${r.covered.join(', ')}`);
  if (r.cut.length) problems.push(`text cut off: ${r.cut.join(' | ')}`);
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${size.padEnd(10)} ${problems.join('; ')}`);
  if (problems.length) failures.push(size);
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error(`\nverify:home: the home page breaks at ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`\nverify:home: one clean screen at all ${SIZES.length} sizes`);
