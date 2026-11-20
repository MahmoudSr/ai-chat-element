# Anthropic

`anthropicAdapter` talks to Claude through Anthropic's Messages API with
streaming.

```js
import { anthropicAdapter } from 'ai-chat-element';

chat.transport = anthropicAdapter({
  model: 'claude-sonnet-5-5',
  apiKey: '…', // local development only
  maxTokens: 4096,
});
```

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `model` | string | required | A Claude model id, e.g. `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. |
| `apiKey` | string | none | Sent as `x-api-key`. |
| `maxTokens` | number | `1024` | The reply's token limit. Anthropic requires one; raise it for long answers or thinking. |
| `baseURL` | string | Anthropic | Defaults to `https://api.anthropic.com/v1/messages`. Point it at your own proxy to keep the key off the page. |
| `headers` | object | none | Extra request headers, e.g. for a proxy. |
| `params` | object | none | Added to the request body: `thinking`, `tools`, `metadata`… |
| `browserAccess` | boolean | `true` | Sends the header Anthropic needs to allow a call straight from a browser. Ignored by your own proxy. |

::: warning Sampling settings
Current Claude models reject `temperature`, `top_p` and `top_k`. Don't put them
in `params` unless the model you use still accepts them.
:::

## Thinking

Turn thinking on through `params`. Ask for a summary, or the thinking text
comes back empty and the panel only says "Thinking…":

```js
chat.transport = anthropicAdapter({
  model: 'claude-sonnet-5-5',
  maxTokens: 16000,
  params: { thinking: { type: 'adaptive', display: 'summarized' } },
});
```

Thinking streams into the collapsible reasoning panel ("Thought for 12s").

## Tools

Tool calls show as rows in the reply:

- **Server tools** that run on Anthropic's side (web search, code execution,
  MCP servers) show as running, then show their result when it arrives.
- **Your own tools** show the call, and the reply stops there with a
  `tool_calls` finish reason. The adapter doesn't run your code; to run tools,
  do it on your server and stream the result through
  [`functionAdapter`](./your-backend#reasoning-and-tool-calls).

## Through your own proxy

Keep the key on your server by pointing `baseURL` at a route that adds it:

```js
chat.transport = anthropicAdapter({
  model: 'claude-sonnet-5-5',
  baseURL: '/api/anthropic', // your server adds x-api-key and forwards the request
});
```
