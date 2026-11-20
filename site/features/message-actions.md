# Message actions

Hovering a message shows a row of actions under it. **Copy** is built in and on
for every message. **Edit** is opt-in and only on your own messages.

<LiveDemo scenario="actions" :height="420" />

## Edit

```html
<ai-chat show-edit></ai-chat>
```

The message turns into an input: **Enter** saves, **Shift+Enter** adds a line,
**Esc** cancels. On save the chat fires `ai-chat:message-edit` and **doesn't
change `.messages`**. The conversation is your data, so you decide what an edit
means. What ChatGPT and Claude do is drop everything from that message on and
send the new text, which is what the demo above does:

```js
chat.addEventListener('ai-chat:message-edit', (e) => {
  const { index, newContent } = e.detail;
  chat.messages = chat.messages.slice(0, index); // drop the edited turn and all after
  chat.send(newContent);
});
```

## Your own buttons

Add buttons to the row (thumbs, Regenerate, Download as Excel) with
`messageActions`, a function called for each message that returns its buttons:

```js
chat.messageActions = (message) =>
  message.role === 'assistant'
    ? [
        { id: 'good', label: 'Good reply', icon: thumbUpSvg },
        { id: 'bad', label: 'Bad reply', icon: thumbDownSvg },
      ]
    : [];

chat.addEventListener('ai-chat:message-action', (e) => {
  const { actionId, message, index } = e.detail;
  saveFeedback(actionId, message);
});
```

Each button is `{ id, label, icon?, disabled? }`. `label` is the tooltip and the
accessible name, and the visible text when there's no `icon`. `icon` is SVG
markup; it's sanitized, and `currentColor` follows the theme.

## Turning them off

`show-copy="false"` removes Copy. Without `show-edit` there's no Edit.
