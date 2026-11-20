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
  },

  themeConfig: {
    logo: { src: '/rivet.svg', alt: '' },
    siteTitle: 'ai-chat-element',
    nav: [
      { text: 'Get started', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Playground', link: 'https://mahmoudsr.github.io/ai-chat-element/examples/playground.html' },
      { text: '0.7.0', link: 'https://github.com/MahmoudSr/ai-chat-element/blob/main/CHANGELOG.md' },
    ],
    sidebar: {
      '/guide/': [
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
      ],
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
