---
description: "Replies stream token by token and render as Markdown with tables, links and highlighted code. Stop with a button or Esc; scrolling never fights the reader."
---

# Streaming and Markdown

Replies stream in token by token and render as Markdown while they arrive:
headings, lists, tables, links, quotes and highlighted code with a copy button.

<LiveDemo scenario="markdown" :height="520" />

## While a reply streams

- The send button turns into **Stop**. Pressing it, or **Esc** anywhere on the
  page, cancels the request.
- The chat follows the new text only while you're at the bottom. Scroll up to
  read and it stays where you are; a **jump to latest** button brings you back.
- Long replies stay smooth: finished blocks are rendered once and only the
  block still being written is redrawn, so the cost per token doesn't grow with
  the reply.

## Code

Code blocks get syntax highlighting and a copy button. These languages are
highlighted: JavaScript (`js`), TypeScript (`ts`), Python (`py`), Bash (`sh`,
`shell`, `zsh`), JSON, HTML and XML, CSS, Markdown (`md`), SQL, Go, Rust and
Java. Any other language still renders as a code block, labelled with the name
from its fence, just without colours.

## Safe by default

A reply is model output, and a model can be talked into writing anything. So
the Markdown is sanitized, and **nothing in a reply loads a URL by itself**:
images show as their alt text, and `style`, `srcset`, media and SVG images are
stripped. Links open with `rel="noopener noreferrer"`.

That blocks "image exfiltration", where a reply hides data in an image URL
that leaks the moment it loads. If your replies need pictures, allow them and
list where they may come from:

```html
<ai-chat allow-images image-hosts="https://cdn.example.com/"></ai-chat>
```

Only `https:` URLs starting with one of the prefixes load, with
`referrerpolicy="no-referrer"`. `allow-images` without `image-hosts` allows any
`https:` image, so use that only if you trust everything your model reads.
