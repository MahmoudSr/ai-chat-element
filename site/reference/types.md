# Types

Everything below is imported straight from `src/types.ts`, so it is the
source, not a copy. Import any of it with `import type`:

```ts
import type { ChatMessage, ChatTransport, StreamChunk, Attachment } from 'ai-chat-element';
```

The most used:

- `ChatMessage`: one message in `.messages`.
- `ChatTransport`: what you assign to `.transport`.
- `StreamChunk`: what a transport yields.
- `Attachment`: a file or image on a message.
- `MessageStep`, `ReasoningStep`, `ToolStep`: reasoning and tool calls on `message.steps`.

`ChatLabels` lives in `src/labels.ts`; its keys and defaults are on
[Labels and translation](/customize/labels).

<<< ../../src/types.ts
