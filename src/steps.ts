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

  // An outcome without an explicit state implies one.
  const state =
    chunk.state ??
    (chunk.error !== undefined ? 'error' : chunk.output !== undefined ? 'success' : prev?.state ?? 'running');

  const next: ToolStep = {
    type: 'tool',
    id: chunk.id,
    name: chunk.name ?? prev?.name ?? '',
    state,
    at: prev?.at ?? base.content.length,
    startedAt: prev?.startedAt ?? now,
  };
  const title = chunk.title ?? prev?.title;
  if (title !== undefined) next.title = title;
  const args = chunk.args !== undefined ? chunk.args : prev?.args;
  if (args !== undefined) next.args = args;
  const argsText =
    chunk.argsDelta !== undefined ? (prev?.argsText ?? '') + chunk.argsDelta : prev?.argsText;
  if (argsText !== undefined) next.argsText = argsText;
  const output = chunk.output !== undefined ? chunk.output : prev?.output;
  if (output !== undefined) next.output = output;
  const error = chunk.error ?? prev?.error;
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

/** Has this tool call stopped without an outcome? */
export function toolUnfinished(tool: ToolStep, message: ChatMessage): boolean {
  return !message.streaming && (tool.state === 'pending' || tool.state === 'running');
}
