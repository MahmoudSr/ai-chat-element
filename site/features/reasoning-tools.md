---
description: "Show model reasoning as a collapsible \"Thought for 12s\" panel and each tool call as a row with its status, input and result, in the order they happened."
---

# Reasoning and tool calls

Reasoning models think, and agents call tools. The chat shows both, in the
order they happened:

- **Reasoning** reads "Thinking… 4s" while the model thinks, then
  "Thought for 12s". It's collapsed by default; open it to read the reasoning.
- **Tool calls** get one row each: status, the tool's name, its state
  (Preparing… / Running… / Done / Failed) and how long it took. A row opens to
  the call's input and result as highlighted JSON. A failed call shows its error
  without being opened.

<LiveDemo scenario="reasoning" :height="420" />

## Where it comes from

With the built-in adapters it's automatic. [Anthropic](../models/anthropic#thinking)
sends thinking and tool calls; [OpenAI-compatible](../models/openai#reasoning-and-tool-calls)
servers send `reasoning_content` or `reasoning` and `tool_calls`. The adapters
only **show** tool calls: running a tool is your backend's job.

From [your own backend](../models/your-backend#reasoning-and-tool-calls), yield
chunks next to the answer text:

```js
chat.transport = functionAdapter(async function* (messages, signal) {
  yield { type: 'reasoning', delta: 'The user wants the weather. ' };
  yield { type: 'tool', id: 'call_1', name: 'get_weather', args: { city: 'Beirut' } };
  const weather = await getWeather('Beirut'); // your code
  yield { type: 'tool', id: 'call_1', output: weather }; // same id: updates the row
  yield `It's ${weather.tempC}°C in Beirut.`;
});
```

A `tool` chunk with an `id` the reply has already seen updates that row. Without
a `state`, an `error` means Failed, an `output` means Done, and a new call
starts as Running.

## What gets saved

The steps land on the message as `message.steps`, in order. `message.content`
stays the plain answer text, so copy, edit and retry work as before, and only
the text is sent back to the model on the next turn. Save `steps` with the
message and a reopened conversation shows its reasoning and tool rows again. A
reply made only of tool calls still fires `ai-chat:message`.

## Showing it your way

```html
<ai-chat reasoning="expanded" tools="hidden"></ai-chat>
```

| Attribute | Values | Default |
| --- | --- | --- |
| `reasoning` | `collapsed`, `expanded`, `hidden` | `collapsed` |
| `tools` | `collapsed`, `expanded`, `hidden` | `collapsed` |

The reader's own open or close always wins, and a failed tool call shows
even when `tools` is `hidden`.

To draw a result yourself (a chart, a map, a card), set `renderTool`. Return an
element, or `null` for the default JSON. It runs once per change of that call,
not per token:

```js
chat.renderTool = (tool) =>
  tool.name === 'sales_by_month' && tool.state === 'success'
    ? makeBarChart(tool.output) // any element, from any framework
    : null;
```
