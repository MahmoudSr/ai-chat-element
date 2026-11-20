# Svelte

Svelte renders custom elements as they are. Bind the element and set its
transport once it's mounted:

```svelte
<script>
  import { onMount } from 'svelte';

  let chat;

  onMount(async () => {
    // Imported here so it never runs during SvelteKit's server render.
    const { openAIAdapter } = await import('ai-chat-element');

    chat.transport = openAIAdapter({
      model: 'llama3.2',
      baseURL: 'http://localhost:11434/v1/chat/completions',
    });

    chat.addEventListener('ai-chat:message', (e) => {
      console.log(e.detail.message);
    });
  });
</script>

<ai-chat bind:this={chat} theme="auto" style="display:block; height:600px"></ai-chat>
```

`onMount` runs only in the browser, so the dynamic import keeps SvelteKit's
server render from calling `customElements.define`.
