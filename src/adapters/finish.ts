import type { FinishReason } from '../types.js';

/**
 * Normalize a provider's raw stop/finish-reason string onto our shared
 * {@link FinishReason} vocabulary. Both the OpenAI-compatible and Anthropic
 * adapters funnel through here so consumers get one vocabulary regardless of
 * backend. Unrecognized (or absent) reasons map to `'other'`/`undefined`.
 */
export function normalizeFinishReason(
  raw: string | null | undefined,
): FinishReason | undefined {
  if (!raw) return undefined;
  switch (raw) {
    // Natural completion.
    case 'stop':
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    // Truncated at the token limit.
    case 'length':
    case 'max_tokens':
      return 'length';
    // Blocked by a safety filter.
    case 'content_filter':
    case 'refusal':
      return 'content_filter';
    // Stopped to call a tool.
    case 'tool_calls':
    case 'tool_use':
      return 'tool_calls';
    default:
      return 'other';
  }
}
