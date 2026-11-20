# History sidebar

The component shows **one** conversation at a time, on purpose. Your app keeps
the list of past chats and decides where they're saved: a database, an account,
`localStorage`. The component gives you the pieces to build a ChatGPT-style
history around it.

<LiveDemo scenario="history" :height="440" />

## The pieces

- **`show-aside`** adds a sidebar column. Put your conversation list in its
  `aside` slot.
- **`show-clear`** adds the New chat button. With a sidebar it's a full-width
  button at the top of it.
- **`ai-chat:new-chat`** fires when New chat is pressed, **before** the chat
  clears. `e.detail.messages` is the conversation that's leaving, so you can save
  it. Call `e.preventDefault()` to keep it on screen instead.
- **Switch conversations** by setting `chat.messages`, and tell the component
  which one is on screen with `conversation-id`.

```html
<ai-chat show-aside show-clear>
  <nav slot="aside" id="history"></nav>
</ai-chat>
```

```js
const chat = document.querySelector('ai-chat');
const conversations = [{ id: 'c1', title: 'First chat', messages: [] }];
let active = 'c1';

function switchTo(id) {
  conversations.find((c) => c.id === active).messages = [...chat.messages];
  active = id;
  chat.conversationId = id;
  chat.messages = [...conversations.find((c) => c.id === id).messages];
}

chat.addEventListener('ai-chat:new-chat', (e) => {
  conversations.find((c) => c.id === active).messages = e.detail.messages;
  const id = crypto.randomUUID();
  conversations.unshift({ id, title: 'New chat', messages: [] });
  active = id;
  chat.conversationId = id;
  renderList(); // draw your list into #history
});
```

`aside-side="right"` moves the sidebar to the right. Size and colour it with
`--ai-chat-aside-width` and `--ai-chat-aside-bg`.

## On a narrow chat it's a drawer

When the chat itself is narrower than `aside-breakpoint` (560px by default), the
sidebar slides over the conversation instead of squeezing it, opened by a
built-in toggle. The backdrop, **Esc** or switching conversation closes it, and
keyboard focus moves into the drawer and back out.

| Attribute | Default | What it does |
| --- | --- | --- |
| `aside-breakpoint` | `560` | Chat width, in pixels, below which the sidebar is a drawer. `0` keeps it a column. |
| `aside-open` | off | Whether the drawer is open. Set it from your own button. |
| `hide-aside-toggle` | off | Hide the built-in toggle when you bring your own. |

`ai-chat:aside-toggle` fires with `{ open }` whenever the reader opens or closes
it.
