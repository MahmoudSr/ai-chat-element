# Introduction

`ai-chat-element` is a complete AI chat interface packaged as one standard HTML
tag, `<ai-chat>`. It streams replies token by token, renders Markdown and
highlighted code, and handles the parts every chat needs: a stop button,
retry, copy, attachments, a reasoning panel, a history sidebar.

## How it works

Two pieces, and you only ever touch the second:

1. **The element.** `<ai-chat>` is a [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/Web_components):
   a custom element with its own Shadow DOM. Browsers treat it like any other
   tag, which is why it works in React, Vue, Angular, Svelte and plain HTML
   without a wrapper.
2. **The transport.** You tell the element how to reach a model by setting its
   `transport` property. Built-in adapters cover OpenAI-compatible servers
   (OpenAI, Ollama, LM Studio, OpenRouter, Groq, vLLM) and Anthropic, and
   `functionAdapter` wraps your own backend.

```js
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';

document.querySelector('ai-chat').transport = openAIAdapter({
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/v1/chat/completions',
});
```

The component owns the chat interface. Your app owns the data: where
conversations are stored, which model answers, what an edit means. When the two
meet, the component fires an event and lets your app decide.

## Where next

- [Install](./install) it from npm or a CDN.
- [Quick start](./quick-start): a working chat in two steps.
- Pick your framework: [HTML](./frameworks/html), [React](./frameworks/react),
  [Vue](./frameworks/vue), [Angular](./frameworks/angular),
  [Svelte](./frameworks/svelte).
