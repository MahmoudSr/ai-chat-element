---
description: "Install ai-chat-element from npm, or load it from a CDN with no build step. One import registers the ai-chat custom element anywhere in your app."
---

# Install

## From npm

```bash
npm install ai-chat-element
```

Importing the package registers the `<ai-chat>` element, so one import
anywhere in your app is enough:

```js
import 'ai-chat-element';
```

## From a CDN

No build step needed. Pin the version so a new release can't change your page
without you knowing:

```html
<script type="module">
  import 'https://esm.sh/ai-chat-element@0.7.0';
</script>
```

## What you get

| Entry point | What's in it |
| --- | --- |
| `ai-chat-element` | The element, the adapters and all types. About 100 KB gzipped. |
| `ai-chat-element/adapters` | Only the adapters (`openAIAdapter`, `anthropicAdapter`, `functionAdapter`), about 4 KB gzipped. For server code or a worker that never renders the element. |

Lit, marked, DOMPurify and highlight.js are bundled into the file, so there
are no peer dependencies to install and the CDN file works on its own.

## Server-side rendering

Importing the package calls `customElements.define`, which exists only in the
browser. In Next.js, Nuxt, SvelteKit or Angular SSR, load it on the client
only. Each [framework page](./frameworks/react) shows how.
