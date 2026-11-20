/**
 * Live demos on the feature pages. Each scenario is a real <ai-chat> with a
 * scripted transport: `attrs` are real attributes (test/site-docs.test.ts
 * checks they exist), `ask` is the question the demo plays, and `reply`
 * yields the same chunks a real adapter would.
 *
 * Replies are synthetic and the demo says so on screen. No model, no network.
 */
import type { MessageAction, StreamChunk } from '../../../../src/index';

type Msg = { role: string; content: string; attachments?: { kind: string; name: string }[] };
type Reply = (messages: Msg[], wait: (ms: number) => Promise<void>) => AsyncGenerator<string | StreamChunk>;

export interface Scenario {
  attrs: string;
  ask: string;
  reply: Reply;
  /** Events to show in the demo's event line. */
  events?: string[];
  /** Buttons for the actions row, when the scenario shows them. */
  messageActions?: MessageAction[];
  /** What the demo's app does on an event, like a real consumer would. */
  onEvent?: (name: string, detail: any, chat: any) => void;
}

const fence = '```';

/** Stream text word by word, the way a model does. */
async function* words(text: string, wait: (ms: number) => Promise<void>, ms = 18) {
  for (const token of text.match(/\S+\s*|\s+/g) ?? []) {
    await wait(ms);
    yield token;
  }
}

const MARKDOWN = `## Release checklist

Here's what a reply can hold. Everything below is rendered from **Markdown** as it streams.

1. Bump the version in \`package.json\`
2. Run the tests
3. Publish

| Step | Command | Time |
| --- | --- | --- |
| Test | \`npm test\` | 7 s |
| Build | \`npm run build\` | 4 s |

${fence}ts
export function greet(name: string): string {
  return \`Hello, \${name}\`;
}
${fence}

> Tip: press **Esc** while a reply streams to stop it.`;

const THUMB_UP =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
const THUMB_DOWN =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>';

export const scenarios: Record<string, Scenario> = {
  markdown: {
    attrs: '',
    ask: 'Show me what a reply can look like.',
    reply: (_m, wait) => words(MARKDOWN, wait),
  },

  reasoning: {
    attrs: '',
    ask: "What's the weather in Beirut, in Fahrenheit?",
    async *reply(_m, wait) {
      for (const t of ['The user wants the current weather. ', 'I should call the weather tool for Beirut, ', 'then convert Celsius to Fahrenheit.']) {
        await wait(420);
        yield { type: 'reasoning', delta: t };
      }
      await wait(300);
      yield { type: 'tool', id: 'w1', name: 'get_weather', args: { city: 'Beirut' }, state: 'running' };
      await wait(1100);
      yield { type: 'tool', id: 'w1', output: { tempC: 24, sky: 'clear' }, state: 'success' };
      yield* words('It is **24 °C (75 °F)** and clear in Beirut right now.', wait, 30);
      yield { type: 'done', finishReason: 'stop' };
    },
  },

  attachments: {
    attrs: 'allow-attachments',
    ask: 'What can I attach?',
    events: ['ai-chat:attach', 'ai-chat:attach-rejected', 'ai-chat:submit'],
    async *reply(messages, wait) {
      const last = messages[messages.length - 1];
      const files = last?.attachments ?? [];
      const text = files.length
        ? `You attached ${files.length} file${files.length > 1 ? 's' : ''}: ${files
            .map((f) => `**${f.name}** (${f.kind})`)
            .join(', ')}. With a real model, image attachments are sent to it; other files reach your app through \`ai-chat:submit\`.`
        : 'Images, by default. Click the paperclip, drop a file on the chat, or paste a screenshot, then send.';
      yield* words(text, wait, 22);
    },
  },

  actions: {
    attrs: 'show-edit',
    ask: 'Write a one-line summary of what this component is.',
    events: ['ai-chat:message-edit', 'ai-chat:message-action'],
    messageActions: [
      { id: 'good', label: 'Good reply', icon: THUMB_UP },
      { id: 'bad', label: 'Bad reply', icon: THUMB_DOWN },
    ],
    onEvent(name, detail, chat) {
      // What most apps do on an edit: cut the conversation at the edited
      // message and send the new text. The component leaves this to you.
      if (name === 'ai-chat:message-edit') {
        chat.messages = chat.messages.slice(0, detail.index);
        void chat.send(detail.newContent);
      }
    },
    reply: (messages, wait) => {
      const q = messages[messages.length - 1]?.content ?? '';
      return words(
        `A complete AI chat as one HTML tag. (You asked: "${q}". Hover a message for Copy, Edit on your own messages, and the thumbs this demo adds.)`,
        wait,
        22,
      );
    },
  },
};
