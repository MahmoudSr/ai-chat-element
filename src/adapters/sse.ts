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

        for (const line of rawEvent.split(/\r?\n/)) {
          if (line.startsWith('data:')) {
            // Spec allows an optional single leading space after the colon.
            yield line.slice(5).replace(/^ /, '');
          }
        }
      }
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
