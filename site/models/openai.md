# OpenAI-compatible servers

`openAIAdapter` speaks the OpenAI Chat Completions API with streaming. Any
server that offers the same endpoint works, local or hosted.

```js
import { openAIAdapter } from 'ai-chat-element';

chat.transport = openAIAdapter({
  model: 'gpt-4o-mini',
  apiKey: '…', // local development only
});
```

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `model` | string | required | The model id, e.g. `gpt-4o-mini`. |
| `apiKey` | string | none | Sent as `Authorization: Bearer …`. Leave it out for keyless servers. |
| `baseURL` | string | OpenAI | The **full** chat-completions URL, not just the host. Defaults to `https://api.openai.com/v1/chat/completions`. |
| `headers` | object | none | Extra request headers, e.g. for a proxy. |
| `params` | object | none | Added to the request body: `temperature`, `max_tokens`, `tools`… |
| `thinkTags` | boolean | `true` | A reply that **starts** with `<think>…</think>` shows that part as reasoning. |

## Servers

::: code-group

```js [Ollama]
// Local and free. Start Ollama with OLLAMA_ORIGINS set so a web page may call it.
chat.transport = openAIAdapter({
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/v1/chat/completions',
});
```

```js [LM Studio]
chat.transport = openAIAdapter({
  model: 'your-loaded-model',
  baseURL: 'http://localhost:1234/v1/chat/completions',
});
```

```js [OpenRouter]
chat.transport = openAIAdapter({
  model: 'openai/gpt-4o-mini',
  apiKey: '…',
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
});
```

```js [Groq]
chat.transport = openAIAdapter({
  model: 'llama-3.3-70b-versatile',
  apiKey: '…',
  baseURL: 'https://api.groq.com/openai/v1/chat/completions',
});
```

```js [vLLM]
chat.transport = openAIAdapter({
  model: 'your-served-model',
  baseURL: 'http://localhost:8000/v1/chat/completions',
});
```

:::

::: tip Ollama answers one request at a time
By default Ollama handles a single request and queues the rest, so a second
chat waits until the first reply finishes. That looks like a stuck chat, but
it's the queue. Start Ollama with `OLLAMA_NUM_PARALLEL=2` (or more) to answer
several at once.
:::

## Reasoning and tool calls

Shown automatically, with nothing to configure:

- **Reasoning** sent in `reasoning_content` or `reasoning` (DeepSeek, vLLM,
  LM Studio, OpenRouter, Ollama) appears in the collapsible reasoning panel.
- A reply that starts with `<think>…</think>` is shown the same way. Set
  `thinkTags: false` to show it as text instead.
- **`tool_calls`** appear as tool rows. The adapter shows the call, but it
  doesn't run your tools: the reply stops there with a `tool_calls` finish
  reason. To run tools, do it on your server and stream the result through
  [`functionAdapter`](./your-backend#reasoning-and-tool-calls).

## Token usage

The adapter asks for usage on every request (`stream_options: { include_usage: true }`),
so finished replies carry token counts when the server reports them. See
[Finish reason and usage](./finish-and-usage).
