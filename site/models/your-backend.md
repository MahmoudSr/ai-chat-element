# Your own backend

The production-safe setup: **your server holds the API key**, calls the model,
and streams text back. The browser never sees the key. `functionAdapter` turns
that stream into a transport.

## In the browser

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
    yield decoder.decode(value); // each chunk of text you yield is appended
  }
});
```

Your function gets the whole conversation (`messages`, each with `role` and
`content`) and an `AbortSignal` that fires when the user presses Stop. Pass the
signal to `fetch` so Stop really cancels the request.

## On the server

Your route calls the provider with the key from its own environment and
forwards the text:

```js
// Server only (a Next.js route, an Express handler…). The key never leaves it.
const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({ model: 'gpt-4o-mini', stream: true, messages }),
});
// …then read the stream and write the text deltas to your response.
```

## Reasoning and tool calls

Yield plain strings for the answer, and chunk objects for anything richer:

```js
chat.transport = functionAdapter(async function* (messages, signal) {
  yield { type: 'reasoning', delta: 'The user wants the weather…' };
  yield { type: 'tool', id: 't1', name: 'weather', args: { city: 'Beirut' } };
  yield { type: 'tool', id: 't1', output: { tempC: 24 } };
  yield 'It is 24°C in Beirut.';
  yield { type: 'done', finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 9 } };
});
```

| Chunk | What it does |
| --- | --- |
| a string | Appends answer text. |
| `{ type: 'reasoning', delta }` | Appends to the reasoning panel. |
| `{ type: 'tool', id, … }` | Adds a tool row, or updates the one with the same `id`. Fields: `name`, `title`, `args`, `argsDelta`, `state`, `output`, `error`, all optional. |
| `{ type: 'done' }` | Ends the reply. Add `finishReason` and `usage` to report them; see [finish reason and usage](./finish-and-usage). |
| `{ type: 'error', error }` | Ends the reply as failed, showing your message and Retry. |

If your function just returns, the reply ends normally. If it throws, the
reply fails with the error's message.

## Writing a transport by hand

A transport is any object with a `send(messages, signal)` method that returns
an async iterable of chunks. `functionAdapter` is a thin wrapper around that:

```ts
import type { ChatTransport } from 'ai-chat-element';

const transport: ChatTransport = {
  async *send(messages, signal) {
    yield { type: 'delta', delta: 'Hello' };
    yield { type: 'done' };
  },
};
```
