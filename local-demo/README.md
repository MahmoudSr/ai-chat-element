# Atlas Research — local consumer demo

A **real consumer app** built around `<ai-chat>`, not a control panel. This is
the method that has found nearly every real bug in this project (the playground
can't, because it's a knob board — see CLAUDE.md, "the real consumer app method").

It has its own shell, its own `localStorage` history, its own sidebar, and it
drives the component exactly the way a third-party developer would.

## Run it

The **user** starts servers, not the agent (see memory: `dev-server-is-users-job`).

```powershell
# 1. Ollama — note OLLAMA_NUM_PARALLEL, without it Ollama answers ONE
#    request at a time and concurrent conversations look broken.
$env:OLLAMA_ORIGINS="*"; $env:CUDA_VISIBLE_DEVICES="0"; $env:OLLAMA_NUM_PARALLEL="2"; ollama serve

# 2. Refresh the vendored bundle after any src/ change
npm run build
cp -r dist/ai-chat-element.js dist/adapters local-demo/vendor/

# 3. Serve it
node local-demo/serve.mjs 4173
```

Then open <http://localhost:4173>. The footer dot turns green when Ollama is
reachable and the model dropdown fills from `/api/tags` (it prefers `llava`,
which is the vision model — needed for image attachments).

`vendor/` is gitignored: it's a copy of `dist/`, so rebuild + re-copy rather than
editing it.

## What it exercises

- **Background streaming** — switch conversations mid-reply, watch the pulsing
  dot in the sidebar, switch back and see the reply still streaming live.
- `conversation-id` / `ai-chat:background-message` / `isGenerating()`.
- Attachments with a real vision model.
- Message editing (ChatGPT truncate-and-resend).
- A sidebar drawer on narrow screens.

## Bugs this app found (all in the demo's own code, none in the component)

Kept as cautionary examples — this is the class of bug a consumer hits:

1. **Clicks needed 2–3 presses.** The per-token `ai-chat:background-message`
   handler called a full `draw()`, which rebuilt the sidebar with
   `innerHTML = ''` and destroyed the row mid-click. Per-token updates must only
   sync the dots (`syncDots()`), never rebuild the list.
2. **New chat stacked up blank conversations.** No guard against creating another
   empty chat when already sitting on one.
3. **Switching wrote messages into the wrong conversation.** `commit()` used the
   already-reassigned `activeId`; it now takes the target id explicitly.
