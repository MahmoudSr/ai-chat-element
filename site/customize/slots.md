---
description: "Put your own markup inside the chat with slots: avatars, a custom header, a history list, extra buttons next to Send, or replacement icons."
---

<script setup>
import { data } from '../reference/api.data'
import { slotDescriptions } from '../reference/descriptions'
</script>

# Slots

Slots let you put your own markup inside the chat: an avatar, your own header,
a history list, extra buttons next to Send, or replacement icons. Give the
element a `slot` attribute and place it inside `<ai-chat>`:

```html
<ai-chat show-header>
  <div slot="header">Acme Assistant</div>
  <button slot="composer-actions-start" aria-label="Record voice">…</button>
  <svg slot="send-icon" viewBox="0 0 24 24">…</svg>
</ai-chat>
```

Slotted elements stay in your page, so your page's CSS styles them. The two
exceptions are the avatars: they're copied into every message, inside the
component, where page CSS can't reach. Give avatars inline styles, or use the
`assistant-avatar-src` and `user-avatar-src` attributes.

## All {{ data.slots.length }} slots

<table class="fd-ref">
  <thead><tr><th>Slot</th><th>What goes there</th></tr></thead>
  <tbody>
    <tr v-for="s in [...data.slots].sort()" :key="s">
      <td><code>{{ s }}</code></td>
      <td>{{ slotDescriptions[s] }}</td>
    </tr>
  </tbody>
</table>
