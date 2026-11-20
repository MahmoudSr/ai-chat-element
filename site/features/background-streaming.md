# Background streaming

Switching conversations while a reply is still streaming **doesn't cancel it**,
the same as ChatGPT and Claude. The request keeps running, and switching back
shows it still streaming, as if you never left.

Try it in the [history demo](./history): send a message, switch to the other
conversation while it writes, and come back.

## The one line it needs

Tell the component which conversation is on screen by setting
`conversation-id` whenever you change `.messages`:

```js
function switchTo(id) {
  chat.conversationId = id; // this is what lets a reply follow its conversation
  chat.messages = load(id);
}
```

If `id` has a reply still streaming, the component picks it back up, and the
Stop button returns so the reader can still cancel it.

## Saving a reply that finished elsewhere

```js
chat.addEventListener('ai-chat:background-message', (e) => {
  const { conversationId, message, done } = e.detail;
  if (!done) return; // per-token progress
  save(conversationId, message); // the finished reply; check message.error
});
```

- `conversationId` is the id that was on screen **when the message was sent**,
  so it's safe to use as your storage key.
- It fires only for replies in a conversation you left. The one on screen
  finishes through `ai-chat:message` as usual.
- A reply that fails in the background still finishes: `done: true` with
  `message.error` set. It doesn't fire `ai-chat:error`.

## Showing which chats are still working

`chat.isGenerating(id)` tells you whether a conversation still has a reply
streaming. The demo's pulsing dot uses it.

::: warning Update the list in place
`ai-chat:background-message` fires on every token. Update your marker on the
existing row; don't rebuild the list each time. A row rebuilt between the press
and the release of a click loses that click.
:::

## Details

- **Stop always cancels**, and so does **Esc**. Only switching conversation, or
  `clear()`, lets a reply carry on in the background.
- **New chat starts fresh.** `clear()` drops the current `conversation-id`, so
  the empty chat can't adopt the old reply. Give the new chat its own id in your
  `ai-chat:new-chat` handler.
- **Removing the element cancels everything** still streaming in the background.

To cancel replies on every switch instead, add `abort-on-switch`:

```html
<ai-chat abort-on-switch></ai-chat>
```
