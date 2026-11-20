import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './styles/tokens.css';
import FanDeck from './components/FanDeck.vue';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FanDeck', FanDeck);
    // Registering <ai-chat> calls customElements.define, which only exists in
    // the browser, so the component loads on the client only, never during
    // the static (SSR) build.
    if (!import.meta.env.SSR) {
      void import('../../../src/index');
    }
  },
} satisfies Theme;
