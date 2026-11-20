# Header, names and avatars

The parts around the conversation: a header, the New chat button, Retry, sender
names, timestamps and avatars. All optional, all renameable.

<LiveDemo scenario="chrome" :height="400" />

The demo's first reply fails on purpose. Press **Retry**.

## Header and New chat

```html
<ai-chat show-header show-clear></ai-chat>
```

- `show-header` adds a bar at the top of the chat column with a title (the
  `headerTitle` label). It never spans the sidebar.
- `show-clear` adds the New chat button: in the header, at the top of the
  sidebar when there is one, or floating at the top right when there's neither.
  It fires the cancelable `ai-chat:new-chat` event, then clears.

Replace the whole bar with your own content in the `header` slot. It keeps the
bar's padding and divider, so you only lay out what's inside:

```html
<ai-chat show-header>
  <div slot="header">Acme Assistant</div>
</ai-chat>
```

## Retry

A failed reply shows the error and a **Retry** button that sends the last
message again. It's on by default; `show-retry="false"` removes it. Call
`chat.retry()` to do the same from code.

## Names and timestamps

Each message shows who sent it and when. Both are on by default:

```html
<ai-chat show-names="false" show-timestamps="false"></ai-chat>
```

Rename the senders with labels: the defaults are "You" and "AI bot".

```js
chat.labels = { userName: 'You', assistantName: 'Acme' };
```

## Avatars

There are none by default. For a picture, give a URL:

```html
<ai-chat assistant-avatar-src="/bot.png" user-avatar-src="/me.png"></ai-chat>
```

Or put any content in the `assistant-avatar` and `user-avatar` slots, like the
initials in the demo:

```html
<ai-chat>
  <span slot="assistant-avatar" style="background:#16181d; color:#fff">AC</span>
</ai-chat>
```

::: warning Slotted avatars are copied
One element can't appear in every message, so each message gets a **copy**
inside the component, where your page's CSS doesn't reach. Plain images,
initials with inline styles and inline SVG work. A framework component styled
by page CSS shows blank; use `assistant-avatar-src` for those.
:::

## Bubbles

Your messages sit in a bubble; replies are plain text, like ChatGPT and Claude.
Put replies in a bubble too with `assistant-bubble`, as the demo does.
