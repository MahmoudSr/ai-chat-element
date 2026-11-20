# Keyboard and accessibility

## Keyboard

| Key | Where | What it does |
| --- | --- | --- |
| **Enter** | Input | Sends the message. |
| **Shift+Enter** | Input | Adds a new line. |
| **Esc** | Anywhere on the page | Stops a reply that's streaming. |
| **Enter** / **Esc** | Editing a message | Saves / cancels the edit. |
| **Esc** | Image preview, sidebar drawer | Closes it. |

Every control is a real button, reachable with **Tab**, and shows a focus ring
when you navigate by keyboard. After Send, Stop, Retry or New chat, focus goes
back to the input instead of dropping to the page, as long as it was inside the
chat to begin with.

## Screen readers

- The message list is a log, but it is **not** a live region: a screen reader
  isn't told about every token as a reply streams.
- Instead, each finished reply (or error) is announced **once**, through a
  hidden status region.
- Buttons and regions have names, and every one of those strings is a
  label you can translate.

## Motion

With **reduced motion** turned on in the operating system, the jump-to-latest
scroll is instant instead of smooth.

## Right-to-left

The layout uses logical CSS, so `dir="rtl"` on the element or the page lays the
chat out right to left.

```html
<ai-chat dir="rtl"></ai-chat>
```

## Focus ring

Restyle it with three variables:

| Variable | What it sets |
| --- | --- |
| `--ai-chat-focus-color` | The ring's colour. Defaults to a softened accent. |
| `--ai-chat-focus-width` | Its thickness. |
| `--ai-chat-focus-offset` | The gap between the control and the ring. |
