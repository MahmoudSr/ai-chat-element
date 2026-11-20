# Connect a model

The element doesn't talk to any AI by itself. You give it a **transport**: an
object that takes the conversation and streams back the reply.

```js
chat.transport = openAIAdapter({ model: 'gpt-4o-mini', apiKey });
```

| Transport | Use it for |
| --- | --- |
| [`openAIAdapter`](./openai) | OpenAI and every server with the same API: Ollama, LM Studio, OpenRouter, Groq, vLLM, Together. |
| [`anthropicAdapter`](./anthropic) | Claude, through Anthropic's Messages API. |
| [`functionAdapter`](./your-backend) | Your own server, or anything you can turn into a stream of text. |

## Keep your API key on a server

The two built-in adapters accept an `apiKey`, which is fine for local
development, internal tools, and keyless local servers like Ollama. On a page
your users can open, anyone can read that key from the browser. For anything
public, your server holds the key and the browser talks to your server through
[`functionAdapter`](./your-backend).

## A system prompt

The `system-prompt` attribute is sent ahead of the conversation on every
request and never shown in the chat:

```html
<ai-chat system-prompt="You are a concise assistant for Acme's billing docs."></ai-chat>
```

The OpenAI adapter sends it as a `system` message. The Anthropic adapter moves
it to Anthropic's separate `system` field, as that API expects.

## When a request fails

The chat shows the provider's own error message (for example "model not
found") on the failed reply, with a **Retry** button. Turn the button off with
`show-retry="false"`.
