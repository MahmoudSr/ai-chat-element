# Design: file / image attachments

**Status:** DRAFT for review — no code yet. Dated 2026-07-24.
**Backlog item:** the strongest 0.2.x/0.3.0 feature candidate.
**Scope note:** this is a design doc (`docs/`, not shipped). Approve the shape
here before any `src/` change.

---

## 1. The problem & the constraint

A modern chat UI lets a user attach an image or file to a message. Today the
component has only the *slots* for it — `composer-actions-start` /
`composer-actions-end` render an empty drop-in point, and the playground has a
non-functional placeholder attach button. Nothing carries an attachment through
the message model or out to a transport.

The hard constraint is the **message model**. Everything downstream assumes:

```ts
interface ChatMessage { content: string; /* ... */ }
```

and every adapter maps it as a plain string:

```ts
// src/adapters/openai.ts
messages.map((m) => ({ role: m.role, content: m.content }))
```

But the OpenAI and Anthropic multimodal wire formats require `content` to become
an **array of typed parts** when an image is present:

```jsonc
// OpenAI
{ "role": "user", "content": [
  { "type": "text", "text": "what's in this image?" },
  { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
]}
```

So the whole feature comes down to: **extend `ChatMessage` to carry attachments
without breaking `content: string`, existing consumers, or the adapters.**

## 2. Guiding decisions (the scope boundary)

Per the project's standing scope rule — *the component owns the chat UI shell;
the consumer owns data and storage* — attachments split like this:

| Concern | Owner | Why |
| --- | --- | --- |
| Picking a file, drag-drop, paste-image | **Component** | It's UI in the composer. |
| Previewing attachments (thumbnail chips) | **Component** | It's rendering. |
| Turning a file into bytes/base64 | **Component** | Needed to preview + to hand to the transport. |
| **Uploading** to blob storage / a CDN | **Consumer** | Storage is the consumer's job; the component must not assume an upload endpoint exists. |
| Sending attachments to the AI | **Adapter** | It's wire-format mapping. |
| Which file types / size limits are allowed | **Consumer config** | Varies per app + per model. |

**Corollary — the component never uploads anything itself.** It surfaces the
selected files (as `File`/`Blob` + a data URL for preview) on the message and via
an event. A consumer that wants remote URLs uploads them and can rewrite the
attachment before it reaches the transport (see §5). The built-in adapters
support **inline base64 data URLs** out of the box (what OpenAI/Anthropic accept
directly), so the simple case works with zero consumer code.

## 3. The model — an `Attachment` type

```ts
export interface Attachment {
  /** Stable id (component-generated). */
  id: string;
  /** 'image' renders inline; 'file' renders as a chip. Drives the adapter mapping too. */
  kind: 'image' | 'file';
  /** MIME type, e.g. 'image/png', 'application/pdf'. */
  mimeType: string;
  /** Original filename, for display + the file chip. */
  name: string;
  /** Byte size, for display + limit enforcement. */
  size: number;
  /**
   * A URL the component can render RIGHT NOW. Either a `data:` URL (default,
   * component-generated from the File) or an https URL a consumer swapped in
   * after uploading. This is also what the built-in adapters send.
   */
  url: string;
  /**
   * The raw File, when the component created the attachment from a local pick.
   * Absent after a consumer reconstructs a message from storage. Lets a consumer
   * upload the bytes without re-reading them.
   */
  file?: File;
}
```

`ChatMessage` gains one optional field — **purely additive**:

```ts
interface ChatMessage {
  content: string;          // unchanged — still the text
  attachments?: Attachment[]; // NEW, optional
  /* ...everything else unchanged... */
}
```

Why a separate `attachments[]` array rather than turning `content` into a
parts-union (like the providers do)?

- **Backwards compatibility is free.** Every existing consumer, every existing
  test, and both adapters keep working unchanged when `attachments` is absent.
- `content` stays a plain string, so `show me the text` / markdown rendering /
  the `ai-chat:submit` payload don't have to learn a union type.
- The provider parts-array is an *adapter concern*, built at send time from
  `(content, attachments)`. The model stays simple; the wire format is derived.

## 4. Component behaviour

### Enabling it
Off by default (no behaviour change for current users). Turn on with an
attribute:

```html
<ai-chat allow-attachments accept="image/*" max-attachment-size="10485760"></ai-chat>
```

- `allow-attachments` (boolean) — shows the built-in attach button in the
  composer (in `composer-actions-start` by default) and enables drag-drop +
  image paste onto the composer.
- `accept` (string) — passed straight to the hidden `<input type="file">`
  `accept`; also gates drag-drop/paste. Defaults to `image/*`.
- `max-attachment-size` (number, bytes) — rejected files fire an event + a label;
  no hard default cap (consumer decides), but documented example is 10 MB.
- `multiple` reuse: allow N attachments per message (config `max-attachments`,
  default e.g. 5).

The consumer can still ignore all of that and drive attachments entirely
themselves via the existing action slots + the imperative API (§5) — the built-in
button is a convenience, not the only path. (Same pattern as everything else in
this component.)

### Three ways to add a file (all funnel to the same pipeline)
All three produce the same `Attachment`, fire the same `ai-chat:attach` event,
and honor the same `accept` / `max-attachments` / `max-attachment-size` gates.
They're just different entry points:

1. **The attach button** — opens the hidden `<input type="file">`.
2. **Drag-and-drop** — dragging files onto the composer (a `.composer__box--dragover`
   state gives visual feedback); `dragover`/`drop` handlers, `preventDefault` so
   the browser doesn't navigate to the file.
3. **Paste an image** (explicitly requested) — with focus in the composer,
   **Ctrl/Cmd+V** on a clipboard that contains an image adds it as an attachment.
   - Detected via the composer's `paste` handler reading
     `ClipboardEvent.clipboardData` — `.files` (and `.items` of `kind:'file'`)
     for image types. **Plain-text paste is untouched** — we only intercept (and
     `preventDefault`) when the clipboard actually carries an image; otherwise the
     normal textarea paste happens.
   - A pasted screenshot arrives as a nameless `Blob`, so the component
     **synthesizes a filename** (`pasted-image-<n>.<ext>` from the MIME type) so
     the chip and the `Attachment.name` are sensible.
   - Gated on `allow-attachments` + `accept` (a pasted non-matching image is
     ignored / fires `ai-chat:attach-rejected`) and counts toward `max-attachments`.
   - This is the single highest-value input for images (screenshots) — it's the
     one people reach for first in ChatGPT/Claude, so it's first-class here, not
     an afterthought.

### Rendering
- **Pending (in the composer):** a row of preview chips above the textarea inside
  `.composer__box` — image thumbnails for `kind:'image'`, a file-name chip with a
  remove (×) button for `kind:'file'`. New parts: `composer-attachments`,
  `attachment-chip`, `attachment-remove`.
- **Sent (in a message):** attachments render above the message text. Images as
  a responsive inline `<img>` (capped, click-to-... left to the consumer), files
  as a chip. New parts: `message-attachments`, `message-attachment`.
- Everything themed by new CSS vars deriving from existing ones (e.g.
  `--ai-chat-attachment-radius: var(--ai-chat-radius)` — honoring the unified-radius
  rule; `--ai-chat-attachment-max-width`, thumbnail size, chip bg/border).

### Sending
`send()` currently takes `content: string`. It grows to optionally accept the
pending attachments:

```ts
// internal: the composer calls this with its current text + pending attachments
async send(content: string, attachments?: Attachment[]): Promise<boolean>
```

- The empty-guard changes: today `if (!text) return false`. New rule — send is
  allowed if there's **text OR at least one attachment** (an image with no
  caption is a valid turn).
- The user `ChatMessage` gets `attachments` set; the pending tray clears.
- `ai-chat:submit` / `ai-chat:message` payloads gain `attachments`.

## 5. Consumer hooks (the important part)

The zero-code path: `allow-attachments accept="image/*"`, base64 data URLs go
straight to OpenAI/Anthropic. Done.

The **upload-to-storage path**, for consumers who don't want to send giant base64
blobs to the model (or need a persistent URL for history):

- A cancelable **`ai-chat:attach`** event fires when files are picked/dropped,
  detail `{ attachments: Attachment[] }`. The consumer can `await` an upload and
  mutate `attachment.url` to the returned https URL before send. (Mirrors the
  existing cancelable-event pattern like `ai-chat:new-chat`.)
- Because `Attachment.file` carries the raw `File`, the consumer uploads without
  re-reading bytes.
- On send, whatever `url` is on the attachment is what the adapter sends — data
  URL or remote, transparently.

Rejected files (type/size) fire **`ai-chat:attach-rejected`** with the reason, so
the consumer can toast an error. New labels for the built-in messaging
(`attachTooLarge`, `attachWrongType`, attach-button aria-label) — all overridable
via `.labels`, i18n rule honored.

## 6. Adapter mapping

Both adapters change the same shape: if a user message has no attachments, send
`content` as a **string exactly as today** (zero risk to existing behaviour);
only when `attachments?.length` do we build the parts array.

```ts
// OpenAI
function toOpenAIContent(m: ChatMessage) {
  if (!m.attachments?.length) return m.content;           // unchanged path
  const parts = [];
  if (m.content) parts.push({ type: 'text', text: m.content });
  for (const a of m.attachments) {
    if (a.kind === 'image')
      parts.push({ type: 'image_url', image_url: { url: a.url } });
    // non-image files: OpenAI has no generic file part on chat-completions —
    // document the limitation; consumer handles docs via their own backend.
  }
  return parts;
}
```

```ts
// Anthropic — images are base64 source blocks; needs mimeType + the base64 body
{ type: 'image', source: { type: 'base64', media_type: a.mimeType, data: <base64 from a.url> } }
// (Anthropic also accepts { type:'url' } image sources on current API — prefer
//  that when a.url is https, base64 when it's a data: URL.)
```

**Known limitation to document:** non-image files have no standard place on the
chat-completions / messages APIs. v1 supports **images end-to-end**; generic
files render in the UI + reach `ai-chat:submit` (so a consumer's own backend can
use them) but are **not** auto-sent to OpenAI/Anthropic. This is honest and
matches the scope boundary; PDFs-to-model can be a later, provider-specific
follow-up.

## 7. Docs-lockstep + tests (non-negotiable per project rules)

- New attributes (`allow-attachments`, `accept`, `max-attachment-size`,
  `max-attachments`), CSS vars, `::part()`s, labels, and events → added to BOTH
  `README.md` and `AI_USAGE.md`, or `test/public-api.test.ts` goes red.
- New exported types `Attachment` (+ any union changes) exported from `index.ts`.
- Tests, each red-on-old-code:
  - model: a user message round-trips `attachments`; `content:''` + 1 image sends.
  - adapter: OpenAI/Anthropic emit the parts array ONLY with attachments, plain
    string otherwise (guard the no-regression path explicitly).
  - component: attach via the imperative path, preview chip paints (real width,
    not an empty node — the assertion-can-fail rule), remove works, send clears
    the tray, `ai-chat:attach` is cancelable + url-mutation is honored.
  - paste: dispatch a synthetic `paste` ClipboardEvent carrying an image
    `File`/`Blob` → an attachment appears with a synthesized name; a text-only
    paste adds NO attachment and leaves the textarea's normal paste intact
    (assertion must distinguish the two, not false-pass on an empty tray).
  - rejection: oversize/wrong-type fires `ai-chat:attach-rejected`, no message sent.
- Playground: wire the existing placeholder attach button to the real feature;
  add an `attachments` scenario.

## 8. Decisions (RESOLVED with the user, 2026-07-24)

1. **UI accepts ANY file type** the developer allows via `accept` (`*`, `.pdf`,
   etc.). **Auto-send-to-AI is images only** in v1 — because the OpenAI/Anthropic
   *streaming chat* endpoints only accept images directly. Non-image files (e.g. a
   PDF) render in the UI and reach the developer's code via `ai-chat:submit` with
   the raw `File`, so a developer with their OWN backend (the "Claude.ai clone"
   case) handles them exactly like Claude.ai does — Claude.ai is itself an API
   *consumer* whose server extracts/processes the PDF before the model sees it;
   our browser-only component has no such backend, by design (consumer owns the
   backend). Document this distinction prominently so it's not a surprise.
2. **Built-in attach button, ON by default when `allow-attachments` is set**,
   rendered in `composer-actions-start`, and **replaceable via a slot**. (The
   "one line and it works" path the user wants; consistent with the rest of the
   component.)
3. **Defaults:** `accept="image/*"`, `max-attachments=5`, **no** default size cap
   (consumer sets `max-attachment-size` if they want). All overridable.
4. **Ships as its own `0.3.0`** (new feature surface).

---

*Next step after sign-off: implement one slice at a time — model + types first
(with tests), then adapters, then composer UI, then docs — same one-item-at-a-time
discipline the rest of the repo follows.*
