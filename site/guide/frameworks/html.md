# Plain HTML

No build step and no framework: load the package from a CDN and use the tag.

```html
<!doctype html>
<html lang="en">
  <body>
    <ai-chat theme="auto" placeholder="Ask me anything…"
             style="display:block; height:600px"></ai-chat>

    <script type="module">
      import 'https://esm.sh/ai-chat-element@0.7.0';
      import { openAIAdapter } from 'https://esm.sh/ai-chat-element@0.7.0';

      const chat = document.querySelector('ai-chat');

      // Local, keyless: talk to Ollama running on your machine.
      chat.transport = openAIAdapter({
        model: 'llama3.2',
        baseURL: 'http://localhost:11434/v1/chat/completions',
      });

      // Save each finished reply.
      chat.addEventListener('ai-chat:message', (e) => {
        console.log(e.detail.message);
      });
    </script>
  </body>
</html>
```

Give the element a height. It fills the box you put it in and scrolls its own
messages.

::: tip Talking to Ollama from a browser
Ollama blocks requests from web pages unless you allow them. Start it with
`OLLAMA_ORIGINS` set, for example in PowerShell:
`$env:OLLAMA_ORIGINS="*"; ollama serve`
:::

For a hosted page, don't put an API key in this script. Point a
`functionAdapter` at your own server instead, as in the
[Quick start](../quick-start#connect-it-to-your-server).
