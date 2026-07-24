import { svg } from 'lit';

/**
 * Default inline SVG icons, kept out of `ai-chat.ts` so the component stays
 * focused on behavior. Every icon is also overridable via a named slot, so
 * these are just the fallbacks. All use `currentColor` and inherit sizing.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
} as const;

/** Downward chevron — jump-to-latest. */
export const chevronDownIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="18" height="18"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>`;

/** Upward arrow — send. */
export const sendIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="18" height="18"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>`;

/** Paperclip — attach files. */
export const attachIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="18" height="18"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l8.49-8.49a3 3 0 0 1 4.24 4.24l-8.49 8.49a1 1 0 0 1-1.41-1.41l7.78-7.78"></path>
  </svg>`;

/** X — remove attachment / close. */
export const closeIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="14" height="14"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;

/** Generic file — non-image attachment chip. */
export const fileIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="16" height="16"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>`;

/** Pencil-on-square — new/clear chat. */
export const newChatIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="18" height="18"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
  </svg>`;

/** Circular arrow — retry. */
export const retryIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="16" height="16"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>`;

/** Chat bubbles — default empty-state icon (overridable via the empty-icon slot). */
export const emptyChatIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="40" height="40"
       fill=${base.fill} stroke=${base.stroke} stroke-width="1.75"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"></path>
  </svg>`;

/** Triangle-with-bang — error. Replaces the old hardcoded ⚠ emoji. */
export const alertIcon = svg`
  <svg class="icon" viewBox=${base.viewBox} width="15" height="15"
       fill=${base.fill} stroke=${base.stroke} stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`;
