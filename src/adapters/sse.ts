/**
 * Minimal Server-Sent-Events parser over a fetch Response body.
 *
 * Both the OpenAI-compatible and Anthropic streaming APIs return `text/event-stream`
 * where each event is one or more `field: value` lines separated by a blank line.
 * We only care about the `data:` field. This yields the raw string payload of
 * each `data:` line (JSON for OpenAI/Anthropic), leaving JSON parsing to callers.
 */
export async function* parseSSE(
  response: Response,
  signal: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (!response.body) {
    throw new Error('Response has no readable body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Emit the `data:` payload(s) of one complete event. Per the SSE spec,
  // multiple `data:` lines in a single event are concatenated with `\n` into
  // one payload — so we gather them and yield once, not once per line.
  function* emitEvent(rawEvent: string): Generator<string, void, unknown> {
    const dataLines: string[] = [];
    for (const line of rawEvent.split(/\r?\n/)) {
      if (line.startsWith('data:')) {
        // Spec allows an optional single leading space after the colon.
        dataLines.push(line.slice(5).replace(/^ /, ''));
      }
    }
    if (dataLines.length) yield dataLines.join('\n');
  }

  try {
    while (true) {
      if (signal.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line. Normalise CRLF just in case.
      let sepIndex: number;
      // eslint-disable-next-line no-cond-assign
      while ((sepIndex = indexOfSeparator(buffer)) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex).replace(/^(\r?\n){1,2}/, '');
        yield* emitEvent(rawEvent);
      }
    }

    // Stream ended. Flush the decoder (a multi-byte char split across the last
    // two network chunks is still buffered inside it) and process whatever
    // remains as a final event. Many real servers/proxies — including Ollama's
    // OpenAI-compat shim and its `[DONE]` line — close WITHOUT the terminating
    // blank line, so this trailing content (often the last token or [DONE]) is
    // otherwise silently dropped.
    if (!signal.aborted) {
      buffer += decoder.decode();
      if (buffer.trim()) yield* emitEvent(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}

function indexOfSeparator(buffer: string): number {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}
