# ai-chat-element

A reusable, framework-agnostic **AI chat UI** as a Web Component. Drop `<ai-chat>` into **React, Angular, Vue, Svelte, or plain HTML** — it's a standard custom element, so it works everywhere.

### ▶︎ [Try it in the playground](https://mahmoudsr.github.io/ai-chat-element/examples/playground.html)

Every attribute, all 51 CSS variables, every label and slot — live. Pick a preset,
tweak it, and copy the generated code straight into your app.

- 🎨 **Customizable to the corner** — **51 CSS variables, every one documented**; nothing is hardcoded. One line rebrands it (`--ai-chat-accent`); one knob rounds it (`--ai-chat-radius`); every surface has its own override when you need it.
- 🔌 **Pluggable transport** — built-in adapters for OpenAI-compatible & Anthropic APIs, or bring your own backend
- 🌊 **Streaming** token-by-token with a stop button and jump-to-latest
- 📝 **Markdown + syntax-highlighted code** with copy buttons
- 🧩 **Yours to shape** — 14 slots, 30 `::part()` hooks, sender names, timestamps, avatars, and every string (i18n-ready). No emoji by default.
- ♿ **Accessible** — ARIA live region, keyboard support, respects reduced-motion
- 📦 **~80 KB gzipped**, zero peer dependencies

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
  import 'https://esm.sh/ai-chat-element';
  import { openAIAdapter } from 'https://esm.sh/ai-chat-element';

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

```tsx
import 'ai-chat-element';
import { functionAdapter } from 'ai-chat-element';
import { useEffect, useRef } from 'react';

export function Chat() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Properties (transport) must be set in JS, not as attributes.
    // Talk to your own /api/chat route so the API key stays on the server.
    (ref.current as any).transport = functionAdapter(async function* (messages, signal) {
      const res = await fetch('/api/chat', { method: 'POST', signal, body: JSON.stringify(messages) });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
      }
    });
  }, []);
  return <ai-chat ref={ref} theme="dark" />;
}
```

> In React < 19, add a type shim so `<ai-chat>` is recognized — see [TypeScript](#typescript).

### Vue

```vue
<template>
  <ai-chat ref="chat" theme="auto" />
</template>

<script setup>
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import { onMounted, ref } from 'vue';

const chat = ref(null);
onMounted(() => {
  chat.value.transport = openAIAdapter({ apiKey: '…', model: 'gpt-4o-mini' });
});
</script>
```

### Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to your module, then:

```ts
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';

@Component({ template: `<ai-chat #chat theme="light"></ai-chat>` })
export class ChatComponent implements AfterViewInit {
  @ViewChild('chat') chat!: ElementRef;
  ngAfterViewInit() {
    this.chat.nativeElement.transport =
      openAIAdapter({ apiKey: '…', model: 'gpt-4o-mini' });
  }
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

### Custom backend (recommended for production) 🔒

**The safe pattern: your server holds the API key** and streams plain text back;
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
| `placeholder`      | string                      | —       | Input placeholder text.                                                           |
| `empty-heading`    | string                      | —       | Heading shown when there are no messages.                                         |
| `empty-body`       | string                      | —       | Secondary line under the empty heading.                                           |
| `show-names`       | boolean                     | `true`  | Show the sender name above each message.                                          |
| `show-timestamps`  | boolean                     | `true`  | Show a time (e.g. "3:45 PM") next to the name.                                    |
| `assistant-bubble` | boolean                     | `false` | Wrap AI messages in a bubble. Off = borderless plain text (ChatGPT/Claude style). |
| `show-header`      | boolean                     | `false` | Show the built-in header bar (title + new-chat button).                           |
| `show-clear`       | boolean                     | `false` | Show the New/Clear-chat button (in the header, or floating top-right).            |
| `show-retry`       | boolean                     | `true`  | Show a Retry button on a failed message that re-sends the last user turn.         |
| `show-aside`       | boolean                     | `false` | Show the sidebar column (fill the `aside` slot with your history list).           |
| `aside-side`       | `left` \| `right`           | `left`  | Which side the sidebar sits on.                                                   |
| `system-prompt`    | string                      | —       | Prepended to every request (not shown in UI).                                     |
| `disabled`         | boolean                     | `false` | Disables the input.                                                               |

To turn a boolean attribute off, set it to `"false"` (e.g. `show-timestamps="false"`).

Set via JS only (they hold objects/arrays):

| Property     | Type                  | Description                                        |
| ------------ | --------------------- | -------------------------------------------------- |
| `.transport` | `ChatTransport`       | **Required.** The backend to talk to.              |
| `.messages`  | `ChatMessage[]`       | The conversation (read or seed it).                |
| `.labels`    | `Partial<ChatLabels>` | Override any UI/accessibility strings (see below). |

**Methods:** `send(text)`, `stop()`, `clear()`, `retry()`, `addMessage(role, content)`.

**Events:** `ai-chat:submit`, `ai-chat:message`, `ai-chat:error`, `ai-chat:new-chat`.

`ai-chat:message` fires once per completed assistant turn — but **only when the
reply has content**. Empty responses and failed turns don't fire it, so if you
persist on this event you won't save blank/ghost messages.

```js
chat.addEventListener('ai-chat:message', (e) => console.log(e.detail.message));
```

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
  render();
});

// Click a past conversation to load it.
function switchTo(id) {
  const current = conversations.find((c) => c.id === activeId);
  if (current) current.messages = [...chat.messages];
  activeId = id;
  chat.messages = [...conversations.find((c) => c.id === id).messages];
  render();
}

render();
```

See `examples/playground.html` for a complete, working version (with titles
generated from the first message). Use `aside-side="right"` to put it on the
right, and `--ai-chat-aside-width` / `--ai-chat-aside-bg` to size and color it.

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
| `--ai-chat-button-size`      | `42px`            | Header/floating icon buttons                   |
| `--ai-chat-send-size`        | `34px`            | Send/stop button inside the composer           |
| `--ai-chat-clear-size`       | `32px`            | Compact New-chat icon button (header/floating) |
| `--ai-chat-jump-size`        | `36px`            | Jump-to-latest floating button                 |
| `--ai-chat-input-max-height` | `200px`           | Input grows to here, then scrolls              |
| `--ai-chat-show-avatars`     | `grid`            | `none` force-hides avatars even if slotted     |

**Spacing (padding)**

| Variable                     | Default          | Controls                |
| ---------------------------- | ---------------- | ----------------------- |
| `--ai-chat-bubble-padding`   | `4px 14px`       | Inside message bubbles  |
| `--ai-chat-input-padding`    | `8px 14px 2px`   | Inside the textarea     |
| `--ai-chat-messages-padding` | `20px 16px`      | Around the message list |
| `--ai-chat-composer-padding` | `12px 16px 16px` | Around the composer     |
| `--ai-chat-header-padding`   | `10px 16px`      | Inside the header bar   |

**Sidebar** (only shown with `show-aside`)

| Variable                  | Default       | Controls             |
| ------------------------- | ------------- | -------------------- |
| `--ai-chat-aside-width`   | `260px`       | Sidebar column width |
| `--ai-chat-aside-bg`      | `transparent` | Sidebar background   |
| `--ai-chat-aside-padding` | `12px`        | Inside the sidebar   |

### All `::part()` hooks

For styling that a variable can't reach, target the shadow parts with
`ai-chat::part(name) { … }`:

`layout`, `root`, `aside`, `aside-list`, `header`, `header-slot`, `header-title`,
`clear-button`, `messages`, `message`, `bubble`, `avatar`, `meta`, `name`,
`time`, `composer`, `composer-box`, `composer-actions`, `composer-actions-start`,
`composer-actions-end`, `input`, `send-button`, `stop-button`, `jump-button`,
`retry-button`, `empty`, `empty-icon`, `empty-heading`, `empty-body`, `error`,
`empty-response`.

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
| `jump-icon` / `error-icon`         | Jump-to-latest / error icons                                          |

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
  ChatLabels,
} from 'ai-chat-element';

const labels: Partial<ChatLabels> = { assistantName: 'Acme Assistant' };
const transport: ChatTransport = openAIAdapter({ model: 'gpt-4o-mini', apiKey: '…' });
```

Adapter option types (`OpenAIAdapterOptions`, `AnthropicAdapterOptions`) are
exported too, from either entry point.

For JSX (React), declare the tag once:

```ts
declare namespace JSX {
  interface IntrinsicElements {
    'ai-chat': any;
  }
}
```

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

[`examples/playground.html`](examples/playground.html) — every attribute, all 51
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
