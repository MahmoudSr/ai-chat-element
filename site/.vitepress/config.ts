import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type HeadConfig } from 'vitepress';

/**
 * Docs site for ai-chat-element.
 *
 * Served by GitHub Pages as a project site, so every URL lives under
 * /ai-chat-element/ (must match the repo name). The playground is built by
 * vite.config.site.ts and published next to these pages.
 *
 * The live <ai-chat> demos import the component from ../src directly, so the
 * site always documents the code in this commit, never a stale published build.
 */

/** One sidebar for every docs page, in reading order. */
const docsSidebar = [
  {
    text: 'Get started',
    items: [
      { text: 'Introduction', link: '/guide/' },
      { text: 'Install', link: '/guide/install' },
      { text: 'Quick start', link: '/guide/quick-start' },
      { text: 'TypeScript', link: '/guide/typescript' },
    ],
  },
  {
    text: 'Frameworks',
    items: [
      { text: 'Plain HTML', link: '/guide/frameworks/html' },
      { text: 'React and Next.js', link: '/guide/frameworks/react' },
      { text: 'Vue', link: '/guide/frameworks/vue' },
      { text: 'Angular', link: '/guide/frameworks/angular' },
      { text: 'Svelte', link: '/guide/frameworks/svelte' },
    ],
  },
  {
    text: 'Models',
    items: [
      { text: 'Overview', link: '/models/' },
      { text: 'OpenAI-compatible', link: '/models/openai' },
      { text: 'Anthropic', link: '/models/anthropic' },
      { text: 'Your own backend', link: '/models/your-backend' },
      { text: 'Finish reason and usage', link: '/models/finish-and-usage' },
    ],
  },
  {
    text: 'Features',
    items: [
      { text: 'Streaming and Markdown', link: '/features/streaming' },
      { text: 'Reasoning and tool calls', link: '/features/reasoning-tools' },
      { text: 'Attachments', link: '/features/attachments' },
      { text: 'Message actions', link: '/features/message-actions' },
      { text: 'History sidebar', link: '/features/history' },
      { text: 'Long conversations', link: '/features/long-conversations' },
      { text: 'Background streaming', link: '/features/background-streaming' },
      { text: 'Header, names and avatars', link: '/features/header-avatars' },
      { text: 'Keyboard and accessibility', link: '/features/accessibility' },
    ],
  },
  {
    text: 'Customize',
    items: [
      { text: 'Theming', link: '/customize/' },
      { text: 'Styling parts', link: '/customize/parts' },
      { text: 'Slots', link: '/customize/slots' },
      { text: 'Labels and translation', link: '/customize/labels' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Attributes', link: '/reference/attributes' },
      { text: 'Properties and methods', link: '/reference/properties-methods' },
      { text: 'Events', link: '/reference/events' },
      { text: 'CSS variables', link: '/reference/css-variables' },
      { text: 'Parts', link: '/customize/parts#all-71-parts' },
      { text: 'Slots', link: '/customize/slots#all-19-slots' },
      { text: 'Labels', link: '/customize/labels#all-45-labels' },
      { text: 'Types', link: '/reference/types' },
    ],
  },
];

/** The deployed site's address. Canonical URLs, the sitemap and llms.txt use it. */
const SITE = 'https://mahmoudsr.github.io/ai-chat-element/';
const REPO = 'https://github.com/MahmoudSr/ai-chat-element';
const DESCRIPTION =
  'A streaming AI chat UI as a Web Component. One tag in React, Vue, Angular, Svelte or plain HTML, connected to OpenAI, Anthropic, Ollama or your own API.';

/** 'guide/index.md' -> 'guide/', 'guide/install.md' -> 'guide/install' (cleanUrls). */
const pagePath = (relativePath: string) =>
  relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '');

/** The sidebar group a page sits in, for its breadcrumb. */
function sectionOf(link: string) {
  return docsSidebar.find((g) => g.items.some((i) => i.link === link));
}

/** Search and social tags for one page: canonical, Open Graph, Twitter, JSON-LD. */
function seoHead(relativePath: string, title: string, description: string, isNotFound?: boolean): HeadConfig[] {
  if (isNotFound) return [['meta', { name: 'robots', content: 'noindex' }]];

  const url = SITE + pagePath(relativePath);
  const image = SITE + 'og.png';
  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'ai-chat-element' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'ai-chat-element: a fan of paint-chip strips, one per framework and model, around a live chat' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ];

  const ld = (data: object) =>
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(data)]);

  if (relativePath === 'index.md') {
    ld({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': SITE + '#website', name: 'ai-chat-element', url: SITE, description },
        {
          '@type': 'SoftwareSourceCode',
          name: 'ai-chat-element',
          description: DESCRIPTION,
          url: SITE,
          codeRepository: REPO,
          programmingLanguage: 'TypeScript',
          runtimePlatform: 'Web browser',
          license: 'https://www.mozilla.org/en-US/MPL/2.0/',
          version: pkg.version,
          author: { '@type': 'Person', name: 'Mahmoud Srouji', url: 'https://github.com/MahmoudSr' },
          sameAs: [REPO, 'https://www.npmjs.com/package/ai-chat-element'],
        },
      ],
    });
  } else {
    const link = '/' + pagePath(relativePath);
    const section = sectionOf(link);
    const crumbs = [{ name: 'ai-chat-element', item: SITE }];
    if (section && section.items[0].link !== link) {
      crumbs.push({ name: section.text, item: SITE + section.items[0].link.slice(1) });
    }
    crumbs.push({ name: title.replace(/ \| ai-chat-element$/, ''), item: url });
    ld({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
    });
  }
  return head;
}

/** Reads one page's frontmatter description (a single JSON-quoted line). */
function readDescription(file: string) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n[\s\S]*?^description: (".*")$/m);
  return m ? (JSON.parse(m[1]) as string) : '';
}

/**
 * llms.txt: a map of the docs for AI assistants (llmstxt.org), built from the
 * sidebar so it lists exactly the pages the site has. llms-full.txt is
 * AI_USAGE.md, the complete integration guide that also ships in the package.
 */
function writeLlmsTxt(srcDir: string, outDir: string) {
  const lines = [
    '# ai-chat-element',
    '',
    `> ${DESCRIPTION}`,
    '',
    `Install with \`npm install ai-chat-element\`; importing the package registers the \`<ai-chat>\` element, and setting its \`transport\` property connects it to a model. The complete integration guide, with every attribute, property, event, CSS variable, part, slot and label, is ${SITE}llms-full.txt.`,
  ];
  for (const group of docsSidebar) {
    lines.push('', `## ${group.text}`, '');
    for (const item of group.items) {
      if (item.link.includes('#')) continue; // anchors into pages already listed
      const rel = item.link.slice(1);
      const file = path.join(srcDir, rel.endsWith('/') || rel === '' ? rel + 'index.md' : rel + '.md');
      lines.push(`- [${item.text}](${SITE}${rel}): ${readDescription(file)}`);
    }
  }
  lines.push(
    '',
    '## Optional',
    '',
    `- [Playground](${SITE}examples/playground.html): every option live, with a code export.`,
    `- [Changelog](${REPO}/blob/main/CHANGELOG.md): what changed in each release.`,
    `- [Source on GitHub](${REPO})`,
    `- [Package on npm](https://www.npmjs.com/package/ai-chat-element)`,
    '',
  );
  fs.writeFileSync(path.join(outDir, 'llms.txt'), lines.join('\n'));
  fs.copyFileSync(path.join(srcDir, '..', 'AI_USAGE.md'), path.join(outDir, 'llms-full.txt'));
}

const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  title: 'ai-chat-element',
  description: DESCRIPTION,
  base: '/ai-chat-element/',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: false,

  sitemap: { hostname: SITE },

  transformHead: ({ pageData, title, description, assets }) => [
    // The two fonts every page draws with, Latin subset: fetched alongside
    // the CSS instead of after it, so text doesn't re-wrap when they land.
    ...assets
      .filter((a) => /(archivo-latin-wdth-normal|jetbrains-mono-latin-wght-normal)\.[\w-]+\.woff2$/.test(a))
      .map((href): HeadConfig => ['link', { rel: 'preload', href, as: 'font', type: 'font/woff2', crossorigin: '' }]),
    ...seoHead(pageData.relativePath, title, description, pageData.isNotFound),
  ],

  buildEnd: (siteConfig) => writeLlmsTxt(siteConfig.srcDir, siteConfig.outDir),

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/ai-chat-element/rivet.svg' }],
    ['meta', { name: 'theme-color', content: '#F4F5F7' }],
  ],

  vue: {
    template: {
      compilerOptions: {
        // <ai-chat> is a Lit custom element, not a Vue component.
        isCustomElement: (tag) => tag === 'ai-chat',
      },
    },
  },

  markdown: {
    // Code blocks are dark slabs in both modes (--vp-code-block-bg), so the
    // syntax colours are dark-block colours in both modes too. A light theme
    // here put dark text on the dark slab.
    theme: { light: 'github-dark', dark: 'github-dark' },
    // Copy each column header onto its cells as data-label, so on a phone a
    // table can stack into cards and still say what each value is.
    config(md) {
      md.core.ruler.push('table-cell-labels', (state) => {
        let headers: string[] = [];
        let col = 0;
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
          const t = tokens[i];
          if (t.type === 'thead_open') headers = [];
          else if (t.type === 'th_open') {
            const inline = tokens[i + 1];
            headers.push(inline?.type === 'inline' ? inline.content.replace(/`/g, '') : '');
          } else if (t.type === 'tr_open') col = 0;
          else if (t.type === 'td_open') {
            if (headers[col]) t.attrSet('data-label', headers[col]);
            col++;
          }
        }
      });
    },
  },

  themeConfig: {
    logo: { src: '/rivet.svg', alt: '' },
    siteTitle: 'ai-chat-element',
    nav: [
      { text: 'Get started', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Models', link: '/models/', activeMatch: '/models/' },
      { text: 'Features', link: '/features/streaming', activeMatch: '/features/' },
      { text: 'Customize', link: '/customize/', activeMatch: '/customize/' },
      { text: 'Reference', link: '/reference/attributes', activeMatch: '/reference/' },
      { text: 'Playground', link: 'https://mahmoudsr.github.io/ai-chat-element/examples/playground.html' },
      { text: '0.7.0', link: 'https://github.com/MahmoudSr/ai-chat-element/blob/main/CHANGELOG.md' },
    ],
    sidebar: {
      '/guide/': docsSidebar,
      '/models/': docsSidebar,
      '/features/': docsSidebar,
      '/customize/': docsSidebar,
      '/reference/': docsSidebar,
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/MahmoudSr/ai-chat-element' }],
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
    footer: {
      message: 'Released under the MPL-2.0 license.',
    },
  },
});
