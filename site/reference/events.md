---
description: "Every ai-chat event: when it fires, whether it can be cancelled and what its detail holds. Each also fires in a dash form for framework templates."
---

<script setup>
import { data } from './api.data'
import { eventDescriptions as d } from './descriptions'
import { fmt } from './fmt'
</script>

# Events

Every event bubbles out of the Shadow DOM (`bubbles: true, composed: true`).
Read its data from `e.detail`.

Each one also fires with a dash instead of the colon, `ai-chat-message` for
`ai-chat:message`, with the same detail. Bind the dash form in framework
templates; Angular can't bind a name with a colon. Cancelling either one
cancels both.

```js
chat.addEventListener('ai-chat:message', (e) => save(e.detail.message));
```

<table class="fd-ref">
  <thead><tr><th>Event</th><th>When it fires, and its <code>e.detail</code></th></tr></thead>
  <tbody>
    <tr v-for="e in data.events" :key="e" :id="e.replace(':', '-')">
      <td><code>{{ e }}</code></td>
      <td><span v-html="fmt(d[e].text)"></span><code class="fd-detail">{{ d[e].detail }}</code></td>
    </tr>
  </tbody>
</table>
