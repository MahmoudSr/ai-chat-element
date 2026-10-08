# ai-chat-element — AI assistant integration guide

> **For developers using an AI coding assistant (Claude, Copilot, Cursor, etc.):**
> paste this file into your assistant's context when asking it to integrate
> `ai-chat-element`. It contains everything the assistant needs to wire the
> component up correctly, without guessing.

**Live playground** (every option, with a code export you can paste):
https://mahmoudsr.github.io/ai-chat-element/examples/playground.html — useful for
picking values to put in the CSS variables and attributes described below.

---

## What this package is

`ai-chat-element` is a **framework-agnostic Web Component** (`<ai-chat>`) that
renders a streaming AI chat UI. It works in React, Angular, Vue, Svelte, and
plain HTML because it is a standard custom element. It ships its own styles
(Shadow DOM) and has zero peer dependencies.

- Package name: `ai-chat-element`
- Main import: `import 'ai-chat-element'` (registers `<ai-chat>`)
- Named exports: `openAIAdapter`, `anthropicAdapter`, `functionAdapter`, `AiChat`
- Types: `ChatMessage`, `ChatTransport`, `StreamChunk`, `Role`, `FinishReason`,
  `TokenUsage`, `Attachment`, `MessageAction`, `ChatLabels`, `OpenAIAdapterOptions`,
  `AnthropicAdapterOptions`

## The two-step mental model (do NOT skip step 2)

1. `import 'ai-chat-element'` to register the `<ai-chat>` element.
2. Set the `.transport` **property** in JavaScript — this tells the component
   which backend to stream from. Without a transport, the component renders but
   cannot chat.

```js
import 'ai-chat-element';
import { functionAdapter } from 'ai-chat-element';

const chat = document.querySelector('ai-chat');
// Production-safe: talk to your own server, which holds the API key (see below).
// A raw-apiKey adapter is dev/local-only — see CRITICAL rule 4.
chat.transport = functionAdapter(async function* (messages, signal) {
  const res = await fetch('/api/chat', { method: 'POST', signal, body: JSON.stringify(messages) });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield dec.decode(value);
  }
});
```

## CRITICAL rules for AI assistants

1. **`.transport`, `.messages`, and `.labels` are PROPERTIES, not attributes.**
   Set them with JS (`el.transport = …`), never as HTML attributes. They hold
   objects/functions that don't serialize to strings.
2. **Everything else is an attribute:** `theme`, `placeholder`, `empty-heading`,
   `empty-body`, `show-names`, `show-timestamps`, `assistant-bubble`,
   `show-header`, `show-clear`, `show-retry`, `show-copy`, `show-edit`,
   `show-aside`, `aside-side`, `system-prompt`, `disabled`.
3. **Boolean attributes turn off with `="false"`**, e.g. `show-timestamps="false"`.
4. **Never put a raw API key in browser-shipped code** for production. Point an
   adapter's `baseURL` at your own server (which holds the key), or use
   `functionAdapter` to call your `/api/chat` endpoint.
5. **In React**, set `.transport` in a `useEffect` via a `ref` — you cannot pass
   an object through JSX props to a custom element reliably. Also add a JSX type
   shim (see below).
6. **Model IDs:** OpenAI e.g. `gpt-4o-mini`; Anthropic e.g. `claude-sonnet-5`,
   `claude-opus-4-8`, `claude-haiku-4-5` (no date suffixes). For a local Ollama
   server, set `baseURL: 'http://localhost:11434/v1/chat/completions'` and any
   model you've pulled (e.g. `llama3.2`), with no `apiKey`.

## Transports

| Adapter            | Use for                                                        |
| ------------------ | -------------------------------------------------------------- |
| `openAIAdapter`    | OpenAI + any OpenAI-compatible server (Ollama, Groq, vLLM, …). |
| `anthropicAdapter` | Anthropic Messages API.                                        |
| `functionAdapter`  | Any custom backend — wrap an async generator of text chunks.   |

**Adapter options.** `openAIAdapter({ model, apiKey?, baseURL?, headers?, params? })`
and `anthropicAdapter({ model, apiKey?, baseURL?, headers?, maxTokens?, params?,
browserAccess? })`. `model` is the only required one. Notes:

- `params` is merged into the request body — sampling options go here.
- `headers` adds request headers, e.g. for a proxy that injects auth server-side.
- `maxTokens` (Anthropic only) defaults to 1024; the API requires it.
- `browserAccess` (Anthropic only, default `true`) opts in to the CORS header
  needed to call Anthropic straight from a browser. Ignored behind your own proxy.

```js
chat.transport = openAIAdapter({
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/v1/chat/completions',  // keyless local server
  params: { temperature: 0.4, top_p: 0.9 },
});
```

```js
// Custom backend (recommended for production — key stays on the server)
import { functionAdapter } from 'ai-chat-element';
chat.transport = functionAdapter(async function* (messages, signal) {
  const res = await fetch('/api/chat', { method: 'POST', signal,
    body: JSON.stringify(messages) });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield dec.decode(value);   // yield each text chunk
  }
});
```

A transport is any object with:
`send(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<StreamChunk>`
where `StreamChunk` is
`{type:'delta',delta} | {type:'done', finishReason?, usage?} | {type:'error',error}`.
The `done` chunk may carry `finishReason` (`FinishReason`) and `usage`
(`TokenUsage`) — both optional; see the events note below.

## API surface

**Attributes:** `theme` (`auto`|`light`|`dark`), `placeholder`, `empty-heading`,
`empty-body`, `show-names`, `show-timestamps`, `assistant-bubble`, `show-header`,
`show-clear`, `show-retry` (default on), `show-copy` (default on — per-message
copy button), `show-edit` (user messages only; fires `ai-chat:message-edit`),
`show-aside`, `aside-side`
(`left`|`right`), `aside-breakpoint` (px of the CHAT's width, default 560, `0`
never: below it the sidebar is a drawer with a built-in toggle), `aside-open`
(drawer open on a narrow chat; set it from your own button; reflected),
`hide-aside-toggle` (keep the drawer, hide the built-in toggle), `system-prompt`, `disabled`, `allow-attachments`, `hide-attach-button` (keep
paste/drag but hide the built-in button), `accept` (default `image/*`),
`max-attachments` (default 5), `max-attachment-size` (bytes, 0 = no cap),
`conversation-id` (your storage key for the conversation on screen; echoed back on
`ai-chat:background-message`), `abort-on-switch` (cancel an in-flight reply on
conversation switch/clear instead of finishing it in the background),
`assistant-avatar-src` / `user-avatar-src` (avatar image URLs; win over the
slots), `has-earlier` (older messages exist: shows "Load earlier messages" at the top and
fires `ai-chat:load-earlier`; clear it at the first message), `load-earlier`
(`scroll` default — loads as the reader nears the top, button too — or `button`
— only on click), `allow-images` (render images in replies — off by default because a model-written
image URL can leak data; off, images show as alt text), `image-hosts`
(space-separated URL prefixes images may load from with `allow-images`; only
`https:`; array property `.imageHosts`).

**Properties (JS only):** `.transport` (required), `.messages`, `.labels`,
`.messageActions` (`(message) => MessageAction[]` — your own buttons in a
message's actions row, `{ id, label, icon?, disabled? }`; `icon` is SVG markup,
sanitized; pressing one fires `ai-chat:message-action`; assign a new function
when its result depends on changed state), `.imageHosts`.

**Methods:** `send(text, attachments?)` → `Promise<boolean>` (resolves after the
stream settles; `false` = no-op, e.g. empty text AND no attachments, or no
transport), `retry()` →
`Promise<boolean>` (re-sends the last user turn), `addMessage(role, content)` →
`ChatMessage` (appends WITHOUT sending — returns the created message; use to seed
history), `stop()` → `void` (ALWAYS aborts the in-flight stream), `clear()` →
`void` (empties conversation + draft; an in-flight reply keeps generating in the
background unless `abort-on-switch` is set), `prependMessages(older)` →
`Promise<void>` (adds older messages ABOVE, keeping the reader's place — the
answer to `ai-chat:load-earlier`; call with `[]` on failure/no results to
re-enable the control), `isGenerating(conversationId)` →
`boolean` (is a reply still streaming for that conversation?).

**Events** (all bubble + composed; read `e.detail`; `ai-chat:message-action`
`{actionId, message, index}` fires when one of your `messageActions` buttons is
pressed; `ai-chat:aside-toggle` `{open}` fires when the reader opens/closes the
sidebar drawer — toggle, backdrop, Esc, or a `conversation-id` change; each ALSO
fires as
`ai-chat-<name>` with a dash — same detail, cancelling either cancels both. In an
Angular template bind the dash form, `(ai-chat-message)="…"`: Angular reads
`(ai-chat:message)` as a global target and fails to compile): `ai-chat:load-earlier`
`{conversationId, oldest}` (reader wants older messages — fires once until
`prependMessages()`; `oldest` is the paging cursor; dropped if the conversation
on screen changes first), `ai-chat:submit`
`{content, attachments}`, `ai-chat:message` `{message}` (fires only for a completed
reply that HAS content — not for empty or failed turns, so persisting on it won't
save blank messages; `message` carries `finishReason`/`usage` when reported),
`ai-chat:error` `{error}`, `ai-chat:new-chat` `{messages}` (cancelable — fired by
the New-chat button before clearing; `preventDefault()` keeps the current
conversation, and `messages` is what's about to be cleared), `ai-chat:attach`
`{attachments}` (cancelable — fired after picked/dropped/pasted files pass
validation; `preventDefault()` drops them from the tray; mutate `attachment.url`
to swap in an uploaded URL before send), `ai-chat:attach-rejected`
`{file, reason, message}` (reason = `type`|`size`|`too-many`),
`ai-chat:message-edit` `{index, message, newContent}` (fired when the user
confirms an inline edit with `show-edit`; the component does NOT mutate
`.messages` — the consumer decides. ChatGPT behaviour =
`chat.messages = chat.messages.slice(0, index); chat.send(newContent)`),
`ai-chat:preview` `{attachment}` (cancelable — fired when an image is clicked,
staged or sent; `preventDefault()` suppresses the built-in overlay so you can
open your own lightbox), `ai-chat:background-message`
`{conversationId, message, done}` (a reply still streaming for a conversation the
user switched away from — per token with `done:false`, then once with `done:true`
when it settles; see Background streaming below).

```js
chat.addEventListener('ai-chat:message', (e) => console.log(e.detail.message));
```

**Finish reason & token usage:** the settled `message` carries optional
`finishReason` and `usage` when the transport reports them.
`finishReason: FinishReason` is normalized across providers to one vocabulary —
`'stop'` | `'length'` (truncated at the token limit) | `'content_filter'` |
`'tool_calls'` | `'other'` — so consumers don't branch per-provider.
`usage: TokenUsage` is `{ inputTokens?, outputTokens? }`. Both are `undefined`
when the provider (or a local server like some Ollama builds) doesn't report
them. The OpenAI adapter opts into usage reporting automatically
(`stream_options: { include_usage: true }`); custom transports attach the same
fields to their own `done` chunk.

## Background streaming (conversation switch)

Switching conversations mid-reply does NOT cancel the reply (same as
ChatGPT/Claude), and switching BACK shows it still streaming live. Set
`conversation-id` whenever you swap `.messages` and the component does the rest:

```js
function switchTo(id) {
  chat.conversationId = id;      // ← the one line that makes this work
  chat.messages = load(id);      // a reply in flight for `id` resumes rendering
}
```

To persist a reply that finishes while the user is elsewhere:

```js
chat.addEventListener('ai-chat:background-message', (e) => {
  const { conversationId, message, done } = e.detail;
  if (!done) return;                     // per-token progress; ignore for storage
  save(conversationId, message);         // finished reply (check message.error)
});
```

- `conversationId` is the id that was active when that turn was SENT — use it as
  your storage key.
- `chat.isGenerating(id)` → boolean, for marking a row in your history list.
  Toggle that marker IN PLACE on per-token events — never rebuild the list DOM
  per token (it destroys the row mid-click; clicks then need several presses).
- Fires ONLY for conversations the user left; a visible reply settles normally on
  `ai-chat:message`.
- A failed background stream still fires `done:true` with `message.error` set, but
  does NOT fire `ai-chat:error` (no visible conversation to attach it to).
- `stop()` / the Stop button / Esc ALWAYS abort — only an implicit switch or
  `clear()` detaches. Returning to a generating conversation re-arms Stop.
- `clear()` (New-chat) drops `conversationId` so the fresh chat doesn't adopt the
  outgoing conversation's stream — assign your own id on `ai-chat:new-chat`.
- Removing the element aborts every detached stream (no leaked requests).
- The component still holds ONE visible conversation; it keeps a background reply
  only until it settles. You still own history/storage.
- `abort-on-switch` restores the pre-0.4.0 behaviour (cancel on switch).

## Customization (all optional)

- **Theme:** `theme="dark|light|auto"` (auto follows the OS).
- **One-color rebrand:** CSS `--ai-chat-accent` cascades to buttons, user
  bubble, focus ring, and links.
- **Corner radius:** `--ai-chat-radius` (default 8px) rounds every inner element
  together, including `--ai-chat-outer-radius` (the whole widget frame; set to 0
  for a square frame).
- **Names/timestamps:** on by default; rename via
  `chat.labels = { userName, assistantName }`; toggle with `show-names`,
  `show-timestamps`.
- **Message style:** AI messages are borderless plain text by default; add
  `assistant-bubble` to wrap them in a bubble.
- **Avatars:** opt-in. Simplest: `assistant-avatar-src="/bot.png"` /
  `user-avatar-src="/me.png"` (image URLs; win over the slots). Or slots —
  `<img slot="assistant-avatar">`, `<span slot="user-avatar">ME</span>`. Slotted
  avatars are CLONED into each message inside the shadow DOM, so page CSS can't
  reach them: a framework component styled by page CSS renders blank — use the
  `-src` attributes for those. No emoji by default.
- **Header & new-chat button:** `show-header` renders a title bar; `show-clear`
  adds a New-chat button. Replace the whole bar via the `header` slot.
- **Retry:** on by default (`show-retry`); a failed message shows a Retry button
  that re-sends the last user turn. Also callable as `chat.retry()`.
- **Conversation history:** `show-aside` turns on a sidebar column with a
  full-width New-chat button pinned at its top (ChatGPT/Claude layout; enable via
  `show-clear`). Put your own conversation list in the `aside` slot. The component
  stores only ONE conversation — you own the list/storage. Save the outgoing chat
  on the `ai-chat:new-chat` event, switch by setting `chat.messages = saved`, and
  set `chat.conversationId` alongside it (see Background streaming). Use
  `aside-side="right"` and `--ai-chat-aside-width` to place/size it.
- **Composer / input:** one rounded box with the send button inside on the right
  and a bottom action row. Add your own buttons (attach, mic, TTS) via the
  `composer-actions-start` (left) and `composer-actions-end` (right, before send)
  slots — no layout work needed. `--ai-chat-input-max-height` (default 200px) caps
  how tall it grows before scrolling.
- **Attachments:** off by default; `allow-attachments` adds a built-in attach
  button + drag-drop + paste (paste a screenshot straight in). Only IMAGES are
  auto-sent to the built-in OpenAI/Anthropic adapters (their chat APIs take images
  directly; no slot for generic files) — other files still render and reach you
  via `ai-chat:submit` with the raw `File`, so your own backend can handle a PDF.
  Config: `accept` (types), `max-attachments` (default 5), `max-attachment-size`
  (bytes). To upload to storage instead of sending inline data URLs, listen for
  the cancelable `ai-chat:attach` and set `attachment.url` to the uploaded URL.
  Replace the button icon via the `attach-icon` slot. Want paste/drag WITHOUT the
  built-in button? Add `hide-attach-button` and trigger the picker yourself via
  `chat.openFilePicker()`.
- **Keyboard:** Enter sends, Shift+Enter = newline, Esc stops an in-flight
  response (works from anywhere inside the widget).
- **i18n / all strings:** override any subset via the `.labels` object
  (`userName`, `assistantName`, `emptyHeading`, `emptyBody`, `copy`, `copied`,
  `typing`, `send`, `stop`, `jumpToLatest`, `inputLabel`, `messagesRegion`,
  `headerTitle`, `clearChat`, `retry`, `emptyResponse`, `copyMessage`, `edit`,
  `saveEdit`, `cancelEdit`, `previewImage` (uses `{name}`), `closePreview`,
  `loadEarlier`, `loadingEarlier`, `openAside`, `closeAside`, `attach`,
  `removeAttachment`, `attachTooLarge`, `attachWrongType`, `attachTooMany` — the
  three `attach*` messages use `{name}` as a filename placeholder).
- **Deep styling:** `::part()` hooks — `root`, `layout`, `aside`, `aside-list`,
  `header`, `header-slot`, `header-title`, `clear-button`, `messages`, `message`,
  `message-user`, `message-assistant`, `message-system`, `bubble`, `avatar`,
  `meta`, `name`, `time`, `message-attachments`, `message-attachment`,
  `message-actions`, `action-button`, `copy-button`, `edit-button`,
  `message-edit`, `edit-input`, `edit-actions`, `edit-save-button`,
  `edit-cancel-button`, `preview`, `preview-image`, `preview-close`, `composer`,
  `composer-box`, `composer-attachments`, `attachment-chip`, `attachment-remove`,
  `composer-actions`, `composer-actions-start`, `composer-actions-end`,
  `attach-button`, `input`, `send-button`, `stop-button`, `jump-button`,
  `retry-button`, `aside-toggle`, `aside-scrim`, `custom-action`, `load-earlier`, `load-earlier-row`, `empty`, `empty-icon`,
  `empty-heading`, `empty-body`, `error`, `empty-response`.
  (`header` = the built-in bar; `header-slot` = the wrapper that also holds your
  `header` slot content and keeps the bar's padding/divider when you fill it.
  Every message row exposes both `message` and a per-role part —
  `message-user` / `message-assistant` / `message-system` — so you can style one
  side without a `[data-role]` selector.)

## All CSS variables (complete — do not invent names not on this list)

Set on the `ai-chat` element or `:root`. Defaults shown; most inherit a parent
so setting a few is enough (e.g. all radii follow `--ai-chat-radius`).

Colors: `--ai-chat-bg` (#fff), `--ai-chat-fg` (#1a1a1a), `--ai-chat-muted`
(#6b7280), `--ai-chat-border` (#e5e7eb), `--ai-chat-accent` (#4f46e5),
`--ai-chat-accent-fg` (#fff), `--ai-chat-user-bg` (=accent), `--ai-chat-user-fg`
(=accent-fg), `--ai-chat-assistant-bg` (#f3f4f6), `--ai-chat-assistant-fg`
(#1a1a1a), `--ai-chat-code-bg` (#0d1117), `--ai-chat-code-fg` (#e6edf3),
`--ai-chat-error` (#dc2626). Dark mode auto-swaps bg/fg/muted/border/assistant-*.
Per-message action buttons: `--ai-chat-action-color` (= muted),
`--ai-chat-action-hover-color` (= fg), `--ai-chat-action-hover-bg` (fg 8%).
Image preview overlay: `--ai-chat-preview-backdrop` (subtle black 35%; `0` for
none, darker for a classic lightbox). Images carry a hairline edge so a light
screenshot reads on a light chat: `--ai-chat-image-border-width` (1px, `0`
removes) and `--ai-chat-image-border-color` (fg 14%).

Keyboard focus ring (`:focus-visible` only, subtle by default):
`--ai-chat-focus-color` (softened accent), `--ai-chat-focus-width` (2px, 0 removes),
`--ai-chat-focus-offset` (2px).

Borders (0 removes): `--ai-chat-border-width` (1px), `--ai-chat-input-border-width`,
`--ai-chat-composer-border-width` (0), `--ai-chat-header-border-width`,
`--ai-chat-code-border-width`, `--ai-chat-table-border-width`.

Reply content (markdown; defaults derive from the palette, dark mode follows):
`--ai-chat-table-header-bg` (fg 5%), `--ai-chat-table-header-fg` (= muted),
`--ai-chat-table-row-divider` (= border; rules between rows only),
`--ai-chat-table-stripe-bg` (transparent), `--ai-chat-table-cell-padding`
(6px 12px), `--ai-chat-table-radius` (= radius-sm), `--ai-chat-link-color`
(= accent), `--ai-chat-link-hover-color`, `--ai-chat-strong-fg` (inherit),
`--ai-chat-heading-fg` (inherit), `--ai-chat-marker-color` (= muted),
`--ai-chat-blockquote-border` (= border). Tables use tabular numerals and honour
markdown column alignment.

Radius (all = --ai-chat-radius): `--ai-chat-radius` (8px), `--ai-chat-outer-radius`
(= radius; 0 for square), `--ai-chat-bubble-radius`, `--ai-chat-input-radius`, `--ai-chat-button-radius`,
`--ai-chat-send-radius`, `--ai-chat-new-chat-radius` (= button-radius),
`--ai-chat-jump-radius` (50%), `--ai-chat-code-radius`,
`--ai-chat-avatar-radius`, `--ai-chat-attachment-radius`,
`--ai-chat-action-radius` (= button-radius), `--ai-chat-radius-sm`.
Note: `--ai-chat-button-radius: 50%` gives circular icon buttons but turns the
sidebar's full-width New-chat button into a pill — set `--ai-chat-new-chat-radius`
(e.g. to the master radius) to keep that button rectangular.

Fonts/size: `--ai-chat-font`, `--ai-chat-font-mono`, `--ai-chat-font-size` (15px),
`--ai-chat-line-height` (1.55), `--ai-chat-max-width` (760px), `--ai-chat-gap`
(16px), `--ai-chat-avatar-size` (32px), `--ai-chat-avatar-bg` (= assistant-bg; the
avatar tile), `--ai-chat-button-size` (42px),
`--ai-chat-send-size` (34px), `--ai-chat-clear-size` (32px), `--ai-chat-jump-size`
(36px), `--ai-chat-input-max-height` (200px),
`--ai-chat-attachment-thumb-size` (32px),
`--ai-chat-attachment-image-max-width` (320px),
`--ai-chat-action-size` (28px; per-message action buttons),
`--ai-chat-show-avatars` (grid; `none` hides).

Padding: `--ai-chat-bubble-inset-x` (14px; horizontal text inset — the name/time
label aligns to it, and `--ai-chat-bubble-padding` derives its horizontal value
from it), `--ai-chat-bubble-padding`, `--ai-chat-input-padding`,
`--ai-chat-messages-padding`, `--ai-chat-composer-padding`, `--ai-chat-header-padding`,
`--ai-chat-messages-scrollbar-gutter` (stable; `auto` gives the strip back).

Sidebar (with show-aside): `--ai-chat-aside-width` (260px), `--ai-chat-aside-bg`
(transparent), `--ai-chat-aside-padding` (12px), `--ai-chat-aside-scrollbar-gutter`
(auto; `stable` reserves the strip), `--ai-chat-aside-drawer-bg` (= bg; the drawer
on a narrow chat), `--ai-chat-aside-scrim` (rgb(0 0 0 / 0.3); behind the drawer).

- **Icon slots:** `send-icon`, `stop-icon`, `jump-icon`, `clear-icon`,
  `retry-icon`, `copy-icon`, `edit-icon`, `error-icon`, `empty-icon`,
  `aside-toggle-icon`.
- **Composer action slots:** `composer-actions-start`, `composer-actions-end`.

## React type shim (React < 19)

```ts
declare namespace JSX {
  interface IntrinsicElements { 'ai-chat': any; }
}
```

## Minimal working examples

### Plain HTML

```html
<ai-chat theme="auto" placeholder="Ask me anything…"></ai-chat>
<script type="module">
  import 'ai-chat-element';
  import { openAIAdapter } from 'ai-chat-element';
  document.querySelector('ai-chat').transport =
    openAIAdapter({ apiKey: 'sk-…', model: 'gpt-4o-mini' });
</script>
```

### React

```tsx
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import { useEffect, useRef } from 'react';

export function Chat() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    (ref.current as any).transport =
      openAIAdapter({ apiKey: import.meta.env.VITE_KEY, model: 'gpt-4o-mini' });
  }, []);
  return <ai-chat ref={ref} theme="dark" />;
}
```
