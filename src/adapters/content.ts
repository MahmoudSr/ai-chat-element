import type { ChatMessage } from '../types.js';

/**
 * Build the wire-format `content` for one message, translating image
 * attachments into each provider's multimodal "parts" array.
 *
 * The guiding rule: **a message with no image attachments serializes to a plain
 * string, exactly as before.** Only when there's at least one image do we build
 * the array form. This keeps the common case byte-for-byte identical to the
 * pre-attachment behaviour (no regression for existing consumers/servers) and
 * confines the multimodal shape to messages that actually need it.
 *
 * Non-image attachments (`kind: 'file'`) are intentionally NOT sent: the
 * OpenAI/Anthropic streaming chat endpoints have no standard slot for a generic
 * file. They still reach the consumer via `ai-chat:submit` so a consumer's own
 * backend can handle them.
 */

/** The image attachments on a message, or [] — the single source of "has images". */
function imageAttachments(m: ChatMessage) {
  return (m.attachments ?? []).filter((a) => a.kind === 'image');
}

/**
 * OpenAI Chat Completions `content`. String when no images, else an array of
 * `{type:'text'}` + `{type:'image_url'}` parts. `image_url.url` accepts a `data:`
 * or `https:` URL directly, so we pass `attachment.url` through unchanged.
 */
export function toOpenAIContent(m: ChatMessage): unknown {
  const images = imageAttachments(m);
  if (images.length === 0) return m.content;

  const parts: unknown[] = [];
  if (m.content) parts.push({ type: 'text', text: m.content });
  for (const a of images) {
    parts.push({ type: 'image_url', image_url: { url: a.url } });
  }
  return parts;
}

/**
 * Anthropic Messages `content`. String when no images, else an array of
 * `{type:'text'}` + `{type:'image'}` blocks. Anthropic wants the source split
 * out: a `data:` URL becomes a `base64` source (media_type + raw base64), while
 * an `https:` URL becomes a `url` source.
 */
export function toAnthropicContent(m: ChatMessage): unknown {
  const images = imageAttachments(m);
  if (images.length === 0) return m.content;

  const parts: unknown[] = [];
  if (m.content) parts.push({ type: 'text', text: m.content });
  for (const a of images) {
    const data = parseDataUrl(a.url);
    if (data) {
      parts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: data.mediaType || a.mimeType,
          data: data.base64,
        },
      });
    } else {
      // Remote URL (e.g. a consumer uploaded it and swapped in an https URL).
      parts.push({
        type: 'image',
        source: { type: 'url', url: a.url },
      });
    }
  }
  return parts;
}

/**
 * Split a `data:<mediaType>;base64,<data>` URL into its parts. Returns null for
 * anything that isn't a base64 data URL (e.g. an https URL).
 */
function parseDataUrl(
  url: string,
): { mediaType: string; base64: string } | null {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(url);
  if (!match || !match[2]) return null; // require ;base64
  return { mediaType: match[1] ?? '', base64: match[3] ?? '' };
}
