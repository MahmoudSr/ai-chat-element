---
description: "Opt-in attachments: an attach button, drag and drop, or a pasted screenshot. Images are sent to OpenAI-compatible and Anthropic models automatically."
---

# Attachments

Off by default. Add `allow-attachments` and the reader can attach files three
ways: the attach button, **dragging** a file onto the chat, or **pasting** a
screenshot into the input.

<LiveDemo scenario="attachments" :height="400" />

```html
<ai-chat allow-attachments></ai-chat>
```

| Attribute | Default | What it does |
| --- | --- | --- |
| `allow-attachments` | off | Turns attachments on. |
| `accept` | `image/*` | Which files are allowed, in the standard `accept` form: `image/*`, `.pdf`, `image/png,application/pdf`, `*`. |
| `max-attachments` | `5` | Files per message. |
| `max-attachment-size` | `0` | Bytes per file. `0` means no limit. |
| `hide-attach-button` | off | Keep paste and drag, hide the button. Open the picker from your own button with `chat.openFilePicker()`. |

## What reaches the model

**Images** go to the built-in adapters automatically, in each provider's own
image format, so an image plus a question works with no server code.

Other files show in the chat and reach your app through the `ai-chat:submit`
event, each with its raw `File`, but they aren't sent to the model: the OpenAI
and Anthropic chat APIs have no standard place for a PDF. With
[your own backend](../models/your-backend) you can read the file there first.

## Uploading to your storage

Attachments are inline `data:` URLs by default. To upload them and send a link
instead, handle `ai-chat:attach` and replace each `url`:

```js
chat.addEventListener('ai-chat:attach', async (e) => {
  for (const att of e.detail.attachments) {
    att.url = await uploadToMyStorage(att.file); // att.file is the raw File
  }
});
```

The event is cancelable: `e.preventDefault()` keeps the files out of the
composer, for when you handle them entirely yourself.

## Rejected files

A file that breaks `accept`, `max-attachment-size` or `max-attachments` fires
`ai-chat:attach-rejected` with `{ file, reason, message }`. `reason` is
`'type'`, `'size'` or `'too-many'`.

## Images in the chat

Sent images sit above the message text, and clicking one (sent or still in the
composer) opens it full size. To use your own viewer, cancel `ai-chat:preview`
and open the image from `e.detail.attachment`.
