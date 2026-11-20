/**
 * How reasoning and tool chunks build up a message's `steps`.
 *
 * Pure functions over a ChatMessage, so the send loop applies them through the
 * same `update()` whether the reply is on screen or streaming in the background,
 * and so the rules can be tested without a browser. Every change returns a new
 * message with a new `steps` array and never mutates: the component and the
 * background-stream registry share message objects by reference.
 */
import type { ChatMessage, MessageStep, ReasoningStep, StreamChunk, ToolStep } from './types.js';

type ReasoningChunk = Extract<StreamChunk, { type: 'reasoning' }>;
type ToolChunk = Extract<StreamChunk, { type: 'tool' }>;

/** The last step, when it is reasoning that is still being written. */
function openReasoning(m: ChatMessage): ReasoningStep | undefined {
  const last = m.steps?.[m.steps.length - 1];
  return last && last.type === 'reasoning' && last.endedAt === undefined ? last : undefined;
}

function withSteps(m: ChatMessage, steps: MessageStep[]): ChatMessage {
  return { ...m, steps };
}

/**
 * Close reasoning that is still open. Called when the answer text resumes, a
 * tool starts, or the reply ends. Returns the SAME message when there is nothing
 * to close, so the common per-token path allocates nothing extra.
 */
export function closeReasoning(m: ChatMessage, now: number): ChatMessage {
  const open = openReasoning(m);
  if (!open) return m;
  const steps = m.steps!.slice();
  steps[steps.length - 1] = { ...open, endedAt: now };
  return withSteps(m, steps);
}

/**
 * Add reasoning. It continues the reasoning step in progress; anything since
 * (answer text, a tool) starts a new one, so reasoning interleaved with tool
 * calls stays in order.
 */
export function addReasoning(m: ChatMessage, chunk: ReasoningChunk, now: number): ChatMessage {
  // A backend can send anything; only text is reasoning.
  if (typeof chunk.delta !== 'string') chunk = { ...chunk, delta: '' };
  const open = openReasoning(m);
  const steps = (m.steps ?? []).slice();
  if (open) {
    steps[steps.length - 1] = {
      ...open,
      text: open.text + chunk.delta,
      ...(chunk.redacted ? { redacted: true } : {}),
    };
  } else {
    steps.push({
      type: 'reasoning',
      id: `reasoning-${steps.length}`,
      text: chunk.delta,
      ...(chunk.redacted ? { redacted: true } : {}),
      at: m.content.length,
      startedAt: now,
    });
  }
  return withSteps(m, steps);
}

/** Create the tool call with `chunk.id`, or update it. */
export function upsertTool(m: ChatMessage, chunk: ToolChunk, now: number): ChatMessage {
  const base = closeReasoning(m, now);
  const steps = (base.steps ?? []).slice();
  const i = steps.findIndex((s) => s.type === 'tool' && s.id === chunk.id);
  const prev = i >= 0 ? (steps[i] as ToolStep) : undefined;

  // Only well-typed fields count; a backend can send anything.
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const chunkState = TOOL_STATES.has(chunk.state as string) ? chunk.state : undefined;
  const chunkError = chunk.error !== undefined && chunk.error !== null ? errorText(chunk.error) : undefined;

  // An outcome without an explicit state implies one.
  const state =
    chunkState ??
    (chunkError !== undefined ? 'error' : chunk.output !== undefined ? 'success' : prev?.state ?? 'running');

  const next: ToolStep = {
    type: 'tool',
    id: chunk.id,
    name: str(chunk.name) ?? prev?.name ?? '',
    state,
    at: prev?.at ?? base.content.length,
    startedAt: prev?.startedAt ?? now,
  };
  const title = str(chunk.title) ?? prev?.title;
  if (title !== undefined) next.title = title;
  const args = chunk.args !== undefined ? chunk.args : prev?.args;
  if (args !== undefined) next.args = args;
  const piece = str(chunk.argsDelta);
  const argsText = piece !== undefined ? (prev?.argsText ?? '') + piece : prev?.argsText;
  if (argsText !== undefined) next.argsText = argsText;
  const output = chunk.output !== undefined ? chunk.output : prev?.output;
  if (output !== undefined) next.output = output;
  const error = chunkError ?? prev?.error;
  if (error !== undefined) next.error = error;
  const finished = state === 'success' || state === 'error';
  if (finished) next.endedAt = prev?.endedAt ?? now;

  if (prev) steps[i] = next;
  else steps.push(next);
  return withSteps(base, steps);
}

/**
 * The reply has ended (finished, failed or stopped): close open reasoning.
 * Tool calls keep their state. One still `pending`/`running` on a settled
 * message is shown as not finished, never as still spinning.
 */
export function settleSteps(m: ChatMessage, now: number): ChatMessage {
  return closeReasoning(m, now);
}

const TOOL_STATES = new Set(['pending', 'running', 'success', 'error']);
const isTime = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Steps as they can be rendered, from whatever a message carries. Saved
 * conversations come back from an app's storage — older versions, hand
 * edits, corruption — and one bad message must never break the chat.
 *
 * A step that is already well-formed is returned AS THE SAME OBJECT (callers
 * cache by identity, e.g. a renderTool result). Anything else is repaired into
 * a copy, or dropped when there is nothing to show (unknown types, non-objects).
 * Times that don't make sense lose their end time, so no duration is shown.
 */
export function sanitizeSteps(steps: unknown): MessageStep[] {
  if (!Array.isArray(steps)) return [];
  const out: MessageStep[] = [];
  steps.forEach((s: any, i) => {
    if (!s || typeof s !== 'object') return;
    const at = isTime(s.at) && s.at > 0 ? Math.floor(s.at) : 0;
    const timesOk = isTime(s.startedAt) && (s.endedAt === undefined || (isTime(s.endedAt) && s.endedAt >= s.startedAt));
    if (s.type === 'reasoning') {
      const ok = typeof s.id === 'string' && typeof s.text === 'string' && s.at === at && timesOk;
      if (ok) return void out.push(s as ReasoningStep);
      out.push({
        type: 'reasoning',
        id: typeof s.id === 'string' && s.id ? s.id : `reasoning-${i}`,
        text: typeof s.text === 'string' ? s.text : '',
        ...(s.redacted === true ? { redacted: true } : {}),
        at,
        startedAt: isTime(s.startedAt) ? s.startedAt : 0,
        ...(timesOk && s.endedAt !== undefined ? { endedAt: s.endedAt } : {}),
      });
    } else if (s.type === 'tool') {
      const ok =
        typeof s.id === 'string' && s.id && typeof s.name === 'string' && TOOL_STATES.has(s.state) &&
        s.at === at && timesOk;
      if (ok) return void out.push(s as ToolStep);
      const state = TOOL_STATES.has(s.state)
        ? s.state
        : s.error !== undefined ? 'error' : s.output !== undefined ? 'success' : 'running';
      const tool: ToolStep = {
        type: 'tool',
        id: typeof s.id === 'string' && s.id ? s.id : typeof s.id === 'number' ? String(s.id) : `tool-${i}`,
        name: typeof s.name === 'string' ? s.name : '',
        state,
        at,
        startedAt: isTime(s.startedAt) ? s.startedAt : 0,
      };
      if (typeof s.title === 'string') tool.title = s.title;
      if (s.args !== undefined) tool.args = s.args;
      if (typeof s.argsText === 'string') tool.argsText = s.argsText;
      if (s.output !== undefined) tool.output = s.output;
      if (s.error !== undefined) tool.error = errorText(s.error);
      if (timesOk && s.endedAt !== undefined) tool.endedAt = s.endedAt;
      out.push(tool);
    }
    // Any other type: a newer version's step, or junk. Nothing to show.
  });
  return out;
}

/** An error as text, whatever a backend sent: a string, an Error, `{ message }`. */
export function errorText(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/** Has this tool call stopped without an outcome? */
export function toolUnfinished(tool: ToolStep, message: ChatMessage): boolean {
  return !message.streaming && (tool.state === 'pending' || tool.state === 'running');
}
