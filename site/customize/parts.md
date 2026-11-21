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

Grouped by the area of the chat they're in.

### The frame

<RefGroup kind="parts" group="frame" />

### Header

<RefGroup kind="parts" group="header" />

### Sidebar

<RefGroup kind="parts" group="sidebar" />

### Empty chat

<RefGroup kind="parts" group="empty" />

### Messages

<RefGroup kind="parts" group="messages" />

### Message buttons

Copy, Edit and your own buttons, and the box that opens when you edit.

<RefGroup kind="parts" group="actions" />

### Input box

<RefGroup kind="parts" group="input" />

### Files and images

Attached files, and the full-size image view.

<RefGroup kind="parts" group="files" />

### Thinking and tools

<RefGroup kind="parts" group="steps" />
