/**
 * Mock-transport scenarios for the playground.
 *
 * Each is an async generator matching what `functionAdapter` wants: it yields
 * text chunks and respects the abort `signal`. They exist to reproduce the
 * situations that actually break a chat UI — long streams, hostile markdown,
 * empty replies, slow first tokens — without needing a real model.
 */

const sleep = (ms, signal) =>
  new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

/** Stream a string as word-ish chunks, honoring abort. */
async function* stream(text, signal, delay = 18) {
  for (const chunk of text.split(/(\s+)/)) {
    await sleep(delay, signal);
    yield chunk;
  }
}

export const sampleReply = `Sure — here's a code block and a table.

\`\`\`js
const chat = document.querySelector('ai-chat');
chat.transport = openAIAdapter({ model: 'gpt-4o-mini', apiKey });
\`\`\`

| Feature | Supported |
| --- | --- |
| streaming | yes |
| markdown | yes |`;

export const SCENARIOS = {
  sampleReply,

  /** Ordinary reply with markdown + code. The default. */
  async *normal(messages, signal) {
    const q = messages[messages.length - 1]?.content ?? '';
    yield* stream(
      `You said: **${q}**\n\nHere's a code block to test highlighting and the copy button:\n\n` +
        '```js\n' +
        "const chat = document.querySelector('ai-chat');\n" +
        "chat.transport = openAIAdapter({ model: 'gpt-4o-mini', apiKey });\n" +
        '```\n\n' +
        '| Feature | Works |\n| --- | --- |\n| streaming | yes |\n| markdown | yes |\n\n' +
        '- names & timestamps sit above each message\n- try the Retry button via "Fail next request"',
      signal,
    );
  },

  /** A long answer — tests scroll-follow, the jump button, and stop mid-stream. */
  async *long(messages, signal) {
    yield* stream('Streaming a long answer so you can test scroll behaviour. Scroll up while this runs: the view should stay where you put it and a jump-to-latest button should appear.\n\n', signal, 12);
    for (let i = 1; i <= 12; i++) {
      yield* stream(`\n**Section ${i}.** Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n`, signal, 10);
    }
  },

  /** Slow first token — tests the typing indicator and stopping before any text. */
  async *slow(messages, signal) {
    await sleep(2600, signal);
    yield* stream('That pause was the point: the typing indicator should have shown the whole time, and Esc / the stop button should have worked before a single token arrived.', signal, 40);
  },

  /** Empty reply — should show the `emptyResponse` placeholder, not a ghost bubble. */
  async *empty(messages, signal) {
    await sleep(500, signal);
    // yields nothing on purpose
  },

  /** Transport failure — the Retry button should appear. */
  async *error(messages, signal) {
    await sleep(400, signal);
    throw new Error('Simulated network error — hit Retry to resend.');
  },

  /** Markdown torture test: the things that historically broke layout. */
  async *markdown(messages, signal) {
    yield* stream(
      `# Heading 1\n## Heading 2\n\nInline \`code\`, **bold**, *italic*, ~~strike~~, and a [link](https://example.com).\n\n` +
        `> A blockquote that goes on long enough to wrap onto a second line in most layouts.\n\n` +
        `1. Ordered item\n2. Another\n   - nested bullet\n   - another one\n\n` +
        `A wide table (should scroll horizontally, not crush):\n\n` +
        `| Column A | Column B | Column C | Column D | Column E | Column F |\n| --- | --- | --- | --- | --- | --- |\n` +
        `| a very long cell value | another long one | third | fourth | fifth | sixth |\n\n` +
        `A long unbroken token (must not overflow):\n\nsupercalifragilisticexpialidocious_and_then_some_more_characters_to_force_a_wrap_decision\n\n` +
        `\`\`\`python\ndef greet(name: str) -> str:\n    """Multi-line code with syntax highlighting."""\n    return f"Hello, {name}!"\n\`\`\`\n\n` +
        `\`\`\`mermaid\ngraph TD;\n  A-->B;\n\`\`\`\n\n` +
        `That last fence is a language highlight.js can't handle — the header should still say "mermaid".`,
      signal,
      8,
    );
  },

  /** Sanitization check: none of this should execute or escape the bubble. */
  async *xss(messages, signal) {
    yield* stream(
      `Security check — all of the following must render as inert text, never execute:\n\n` +
        `<script>window.__pwned = true;<\/script>\n\n` +
        `<img src=x onerror="window.__pwned = true">\n\n` +
        `<a href="javascript:window.__pwned=true">a javascript: link</a>\n\n` +
        `<iframe src="https://example.com"></iframe>\n\n` +
        `If the page still works and nothing loaded, dompurify did its job. ` +
        `Check the console: \`window.__pwned\` should be undefined.`,
      signal,
      8,
    );
  },
};
