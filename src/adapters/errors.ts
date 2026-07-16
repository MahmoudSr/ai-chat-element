/**
 * Shared error helpers for the HTTP adapters (OpenAI-compatible + Anthropic).
 * Both providers return a JSON error envelope on a failed request; surfacing the
 * human-readable `error.message` from it beats dumping the raw, brace-laden body
 * truncated mid-string.
 */

/** Normalise a thrown value to a message string. */
export function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Build a user-facing message from a non-OK Response.
 *
 * OpenAI and Anthropic (and most compatible servers) return
 * `{ "error": { "message": "...", "type": "...", ... } }`. We prefer that
 * `error.message`; some servers instead put the text in a top-level `message`
 * or return a bare string. Only if none of those parse do we fall back to a
 * trimmed slice of the raw body, so the reader still gets *something*.
 *
 * @example "Request failed (401): Incorrect API key provided."
 */
export async function httpError(response: Response): Promise<string> {
  const status = `${response.status}${
    response.statusText ? ` ${response.statusText}` : ''
  }`;

  let body = '';
  try {
    body = await response.text();
  } catch {
    return `Request failed (${status}).`;
  }
  if (!body) return `Request failed (${status}).`;

  const detail = extractMessage(body);
  return `Request failed (${status}): ${detail}`;
}

/** Pull the most useful human-readable string out of an error response body. */
function extractMessage(body: string): string {
  try {
    const json = JSON.parse(body);
    // { error: { message } } — OpenAI, Anthropic, most compatible servers.
    const nested = json?.error?.message;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
    // { error: "..." } — some proxies flatten it.
    if (typeof json?.error === 'string' && json.error.trim()) {
      return json.error.trim();
    }
    // { message: "..." } — occasionally at the top level.
    if (typeof json?.message === 'string' && json.message.trim()) {
      return json.message.trim();
    }
  } catch {
    /* not JSON — fall through to the raw-slice fallback */
  }
  // Unknown shape: return a trimmed slice so the message stays readable rather
  // than cut mid-token.
  const trimmed = body.trim();
  return trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
}
