import { withBase } from 'vitepress';

/**
 * Inline Markdown for the reference descriptions: `code`, **bold** and
 * [links](/path). Escapes everything else, so a description can't inject HTML.
 */
export function fmt(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_m, label, href) => `<a href="${withBase(href)}">${label}</a>`);
}
