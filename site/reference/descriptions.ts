/**
 * Hand-written descriptions for the generated reference lists. The names come
 * from the source (api.data.ts); only the words live here.
 * test/site-docs.test.ts fails if a name in the source has no description, or
 * a description names something the source doesn't have.
 */
export const slotDescriptions: Record<string, string> = {
  'assistant-avatar': "The assistant's avatar, copied into every reply.",
  'user-avatar': "The user's avatar, copied into every user message.",
  header: 'Replaces the whole top bar (with show-header).',
  aside: 'Your conversation list, in the sidebar (with show-aside).',
  'aside-toggle-icon': 'Icon of the button that opens the sidebar drawer on a narrow chat.',
  empty: 'Replaces the whole empty state shown before the first message.',
  'empty-icon': "The empty state's icon.",
  'composer-actions-start': "Buttons at the left of the input's action row.",
  'composer-actions-end': 'Buttons at the right of the action row, before Send.',
  'send-icon': 'Icon of the Send button.',
  'stop-icon': 'Icon of the Stop button.',
  'clear-icon': 'Icon of the New chat button.',
  'retry-icon': 'Icon of the Retry button.',
  'copy-icon': 'Icon of the Copy action.',
  'copied-icon': 'The tick a Copy button shows for a moment after copying.',
  'edit-icon': 'Icon of the Edit action.',
  'jump-icon': 'Icon of the jump-to-latest button.',
  'error-icon': 'Icon shown next to an error.',
  'attach-icon': 'Icon of the attach button (with allow-attachments).',
};

// Copied from the README's reference tables (2026-11-20), README-internal links
// turned into plain text. Edit them here from now on.
export const cssVarDescriptions: Record<string, string> = {
  "--ai-chat-bg": "Widget background",
  "--ai-chat-fg": "Main text",
  "--ai-chat-muted": "Secondary text (timestamps, meta)",
  "--ai-chat-border": "All borders / dividers",
  "--ai-chat-accent": "Buttons, focus ring, links, user bubble",
  "--ai-chat-accent-fg": "Text/icon on the accent",
  "--ai-chat-user-bg": "User bubble background",
  "--ai-chat-user-fg": "User bubble text",
  "--ai-chat-assistant-bg": "Assistant bubble bg (with `assistant-bubble`)",
  "--ai-chat-assistant-fg": "Assistant text",
  "--ai-chat-code-bg": "Code block background",
  "--ai-chat-code-fg": "Code block text",
  "--ai-chat-error": "Error text + retry button",
  "--ai-chat-focus-color": "Ring color on every focusable control",
  "--ai-chat-focus-width": "Ring thickness (`0` removes it)",
  "--ai-chat-focus-offset": "Gap between the control and the ring",
  "--ai-chat-border-width": "Base width; the others inherit it",
  "--ai-chat-input-border-width": "Composer box border",
  "--ai-chat-composer-border-width": "Divider above the composer",
  "--ai-chat-header-border-width": "Divider under the header",
  "--ai-chat-code-border-width": "Code block border",
  "--ai-chat-table-border-width": "Markdown table frame and row rules",
  "--ai-chat-table-header-bg": "Table header row background",
  "--ai-chat-table-header-fg": "Table header text",
  "--ai-chat-table-row-divider": "Rule between table rows (no vertical rules)",
  "--ai-chat-table-stripe-bg": "Every other body row (set a tint for stripes)",
  "--ai-chat-table-cell-padding": "Table cell padding",
  "--ai-chat-table-radius": "Table outer frame corners",
  "--ai-chat-link-color": "Links",
  "--ai-chat-link-hover-color": "Links on hover",
  "--ai-chat-strong-fg": "**Bold** text",
  "--ai-chat-heading-fg": "Headings (h1-h6, sized for a chat reply)",
  "--ai-chat-marker-color": "List bullets and numbers",
  "--ai-chat-blockquote-border": "Blockquote left rule",
  "--ai-chat-reasoning-color": "Reasoning toggle and text",
  "--ai-chat-reasoning-font-size": "Reasoning toggle and text size",
  "--ai-chat-reasoning-border-color": "Rule beside opened reasoning",
  "--ai-chat-reasoning-max-height": "Opened reasoning scrolls past this height",
  "--ai-chat-tool-bg": "Tool-call row background",
  "--ai-chat-tool-border-color": "Tool-call row border",
  "--ai-chat-tool-radius": "Tool-call row corners",
  "--ai-chat-tool-font-size": "Tool-call row text size",
  "--ai-chat-tool-running-color": "Spinner while a call runs",
  "--ai-chat-tool-success-color": "Tick on a finished call",
  "--ai-chat-tool-error-color": "Icon, state and message of a failed call",
  "--ai-chat-tool-output-max-height": "Input/result blocks scroll past this height",
  "--ai-chat-radius": "Master radius — everything derives from this",
  "--ai-chat-outer-radius": "The widget's own outer frame (`0` = square)",
  "--ai-chat-bubble-radius": "Message bubbles",
  "--ai-chat-input-radius": "Composer box",
  "--ai-chat-button-radius": "Buttons (e.g. `50%` = circular)",
  "--ai-chat-send-radius": "Send/stop button",
  "--ai-chat-new-chat-radius": "Full-width New-chat button in the sidebar",
  "--ai-chat-jump-radius": "Jump-to-latest button (circular by default)",
  "--ai-chat-code-radius": "Code blocks",
  "--ai-chat-avatar-radius": "Avatars",
  "--ai-chat-attachment-radius": "Attachment chips + inline images",
  "--ai-chat-action-radius": "Per-message action buttons (copy/edit)",
  "--ai-chat-radius-sm": "Small inner corners",
  "--ai-chat-font": "Main font family",
  "--ai-chat-font-mono": "Code font family",
  "--ai-chat-font-size": "Base font size",
  "--ai-chat-line-height": "Message line height",
  "--ai-chat-max-width": "Max width of messages + composer",
  "--ai-chat-gap": "Vertical space between messages",
  "--ai-chat-avatar-size": "Avatar width/height",
  "--ai-chat-avatar-bg": "Avatar tile behind the picture (`transparent` for a shaped picture)",
  "--ai-chat-button-size": "Header/floating icon buttons",
  "--ai-chat-send-size": "Send/stop button inside the composer",
  "--ai-chat-clear-size": "Compact New-chat icon button (header/floating)",
  "--ai-chat-jump-size": "Jump-to-latest floating button",
  "--ai-chat-input-max-height": "Input grows to here, then scrolls",
  "--ai-chat-attachment-thumb-size": "Attachment thumbnail size in the composer tray",
  "--ai-chat-attachment-image-max-width": "Max width of an inline image in a sent message",
  "--ai-chat-action-size": "Per-message action button (copy/edit) size",
  "--ai-chat-action-color": "Resting color of the action buttons",
  "--ai-chat-action-hover-color": "Action button color on hover",
  "--ai-chat-action-hover-bg": "Action button background on hover",
  "--ai-chat-preview-backdrop": "Scrim behind the full-size image preview (`0` = none, darker = classic lightbox)",
  "--ai-chat-image-border-width": "Hairline edge on images so a light screenshot still reads on a light chat (`0` removes)",
  "--ai-chat-image-border-color": "Color of that hairline edge",
  "--ai-chat-show-avatars": "`none` force-hides avatars even if slotted",
  "--ai-chat-bubble-inset-x": "Horizontal text inset; the name/time label aligns to it",
  "--ai-chat-bubble-padding": "Inside message bubbles (horizontal derives from `bubble-inset-x`)",
  "--ai-chat-input-padding": "Inside the textarea",
  "--ai-chat-messages-padding": "Around the message list",
  "--ai-chat-messages-scrollbar-gutter": "Reserve the scrollbar's width in the message list (`auto` gives it back when nothing scrolls)",
  "--ai-chat-composer-padding": "Around the composer",
  "--ai-chat-header-padding": "Inside the header bar",
  "--ai-chat-aside-width": "Sidebar column width",
  "--ai-chat-aside-bg": "Sidebar background",
  "--ai-chat-aside-padding": "Inside the sidebar",
  "--ai-chat-aside-drawer-bg": "The drawer's surface on a narrow chat",
  "--ai-chat-aside-scrim": "Backdrop behind the open drawer",
  "--ai-chat-aside-scrollbar-gutter": "Reserve the scrollbar's width in the history list (`stable` keeps it)"
};

export const attributeDescriptions: Record<string, string> = {
  "placeholder": "Input placeholder text.",
  "empty-heading": "Heading shown when there are no messages.",
  "empty-body": "Secondary line under the empty heading.",
  "show-names": "Show the sender name above each message.",
  "show-timestamps": "Show a time (e.g. \"3:45 PM\") next to the name.",
  "assistant-bubble": "Wrap AI messages in a bubble. Off = borderless plain text (ChatGPT/Claude style).",
  "show-header": "Show the built-in header bar (title + new-chat button).",
  "show-clear": "Show the New/Clear-chat button (in the header, or floating top-right).",
  "show-retry": "Show a Retry button on a failed message that re-sends the last user turn.",
  "show-copy": "Show a Copy button in the per-message actions row (both roles).",
  "show-edit": "Show an Edit button on **user** messages; confirming fires `ai-chat:message-edit`.",
  "show-aside": "Show the sidebar column (fill the `aside` slot with your history list).",
  "aside-breakpoint": "Below this width **of the chat itself**, the sidebar becomes a drawer opened by a toggle. `0` never collapses. See [History sidebar](/features/history#on-a-narrow-chat-it-s-a-drawer).",
  "aside-open": "Whether the drawer is open (narrow chat only). Set it from your own button; reflected.",
  "hide-aside-toggle": "Keep the drawer but hide the built-in toggle (bring your own trigger).",
  "system-prompt": "Prepended to every request (not shown in UI).",
  "disabled": "Disables the input.",
  "allow-attachments": "Enable file/image attachments (attach button + drag-drop + paste). See [Attachments](/features/attachments).",
  "hide-attach-button": "Keep paste/drop but hide the built-in attach button (bring your own trigger).",
  "accept": "Which file types the picker/drop/paste accepts (standard `accept` form).",
  "max-attachments": "Max attachments per message.",
  "max-attachment-size": "Max size per file; `0` = no cap.",
  "conversation-id": "Your key for the conversation on screen. Echoed back on `ai-chat:background-message` so you know which conversation a background reply belongs to. See [Background streaming](/features/background-streaming).",
  "abort-on-switch": "Cancel an in-flight reply when the conversation is switched or cleared, instead of letting it finish in the background.",
  "allow-images": "Render images inside replies. Off, an image shows as its alt text and nothing in a reply loads a URL. See [Streaming and Markdown](/features/streaming#safe-by-default).",
  "assistant-avatar-src": "Image for the assistant's avatar on every reply. Wins over the `assistant-avatar` slot.",
  "user-avatar-src": "Image for the user's avatar on every user message. Wins over the `user-avatar` slot.",
  "has-earlier": "There are older messages than `.messages` holds: shows \"Load earlier messages\" at the top and fires `ai-chat:load-earlier`. See [Long conversations](/features/long-conversations).",
  "image-hosts": "With `allow-images`, the URL prefixes images may load from (e.g. `https://cdn.example.com/`). Only `https:` ever loads. Also settable as an array property `.imageHosts`.",
  "theme": "Color mode; `auto` follows the OS.",
  "aside-side": "Which side the sidebar sits on.",
  "load-earlier": "With `has-earlier`: `scroll` loads as the reader nears the top (the button is there too, for keyboard users); `button` loads only on a click.",
  "reasoning": "How a reply's reasoning (\"thinking\") shows: a one-line \"Thought for 12s\" the reader can open, open from the start, or not at all. The reader's own open/close wins.",
  "tools": "How a reply's tool calls show: one row each that opens to the input and result, open from the start, or not at all. Errors show either way."
};

export const propertyDescriptions: Record<string, string> = {
  "transport": "**Required.** The backend to talk to.",
  "messages": "The conversation (read or seed it).",
  "labels": "Override any UI/accessibility strings (see [Labels](/customize/labels)).",
  "messageActions": "Your own buttons in each message's actions row. See [Message actions](/features/message-actions).",
  "imageHosts": "Same as the `image-hosts` attribute.",
  "renderTool": "Render a tool call's result yourself (a chart, a map) instead of the JSON. Return `null` for the default. Called once per change of that call, not per token."
};

export const methodDescriptions: Record<string, string> = {
  "send": "Sends a user turn and streams the reply. Resolves `true` when the turn ran, `false` if it was a no-op (empty text **and** no attachments, or no transport set). Resolves only **after** the stream settles.",
  "retry": "Re-sends the last user turn (e.g. after an error). Same resolution semantics as `send`.",
  "addMessage": "Appends a message to `.messages` **without** sending it — returns the created message (with its generated `id`). Use it to seed history.",
  "stop": "Aborts the in-flight stream, if any. Always cancels — unlike a conversation switch, this is the user saying they don't want the reply.",
  "clear": "Empties the conversation and the composer draft. An in-flight reply keeps generating in the background (see [Background streaming](/features/background-streaming)) unless `abort-on-switch` is set.",
  "openFilePicker": "Opens the native file picker (for use with `hide-attach-button` + your own trigger). No-op unless `allow-attachments` is set.",
  "prependMessages": "Adds older messages **above** the conversation — your answer to `ai-chat:load-earlier` — keeping what the reader sees in place. Call it with `[]` when nothing came back (or the load failed) to re-enable the control.",
  "isGenerating": "Whether the conversation with that `conversation-id` has a reply still generating in the background. Use it to mark a row in your history list."
};

export const eventDescriptions: Record<string, { detail: string; text: string }> = {
  "ai-chat:submit": {
    "detail": "{ content: string, attachments: Attachment[] }",
    "text": "Fires when the user sends, before the request goes out. `attachments` is `[]` unless files were attached."
  },
  "ai-chat:message": {
    "detail": "{ message: ChatMessage }",
    "text": "Once per completed reply — **only when it has content or steps** (empty/failed turns don't fire). The `message` carries `finishReason` / `usage` when reported, and `steps` (reasoning, tool calls) when there were any."
  },
  "ai-chat:error": {
    "detail": "{ error: string }",
    "text": "Transport failure; `error` is a human-readable message."
  },
  "ai-chat:new-chat": {
    "detail": "{ messages: ChatMessage[] }",
    "text": "Fires when the New-chat button is clicked, **before** clearing. **Cancelable** — call `e.preventDefault()` to keep the current conversation. `messages` is the conversation about to be cleared."
  },
  "ai-chat:attach": {
    "detail": "{ attachments: Attachment[] }",
    "text": "Fires when files are picked/dropped/pasted, after they pass validation. **Cancelable** — `e.preventDefault()` removes them from the tray (you're handling them yourself). Mutate `attachment.url` here to swap in an uploaded URL before send."
  },
  "ai-chat:message-edit": {
    "detail": "{ index: number, message: ChatMessage, newContent: string }",
    "text": "Fires when the user confirms an inline edit (`show-edit`, user messages only). **The component does not change `.messages`** — you decide what edit means. The usual ChatGPT behaviour is to truncate from `index` and resend `newContent`."
  },
  "ai-chat:preview": {
    "detail": "{ attachment: Attachment }",
    "text": "Fires when an image (staged in the composer or already sent) is clicked. **Cancelable** — `e.preventDefault()` suppresses the built-in overlay so you can open your own lightbox/gallery."
  },
  "ai-chat:aside-toggle": {
    "detail": "{ open: boolean }",
    "text": "The reader opened or closed the sidebar drawer (toggle, backdrop, Esc, or a conversation switch)."
  },
  "ai-chat:message-action": {
    "detail": "{ actionId: string, message: ChatMessage, index: number }",
    "text": "One of your `messageActions` buttons was pressed."
  },
  "ai-chat:attachment-click": {
    "detail": "{ attachment: Attachment, message: ChatMessage, index: number }",
    "text": "A file card was pressed. **Cancelable** — on a card with a URL, `e.preventDefault()` stops the download. A card without a URL does nothing else, so this is where you make the file."
  },
  "ai-chat:attach-rejected": {"detail": "{ file: File, reason: 'type' | 'size' | 'too-many', message: string }", "text": "Fires when a picked file is rejected by `accept` / `max-attachment-size` / `max-attachments`."},
  "ai-chat:load-earlier": {"detail": "{ conversationId: string | null, oldest: ChatMessage }", "text": "The reader asked for older messages (`has-earlier`): scrolled near the top, or pressed the button. Fires once until you call `prependMessages()`. `oldest` is your paging cursor."},
  "ai-chat:background-message": {"detail": "{ conversationId: string | null, message: ChatMessage, done: boolean }", "text": "A reply is still streaming for a conversation you've switched away from. Fires per token with `done: false`, then once with `done: true` when it settles (including on error — check `message.error`). `conversationId` is whatever `conversation-id` held when that turn was sent. See [Background streaming](/features/background-streaming)."}
};
