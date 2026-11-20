# Finish reason and usage

When the provider reports them, each finished reply carries why it stopped and
how many tokens it used. Both adapters report them the same way, so you write
one check whatever the backend.

| Field | Type | What it holds |
| --- | --- | --- |
| `message.finishReason` | `FinishReason` | Why the reply stopped. |
| `message.usage` | `TokenUsage` | `{ inputTokens?, outputTokens? }` |

Both are optional: a server that doesn't report them (some Ollama builds)
leaves them `undefined`.

## Finish reasons

| `finishReason` | Meaning | OpenAI sends | Anthropic sends |
| --- | --- | --- | --- |
| `'stop'` | Finished normally | `stop` | `end_turn`, `stop_sequence` |
| `'length'` | **Cut off** at the token limit | `length` | `max_tokens` |
| `'content_filter'` | Blocked or declined for safety | `content_filter` | `refusal` |
| `'tool_calls'` | Stopped to call a tool | `tool_calls` | `tool_use` |
| `'other'` | Anything else | | |

## Reading them

```js
chat.addEventListener('ai-chat:message', (e) => {
  const { finishReason, usage } = e.detail.message;
  if (finishReason === 'length') showBanner('The reply was cut off.');
  if (usage) console.log(`${usage.inputTokens} in, ${usage.outputTokens} out`);
});
```

From your own backend, put them on the `done` chunk and they reach the message
unchanged:

```js
yield { type: 'done', finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 34 } };
```
