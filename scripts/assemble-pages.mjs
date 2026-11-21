// Puts the playground into the built docs site, so GitHub Pages serves one
// folder:  /            the docs (VitePress, site/.vitepress/dist)
//          /playground/ the playground (Vite, dist-site)
//          /examples/playground.html  a redirect: the playground's old address,
//          linked from older READMEs and npm pages, keeps working.
// Run by `npm run build:pages`, after both builds.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'site/.vitepress/dist');
const playground = path.join(root, 'dist-site');

for (const need of [path.join(docs, 'index.html'), path.join(playground, 'examples/playground.html')]) {
  if (!fs.existsSync(need)) {
    console.error(`assemble-pages: missing ${path.relative(root, need)}. Run npm run build:pages.`);
    process.exit(1);
  }
}

// The page itself, at /playground/. Its assets already live under
// playground/assets (vite.config.site.ts), so they can't collide with the
// docs' own assets/.
fs.mkdirSync(path.join(docs, 'playground'), { recursive: true });
fs.copyFileSync(path.join(playground, 'examples/playground.html'), path.join(docs, 'playground/index.html'));
fs.cpSync(path.join(playground, 'playground/assets'), path.join(docs, 'playground/assets'), { recursive: true });

// The old address. Pages can't send a real 301, so: a canonical link for
// search engines, an instant script redirect that keeps ?query and #hash, and
// a meta refresh plus a plain link for when scripts are off.
const target = '/ai-chat-element/playground/';
fs.mkdirSync(path.join(docs, 'examples'), { recursive: true });
fs.writeFileSync(
  path.join(docs, 'examples/playground.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The playground has moved</title>
<link rel="canonical" href="https://mahmoudsr.github.io${target}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head>
<body>
<p>The playground has moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`,
);
console.log('assemble-pages: playground at /playground/, redirect at /examples/playground.html');
