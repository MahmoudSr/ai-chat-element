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

/**
 * A long code value (a default, a type, a signature) for a table cell: the
 * line may break only at its spaces. Each piece is unbreakable, because a
 * browser otherwise also breaks code after any hyphen, splitting
 * var(--ai-chat-accent) into "var(--ai-" / "chat-accent)". Escaped, and the
 * copied text is unchanged.
 */
export function words(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\S+/g, '<span class="fd-word">$&</span>');
}
