import { css } from 'lit';

/**
 * highlight.js token colors, scoped for the shadow DOM.
 *
 * highlight.js ships themes as global stylesheets, but our markup lives inside
 * the component's shadow root where global CSS can't reach. We inline a compact
 * GitHub-style theme (dark by default, light via prefers-color-scheme) that
 * tracks the --ai-chat-code-* variables. Users can still override individual
 * token colors with the exposed custom properties if they want.
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

  @media (prefers-color-scheme: light) {
    .hljs-comment, .hljs-quote { color: #6e7781; }
    .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type { color: #cf222e; }
    .hljs-string, .hljs-meta .hljs-string, .hljs-regexp { color: #0a3069; }
    .hljs-number, .hljs-symbol, .hljs-bullet { color: #0550ae; }
    .hljs-title, .hljs-title.function_, .hljs-section { color: #8250df; }
    .hljs-name, .hljs-selector-id, .hljs-selector-class, .hljs-tag { color: #116329; }
    .hljs-attr, .hljs-attribute, .hljs-variable, .hljs-template-variable,
    .hljs-built_in, .hljs-class .hljs-title { color: #953800; }
  }
`;
