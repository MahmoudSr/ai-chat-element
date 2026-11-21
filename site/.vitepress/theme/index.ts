// The default theme without Inter: the site sets its own fonts, so Inter was a
// download (and a preload) no page used.
import DefaultTheme from 'vitepress/theme-without-fonts';
// Self-hosted, so they can be preloaded and arrive before first paint. Loaded
// late from Google Fonts they swapped in after the page drew and re-wrapped it
// (layout shift 0.13 on the CSS variables table).
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import type { Theme } from 'vitepress';
import './styles/tokens.css';
import FanDeck from './components/FanDeck.vue';
import LiveDemo from './components/LiveDemo.vue';
import ThemeLab from './components/ThemeLab.vue';
import VarTable from './components/VarTable.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FanDeck', FanDeck);
    app.component('LiveDemo', LiveDemo);
    app.component('ThemeLab', ThemeLab);
    app.component('VarTable', VarTable);
    // Registering <ai-chat> calls customElements.define, which only exists in
    // the browser, so the component loads on the client only, never during
    // the static (SSR) build.
    if (!import.meta.env.SSR) {
      void import('../../../src/index');
    }
  },
} satisfies Theme;
