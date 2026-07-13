# ai-chat-element — AI assistant integration guide

> **For developers using an AI coding assistant (Claude, Copilot, Cursor, etc.):**
> paste this file into your assistant's context when asking it to integrate
> `ai-chat-element`. It contains everything the assistant needs to wire the
> component up correctly, without guessing.

---

## What this package is

`ai-chat-element` is a **framework-agnostic Web Component** (`<ai-chat>`) that
renders a streaming AI chat UI. It works in React, Angular, Vue, Svelte, and
plain HTML because it is a standard custom element. It ships its own styles
(Shadow DOM) and has zero peer dependencies.

- Package name: `ai-chat-element`
- Main import: `import 'ai-chat-element'` (registers `<ai-chat>`)
- Named exports: `openAIAdapter`, `anthropicAdapter`, `functionAdapter`, `AiChat`
- Types: `ChatMessage`, `ChatTransport`, `StreamChunk`, `Role`, `ChatLabels`,
  `OpenAIAdapterOptions`, `AnthropicAdapterOptions`

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
   `show-header`, `show-clear`, `show-retry`, `show-aside`, `aside-side`,
   `system-prompt`, `disabled`.
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
where `StreamChunk` is `{type:'delta',delta} | {type:'done'} | {type:'error',error}`.

## API surface

**Attributes:** `theme` (`auto`|`light`|`dark`), `placeholder`, `empty-heading`,
`empty-body`, `show-names`, `show-timestamps`, `assistant-bubble`, `show-header`,
`show-clear`, `show-retry` (default on), `show-aside`, `aside-side`
(`left`|`right`), `system-prompt`, `disabled`.

**Properties (JS only):** `.transport` (required), `.messages`, `.labels`.

**Methods:** `send(text)`, `stop()`, `clear()`, `retry()`,
`addMessage(role, content)`.

**Events:** `ai-chat:submit` `{content}`, `ai-chat:message` `{message}`,
`ai-chat:error` `{error}`, `ai-chat:new-chat` `{messages}` (cancelable — fired by
the New-chat button; `preventDefault()` keeps the current conversation).

```js
chat.addEventListener('ai-chat:message', (e) => console.log(e.detail.message));
```

## Customization (all optional)

- **Theme:** `theme="dark|light|auto"` (auto follows the OS).
- **One-color rebrand:** CSS `--ai-chat-accent` cascades to buttons, user
  bubble, focus ring, and links.
- **Corner radius:** `--ai-chat-radius` (default 8px) rounds every inner element
  together. `--ai-chat-outer-radius` (default 0) rounds the whole widget frame.
- **Names/timestamps:** on by default; rename via
  `chat.labels = { userName, assistantName }`; toggle with `show-names`,
  `show-timestamps`.
- **Message style:** AI messages are borderless plain text by default; add
  `assistant-bubble` to wrap them in a bubble.
- **Avatars:** opt-in via slots — `<img slot="assistant-avatar">`,
  `<span slot="user-avatar">ME</span>`. No emoji by default.
- **Header & new-chat button:** `show-header` renders a title bar; `show-clear`
  adds a New-chat button. Replace the whole bar via the `header` slot.
- **Retry:** on by default (`show-retry`); a failed message shows a Retry button
  that re-sends the last user turn. Also callable as `chat.retry()`.
- **Conversation history:** `show-aside` turns on a sidebar column with a
  full-width New-chat button pinned at its top (ChatGPT/Claude layout; enable via
  `show-clear`). Put your own conversation list in the `aside` slot. The component
  stores only ONE conversation — you own the list/storage. Save the outgoing chat
  on the `ai-chat:new-chat` event, switch by setting `chat.messages = saved`. Use
  `aside-side="right"` and `--ai-chat-aside-width` to place/size it.
- **Composer / input:** one rounded box with the send button inside on the right
  and a bottom action row. Add your own buttons (attach, mic, TTS) via the
  `composer-actions-start` (left) and `composer-actions-end` (right, before send)
  slots — no layout work needed. `--ai-chat-input-max-height` (default 200px) caps
  how tall it grows before scrolling.
- **Keyboard:** Enter sends, Shift+Enter = newline, Esc stops an in-flight
  response (works from anywhere inside the widget).
- **i18n / all strings:** override any subset via the `.labels` object
  (`userName`, `assistantName`, `emptyHeading`, `emptyBody`, `copy`, `copied`,
  `typing`, `send`, `stop`, `jumpToLatest`, `inputLabel`, `messagesRegion`,
  `headerTitle`, `clearChat`, `retry`).
- **Deep styling:** `::part()` hooks — `root`, `layout`, `aside`, `aside-list`,
  `header`, `header-title`, `clear-button`, `messages`, `message`, `bubble`,
  `avatar`, `meta`, `name`, `time`, `composer`, `composer-box`,
  `composer-actions`, `composer-actions-start`, `composer-actions-end`, `input`,
  `send-button`, `stop-button`, `jump-button`, `retry-button`, `empty`,
  `empty-icon`, `empty-heading`, `empty-body`, `error`.

## All CSS variables (complete — do not invent names not on this list)

Set on the `ai-chat` element or `:root`. Defaults shown; most inherit a parent
so setting a few is enough (e.g. all radii follow `--ai-chat-radius`).

Colors: `--ai-chat-bg` (#fff), `--ai-chat-fg` (#1a1a1a), `--ai-chat-muted`
(#6b7280), `--ai-chat-border` (#e5e7eb), `--ai-chat-accent` (#4f46e5),
`--ai-chat-accent-fg` (#fff), `--ai-chat-user-bg` (=accent), `--ai-chat-user-fg`
(=accent-fg), `--ai-chat-assistant-bg` (#f3f4f6), `--ai-chat-assistant-fg`
(#1a1a1a), `--ai-chat-code-bg` (#0d1117), `--ai-chat-code-fg` (#e6edf3),
`--ai-chat-error` (#dc2626). Dark mode auto-swaps bg/fg/muted/border/assistant-*.

Borders (0 removes): `--ai-chat-border-width` (1px), `--ai-chat-input-border-width`,
`--ai-chat-composer-border-width` (0), `--ai-chat-header-border-width`,
`--ai-chat-code-border-width`, `--ai-chat-table-border-width`.

Radius (all = --ai-chat-radius): `--ai-chat-radius` (8px), `--ai-chat-outer-radius`
(0), `--ai-chat-bubble-radius`, `--ai-chat-input-radius`, `--ai-chat-button-radius`,
`--ai-chat-send-radius`, `--ai-chat-jump-radius` (50%), `--ai-chat-code-radius`,
`--ai-chat-avatar-radius`, `--ai-chat-radius-sm`.

Fonts/size: `--ai-chat-font`, `--ai-chat-font-mono`, `--ai-chat-font-size` (15px),
`--ai-chat-line-height` (1.55), `--ai-chat-max-width` (760px), `--ai-chat-gap`
(16px), `--ai-chat-avatar-size` (32px), `--ai-chat-button-size` (42px),
`--ai-chat-send-size` (34px), `--ai-chat-clear-size` (32px), `--ai-chat-jump-size`
(36px), `--ai-chat-input-max-height` (200px),
`--ai-chat-show-avatars` (grid; `none` hides).

Padding: `--ai-chat-bubble-padding`, `--ai-chat-input-padding`,
`--ai-chat-messages-padding`, `--ai-chat-composer-padding`, `--ai-chat-header-padding`.

Sidebar (with show-aside): `--ai-chat-aside-width` (260px), `--ai-chat-aside-bg`
(transparent), `--ai-chat-aside-padding` (12px).
- **Icon slots:** `send-icon`, `stop-icon`, `jump-icon`, `clear-icon`,
  `retry-icon`, `error-icon`, `empty-icon`.
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
