---
description: "Use ai-chat-element in Vue: mark ai-chat as a custom element in the compiler options, set the transport through a template ref, bind dash-form events."
---

# Vue

Tell the Vue compiler that `<ai-chat>` is a custom element, or it warns and
tries to resolve it as a Vue component. In `vite.config.ts`:

```ts
import vue from '@vitejs/plugin-vue';

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: { isCustomElement: (tag) => tag === 'ai-chat' },
      },
    }),
  ],
};
```

Then use it in a component. Set the transport once the element is mounted:

```vue
<template>
  <ai-chat ref="chat" theme="auto" @ai-chat-message="onMessage" />
</template>

<script setup>
import 'ai-chat-element';
import { openAIAdapter } from 'ai-chat-element';
import { onMounted, ref } from 'vue';

const chat = ref(null);

onMounted(() => {
  chat.value.transport = openAIAdapter({
    model: 'llama3.2',
    baseURL: 'http://localhost:11434/v1/chat/completions',
  });
});

const onMessage = (e) => console.log(e.detail.message);
</script>
```

Every event fires twice, as `ai-chat:message` and as `ai-chat-message`. The
dash form is the one to bind in templates.

In Nuxt, render the chat inside `<ClientOnly>` and import the package from a
client-only plugin, since the element can't be defined on the server.
