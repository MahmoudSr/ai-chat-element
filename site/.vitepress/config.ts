import { defineConfig } from 'vitepress';

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

export default defineConfig({
  title: 'ai-chat-element',
  description:
    'A streaming AI chat UI as a Web Component. One tag in React, Vue, Angular, Svelte or plain HTML, connected to any model.',
  base: '/ai-chat-element/',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: false,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/ai-chat-element/rivet.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
    ],
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
