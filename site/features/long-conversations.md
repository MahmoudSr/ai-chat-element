# Long conversations

For a long conversation, show only the newest messages and load older ones as
the reader scrolls up. The component handles the scrolling and keeps the
reader's place. You own the storage and the paging, so it works with any
backend.

<LiveDemo scenario="long" :height="420" />

The demo holds 120 messages and serves them 20 at a time, with a short delay
like a real request. Scroll up.

```js
// Open a conversation with its newest page.
const page = await api.messages(conversationId, { limit: 30 });
chat.conversationId = conversationId;
chat.messages = page.messages;
chat.hasEarlier = page.hasMore;

// The reader scrolled near the top, or pressed "Load earlier messages".
chat.addEventListener('ai-chat:load-earlier', async (e) => {
  try {
    const older = await api.messages(e.detail.conversationId, {
      before: e.detail.oldest.id, // your paging cursor
      limit: 30,
    });
    await chat.prependMessages(older.messages);
    chat.hasEarlier = older.hasMore;
  } catch {
    await chat.prependMessages([]); // re-enables the control so they can try again
  }
});
```

## How it behaves

- **`has-earlier`** turns it on. Clear it once you've reached the first message.
- **`load-earlier`** is `scroll` by default: older messages load as the reader
  nears the top, and keep loading while the history is too short to fill the
  view. The button is there too, for keyboard users. Set it to `button` to load
  only on a click.
- `ai-chat:load-earlier` fires **once** until you call `prependMessages()`, so a
  fast scroll never sends duplicate requests. If the conversation changes before
  you answer, the pending load is dropped.
- Message `id`s must be unique. Existing messages keep their place on screen as
  older ones are added above.
