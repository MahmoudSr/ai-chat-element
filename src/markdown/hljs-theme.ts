import { css } from 'lit';

/**
 * highlight.js token colors, scoped for the shadow DOM.
 *
 * highlight.js ships themes as global stylesheets, but our markup lives inside
 * the component's shadow root where global CSS can't reach. We inline a compact
 * GitHub-dark theme. Code blocks are dark in every theme (--ai-chat-code-bg
 * defaults to a near-black), so the token colours are dark-block colours in
 * every theme too. They used to switch to GitHub-light colours under a light
 * OS, which put dark text on the dark block (about 1.3:1 for strings).
 */
export const hljsTheme = css`
  .hljs { color: var(--ai-chat-code-fg); background: transparent; }
  .hljs-comment, .hljs-quote { color: #8b949e; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type { color: #ff7b72; }
  .hljs-string, .hljs-meta .hljs-string, .hljs-regexp { color: #a5d6ff; }
  .hljs-number, .hljs-symbol, .hljs-bullet { color: #79c0ff; }
  .hljs-title, .hljs-title.function_, .hljs-section { color: #d2a8ff; }
  .hljs-name, .hljs-selector-id, .hljs-selector-class { color: #7ee787; }
  .hljs-attr, .hljs-attribute, .hljs-variable, .hljs-template-variable { color: #ffa657; }
  .hljs-built_in, .hljs-class .hljs-title { color: #ffa657; }
  .hljs-tag { color: #7ee787; }
  .hljs-meta { color: #8b949e; }
  .hljs-deletion { color: #ffdcd7; background: #67060c; }
  .hljs-addition { color: #aff5b4; background: #033a16; }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: bold; }
`;
