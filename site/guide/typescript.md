# TypeScript

The package ships its types. Import them next to the runtime exports:

```ts
import { AiChat, openAIAdapter } from 'ai-chat-element';
import type {
  ChatMessage,
  ChatTransport,
  StreamChunk,
  Role,
  FinishReason,
  TokenUsage,
  Attachment,
  MessageAction,
  MessageStep,
  ReasoningStep,
  ToolStep,
  ToolState,
  ChatLabels,
} from 'ai-chat-element';

const labels: Partial<ChatLabels> = { assistantName: 'Acme Assistant' };
const transport: ChatTransport = openAIAdapter({ model: 'gpt-4o-mini', apiKey: '…' });
```

The adapter option types, `OpenAIAdapterOptions` and `AnthropicAdapterOptions`,
are exported from both entry points.

## Typing the element

`document.querySelector('ai-chat')` returns `AiChat` once the package is
imported, because the element registers itself in `HTMLElementTagNameMap`.

For JSX in React, see [React › TypeScript](./frameworks/react#typescript).
