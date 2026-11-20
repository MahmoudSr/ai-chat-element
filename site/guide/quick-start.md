# Quick start

Every use comes down to two steps:

1. **Import the package.** This registers the `<ai-chat>` element.
2. **Set a `transport`.** This tells it which AI to talk to.

## Install

```bash
npm install ai-chat-element
```

Or load it from a CDN with no build step, as shown under [Plain HTML](#plain-html).

## Connect it to your server

The transport is where your app talks to an AI. The production-safe pattern is to
point it at **your own server endpoint**, which holds the API key and streams text
back. The browser never sees the key.

```js
import 'ai-chat-element'; // 1. register <ai-chat>
import { functionAdapter } from 'ai-chat-element';

const chat = document.querySelector('ai-chat');
chat.transport = functionAdapter(async function* (messages, signal) {
  // Your server holds the API key and streams text back.
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
    yield decoder.decode(value); // 2. yield each text chunk
  }
});
```

```html
<ai-chat></ai-chat>
```

::: warning Never ship an API key in browser code
Anything in the browser is visible to your users, so a key placed there can be
copied and used at your expense. Keep the key on a server you control and have
the browser talk to that server.
:::

The built-in `openAIAdapter` and `anthropicAdapter` take an `apiKey` directly.
That is convenient for local development, internal tools, and keyless local
servers like Ollama. For anything your users can reach, use the server pattern
above.

## Plain HTML

```html
<!doctype html>
<ai-chat theme="auto" placeholder="Ask me anything…"></ai-chat>

<script type="module">
  // Pin the version so a future release can't change your page unannounced.
  import 'https://esm.sh/ai-chat-element@0.7.0';
  import { openAIAdapter } from 'https://esm.sh/ai-chat-element@0.7.0';

  const chat = document.querySelector('ai-chat');
  // Local, keyless example: talk to Ollama running on your machine.
  chat.transport = openAIAdapter({
    model: 'llama3.2',
    baseURL: 'http://localhost:11434/v1/chat/completions',
  });
</script>
```
