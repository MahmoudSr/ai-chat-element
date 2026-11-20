import type { StreamChunk } from '../types.js';

const OPEN = '<think>';
const CLOSE = '</think>';

/**
 * Splits a reply that STARTS with `<think>…</think>` into reasoning and answer,
 * as some models do when the server doesn't separate them (DeepSeek-R1, QwQ,
 * Qwen3 on several servers). Streaming-safe: a tag cut across chunks is held
 * back until it can be told apart from text.
 *
 * Only the very start of the reply counts (after whitespace). A `<think>`
 * anywhere later is the model writing about the tag, and stays text.
 */
export class ThinkTagSplitter {
  private state: 'start' | 'thinking' | 'answer' = 'start';
  private buf = '';
  /** Right after `</think>`: drop the blank lines models put before the answer. */
  private trimLead = false;

  push(text: string): StreamChunk[] {
    this.buf += text;
    const out: StreamChunk[] = [];
    for (;;) {
      if (this.state === 'start') {
        const lead = this.buf.trimStart();
        if (lead.startsWith(OPEN)) {
          this.state = 'thinking';
          this.buf = lead.slice(OPEN.length);
          out.push({ type: 'reasoning', delta: '' });
          continue;
        }
        if (lead.length < OPEN.length && OPEN.startsWith(lead)) return out; // could still be the tag
        this.state = 'answer';
        continue;
      }
      if (this.state === 'thinking') {
        const end = this.buf.indexOf(CLOSE);
        if (end >= 0) {
          if (end > 0) out.push({ type: 'reasoning', delta: this.buf.slice(0, end) });
          this.buf = this.buf.slice(end + CLOSE.length);
          this.state = 'answer';
          this.trimLead = true;
          continue;
        }
        // Emit all but a tail that could be the start of the closing tag.
        const keep = partialSuffix(this.buf, CLOSE);
        const emit = this.buf.slice(0, this.buf.length - keep);
        if (emit) out.push({ type: 'reasoning', delta: emit });
        this.buf = this.buf.slice(this.buf.length - keep);
        return out;
      }
      // answer
      if (this.trimLead) {
        this.buf = this.buf.replace(/^\s+/, '');
        if (!this.buf) return out;
        this.trimLead = false;
      }
      if (this.buf) out.push({ type: 'delta', delta: this.buf });
      this.buf = '';
      return out;
    }
  }

  /** The stream ended: release anything held back. */
  flush(): StreamChunk[] {
    const rest = this.buf;
    this.buf = '';
    if (!rest) return [];
    if (this.state === 'thinking') return [{ type: 'reasoning', delta: rest }];
    if (this.state === 'answer' && this.trimLead) return [];
    return [{ type: 'delta', delta: rest }];
  }
}

/** Length of the longest suffix of `s` that is a proper prefix of `tag`. */
function partialSuffix(s: string, tag: string): number {
  for (let n = Math.min(tag.length - 1, s.length); n > 0; n--) {
    if (s.endsWith(tag.slice(0, n))) return n;
  }
  return 0;
}
