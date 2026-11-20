---
description: "Style the chat's inner elements with ::part() when no CSS variable reaches what you want to change. Every named part, listed with what it styles."
---

<script setup>
import { data } from '../reference/api.data'
</script>

# Styling parts

When no variable reaches what you want to change, style the chat's inner
elements directly with `::part()`. Each named part is an element inside the
Shadow DOM that the component opens up to your stylesheet.

```css
ai-chat::part(composer-box) {
  border-width: 2px;
}

ai-chat::part(message-user) {
  font-weight: 500;
}

ai-chat::part(send-button):hover {
  transform: scale(1.05);
}
```

Messages carry a part for their sender too: `message-user`,
`message-assistant` and `message-system`, so you can style one side only.

Prefer a variable when there is one. Variables keep working when the component's
inner layout changes; a part rule depends on that element's current styles.

## All {{ data.parts.length }} parts

<p class="fd-chips">
  <code v-for="p in data.parts" :key="p">{{ p }}</code>
</p>
