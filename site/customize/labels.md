---
description: "Rename every word the chat shows and every name a screen reader hears with one labels object. It is also the whole translation API."
---

<script setup>
import { data } from '../reference/api.data'
</script>

# Labels and translation

Every word the chat shows, and every name a screen reader hears, comes from one
`labels` object. Set only the ones you want to change; the rest keep their
English defaults. It's also the whole translation API:

```js
chat.labels = {
  userName: 'Tú',
  assistantName: 'Asistente',
  send: 'Enviar mensaje',
  stop: 'Detener',
  copy: 'Copiar',
};
```

`labels` is a property, set from JavaScript. Two of the strings also have an
attribute for quick use in HTML: `empty-heading` and `empty-body`, the text
shown before the first message.

Some labels contain a placeholder in braces, like `{duration}` or `{name}`.
Keep it in your translation; the chat fills it in.

## Right to left

The layout uses logical CSS, so a right-to-left page lays the chat out right to
left. Set `dir="rtl"` on the element, or on any parent:

```html
<ai-chat dir="rtl"></ai-chat>
```

## All {{ data.labels.length }} labels

<table class="fd-ref">
  <thead><tr><th>Key</th><th>Default</th></tr></thead>
  <tbody>
    <tr v-for="l in data.labels" :key="l.key">
      <td><code>{{ l.key }}</code></td>
      <td>{{ l.text }}</td>
    </tr>
  </tbody>
</table>
