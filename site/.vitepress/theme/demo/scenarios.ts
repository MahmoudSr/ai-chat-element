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

/** What a scenario's app code can do to the demo frame. */
export interface DemoContext {
  /** Show a line in the demo's event bar. */
  log: (text: string) => void;
}

export interface Scenario {
  attrs: string;
  /** Played on load and by "Play again", unless the scenario has its own `play`. */
  ask?: string;
  reply: Reply;
  /** Light-DOM children of <ai-chat>: slotted content, as a page would write it. */
  slot?: string;
  /** Events to show in the demo's event line. */
  events?: string[];
  /** Buttons for the actions row, when the scenario shows them. */
  messageActions?: MessageAction[];
  /** What the demo's app does on an event, like a real consumer would. */
  onEvent?: (name: string, detail: any, chat: any) => void;
  /** App code that runs once the element is ready (a history list, paging…). */
  setup?: (chat: any, ctx: DemoContext) => void;
  /** Replaces the default "clear and ask again". */
  play?: (chat: any, ctx: DemoContext) => void;
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

  history: historyScenario(),
  long: longScenario(),
  chrome: chromeScenario(),
};

/**
 * A history sidebar the way a consumer builds one: the app owns the list and
 * the storage, the element owns the chat. Replies stream slowly so you can
 * switch away mid-reply and come back to it still streaming.
 */
function historyScenario(): Scenario {
  type Conv = { id: string; title: string; messages: any[] };
  let convs: Conv[] = [];
  let active = '';
  let list: HTMLElement | null = null;

  const at = (minutesAgo: number) => Date.now() - minutesAgo * 60_000;
  const seed = (): Conv[] => [
    {
      id: 'c1',
      title: 'Release checklist',
      messages: [
        { id: 'c1-u', role: 'user', content: 'What do I check before a release?', createdAt: at(60) },
        { id: 'c1-a', role: 'assistant', content: 'Bump the version, run the tests, build, then publish.', createdAt: at(59) },
      ],
    },
    {
      id: 'c2',
      title: 'Weather in Beirut',
      messages: [
        { id: 'c2-u', role: 'user', content: "What's the weather in Beirut?", createdAt: at(30) },
        { id: 'c2-a', role: 'assistant', content: 'It is 24 °C and clear.', createdAt: at(29) },
      ],
    },
  ];

  // Per-token updates touch only the dots, never rebuild the list: rebuilding a
  // row under the pointer on every token swallows clicks.
  const syncDots = (chat: any) =>
    list?.querySelectorAll<HTMLElement>('.dh-row').forEach((row) => {
      row.querySelector<HTMLElement>('.dh-dot')!.hidden = !chat.isGenerating(row.dataset.id);
    });

  function render(chat: any) {
    if (!list) return;
    list.replaceChildren(
      ...convs.map((c) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'dh-row' + (c.id === active ? ' is-active' : '');
        row.dataset.id = c.id;
        row.textContent = c.title;
        const dot = document.createElement('span');
        dot.className = 'dh-dot';
        dot.title = 'Still generating';
        dot.hidden = !chat.isGenerating(c.id);
        row.append(dot);
        row.onclick = () => switchTo(chat, c.id);
        return row;
      }),
    );
  }

  function saveActive(chat: any) {
    const c = convs.find((x) => x.id === active);
    if (c) c.messages = [...chat.messages];
  }

  function switchTo(chat: any, id: string) {
    if (id === active) return;
    saveActive(chat);
    active = id;
    chat.conversationId = id; // the one line that lets a reply follow its conversation
    chat.messages = [...convs.find((x) => x.id === id)!.messages];
    render(chat);
  }

  return {
    attrs: 'show-aside show-clear',
    slot: '<nav slot="aside" class="demo-history" aria-label="Conversations"></nav>',
    events: ['ai-chat:new-chat'],
    setup(chat, ctx) {
      list = chat.querySelector('.demo-history');
      chat.addEventListener('ai-chat:new-chat', (e: CustomEvent) => {
        const c = convs.find((x) => x.id === active);
        if (c) c.messages = e.detail.messages;
        const id = `c${Date.now()}`;
        convs.unshift({ id, title: 'New chat', messages: [] });
        active = id;
        chat.conversationId = id;
        render(chat);
      });
      chat.addEventListener('ai-chat:submit', (e: CustomEvent) => {
        const c = convs.find((x) => x.id === active);
        if (c && c.title === 'New chat') {
          c.title = e.detail.content.slice(0, 28);
          render(chat);
        }
        setTimeout(() => syncDots(chat));
      });
      chat.addEventListener('ai-chat:message', () => syncDots(chat));
      chat.addEventListener('ai-chat:background-message', (e: CustomEvent) => {
        const { conversationId, message, done } = e.detail;
        syncDots(chat);
        if (!done) return;
        const c = convs.find((x) => x.id === conversationId);
        if (c) {
          const i = c.messages.findIndex((m) => m.id === message.id);
          if (i >= 0) c.messages[i] = message;
          else c.messages.push(message);
        }
        ctx.log(`ai-chat:background-message  done: true, conversationId: "${conversationId}"`);
      });
    },
    play(chat) {
      chat.stop();
      convs = seed();
      active = 'c1';
      chat.conversationId = 'c1';
      chat.messages = [...convs[0].messages];
      render(chat);
    },
    reply: (messages, wait) => {
      const q = messages[messages.length - 1]?.content ?? '';
      return words(
        `This reply streams slowly on purpose. Switch to the other conversation while it's still writing, then come back: it kept going in the background, and the dot in the list shows it's still working. (You asked: "${q}".) The component holds the reply until it finishes; the app saves it from the ai-chat:background-message event.`,
        wait,
        110,
      );
    },
  };
}

/** 120 stored messages, served 20 at a time from a pretend server. */
function longScenario(): Scenario {
  const TOTAL = 120;
  const PAGE = 20;
  const store = Array.from({ length: TOTAL }, (_, i) => ({
    id: `m${i + 1}`,
    role: i % 2 ? 'assistant' : 'user',
    content: i % 2 ? `Answer ${(i + 1) / 2}. Every message here comes from the store, one page at a time.` : `Question ${i / 2 + 1}`,
    createdAt: Date.now() - (TOTAL - i) * 60_000,
  }));
  return {
    attrs: 'has-earlier',
    events: ['ai-chat:load-earlier'],
    setup(chat, ctx) {
      chat.addEventListener('ai-chat:load-earlier', async (e: CustomEvent) => {
        const idx = store.findIndex((m) => m.id === e.detail.oldest.id);
        await new Promise((r) => setTimeout(r, 600)); // the round trip to your server
        const older = store.slice(Math.max(0, idx - PAGE), idx);
        await chat.prependMessages(older);
        chat.hasEarlier = idx - PAGE > 0;
        ctx.log(`ai-chat:load-earlier  loaded ${older.length}, ${Math.max(0, idx - PAGE)} older left`);
      });
    },
    play(chat) {
      chat.stop();
      chat.conversationId = 'long';
      chat.messages = store.slice(-PAGE);
      chat.hasEarlier = true;
    },
    reply: (_m, wait) => words('A new reply lands at the bottom, as usual.', wait, 22),
  };
}

/** Header, a named assistant with initials, bubbles, and a first reply that fails. */
function chromeScenario(): Scenario {
  let attempts = 0;
  const ask = 'Summarize our refund policy in one line.';
  return {
    attrs: 'show-header show-clear assistant-bubble',
    // A slotted avatar is cloned into every message, inside the shadow DOM,
    // so it carries its own styles.
    slot:
      '<span slot="assistant-avatar" style="display:grid;place-items:center;width:100%;height:100%;background:#16181d;color:#fff;font:700 11px/1 system-ui">AC</span>',
    events: ['ai-chat:error', 'ai-chat:new-chat'],
    setup(chat) {
      chat.labels = { headerTitle: 'Acme Assistant', assistantName: 'Acme' };
    },
    play(chat) {
      attempts = 0;
      chat.stop();
      chat.messages = [];
      void chat.send(ask);
    },
    async *reply(_m, wait) {
      attempts += 1;
      await wait(500);
      if (attempts === 1) {
        yield { type: 'error', error: 'The model is busy right now. Press Retry. (This failure is part of the demo.)' };
        return;
      }
      yield* words('Refunds within 30 days, no questions asked, to the original payment method.', wait, 30);
    },
  };
}
