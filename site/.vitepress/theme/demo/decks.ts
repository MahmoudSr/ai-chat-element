/**
 * The strips of the home-page fan deck. Each strip is a framework or a model
 * the component works with, and carries a REAL <ai-chat> theme: the values in
 * `theme` are applied to the live chat as CSS variables when the strip is
 * turned to the centre. Chips are that strip's swatch family, darkest first.
 *
 * Every accent was checked for at least 4.5:1 contrast against its
 * `--ai-chat-accent-fg`, since the user bubble sets text on it.
 */

export type StripKind = 'framework' | 'model';

export interface Strip {
  id: string;
  name: string;
  kind: StripKind;
  /** Chip code printed on the strip tip, like a paint code. */
  code: string;
  chips: string[];
  theme: Record<string, string>;
  /** The question the demo conversation opens with. */
  ask: string;
  /** The scripted (synthetic) answer, in Markdown. */
  answer: string;
}

const fence = '```';

export const strips: Strip[] = [
  {
    id: 'svelte',
    name: 'Svelte',
    kind: 'framework',
    code: 'AC-05',
    chips: ['#5A4300', '#8F6D00', '#F2C230', '#F6D466', '#FAE6A3', '#FDF4D6'],
    theme: { '--ai-chat-accent': '#F2C230', '--ai-chat-accent-fg': '#16181D', '--ai-chat-radius': '16px' },
    ask: 'And Svelte?',
    answer: `Svelte renders custom elements natively. Bind the element and set \`chat.transport\` in \`onMount\`:

${fence}svelte
<ai-chat bind:this={chat}></ai-chat>
${fence}`,
  },
  {
    id: 'angular',
    name: 'Angular',
    kind: 'framework',
    code: 'AC-04',
    chips: ['#5C0B2E', '#C2185B', '#D81E6B', '#EC5F98', '#F5A3C4', '#FCDDEA'],
    theme: { '--ai-chat-accent': '#C2185B', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '4px' },
    ask: 'What do I need in Angular?',
    answer: `Add \`CUSTOM_ELEMENTS_SCHEMA\` to the component that uses it, and bind the dash form of events:

${fence}html
<ai-chat (ai-chat-message)="onMessage($event)"></ai-chat>
${fence}`,
  },
  {
    id: 'vue',
    name: 'Vue',
    kind: 'framework',
    code: 'AC-03',
    chips: ['#5A2400', '#C2410C', '#FF5A1F', '#FF8A5C', '#FFBC9E', '#FFE4D7'],
    theme: { '--ai-chat-accent': '#C2410C', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '6px' },
    ask: 'Does this work in my Vue app?',
    answer: `Yes. Tell Vue that \`ai-chat\` is a custom element, then use it like any tag:

${fence}ts
vue({ template: { compilerOptions: {
  isCustomElement: (tag) => tag === 'ai-chat',
} } });
${fence}`,
  },
  {
    id: 'react',
    name: 'React',
    kind: 'framework',
    code: 'AC-02',
    chips: ['#063F33', '#0A7A60', '#0FA37F', '#4CC7A5', '#94E0CB', '#D3F3EA'],
    theme: { '--ai-chat-accent': '#0A7A60', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '12px' },
    ask: 'How do I use it in React?',
    answer: `Set the transport in an effect (it's an object, not an attribute), then render the tag:

${fence}tsx
useEffect(() => {
  ref.current!.transport = functionAdapter(myStream);
}, []);
return <ai-chat ref={ref} />;
${fence}`,
  },
  {
    id: 'html',
    name: 'HTML',
    kind: 'framework',
    code: 'AC-01',
    chips: ['#0E2A6B', '#1B44B8', '#2F5BFF', '#6E8BFF', '#A9BBFF', '#D7E0FF'],
    theme: { '--ai-chat-accent': '#2F5BFF', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '8px' },
    ask: 'Can I use it without a build step?',
    answer: `Yes. Load it from a CDN, then set \`chat.transport\` to talk to a model:

${fence}html
<ai-chat></ai-chat>
<script type="module">
  import 'https://esm.sh/ai-chat-element@0.7.0';
</script>
${fence}`,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'model',
    code: 'AC-06',
    chips: ['#003C49', '#00788F', '#0096B5', '#4CB8CF', '#97D6E4', '#D5EEF4'],
    theme: { '--ai-chat-accent': '#00788F', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '8px' },
    ask: 'Connect it to OpenAI.',
    answer: `Use the OpenAI-compatible adapter (Groq, OpenRouter, LM Studio and vLLM too). In production, keep the key on your server:

${fence}js
chat.transport = openAIAdapter({ model: 'gpt-4o-mini', apiKey });
${fence}`,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'model',
    code: 'AC-07',
    chips: ['#4A1A0E', '#A8502E', '#C4673F', '#D8916F', '#E9BFA9', '#F6E3D8'],
    theme: { '--ai-chat-accent': '#A8502E', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '10px' },
    ask: 'Can it show Claude thinking?',
    answer: `Yes, in a collapsible "Thought for 12s" panel. Ask for a summary, or the thinking comes back empty:

${fence}js
chat.transport = anthropicAdapter({
  model: 'claude-sonnet-5-5',
  maxTokens: 8000,
  params: { thinking: { type: 'adaptive', display: 'summarized' } },
});
${fence}`,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    kind: 'model',
    code: 'AC-08',
    chips: ['#2C1A66', '#5B3FE0', '#6B4EFF', '#9580FF', '#C2B6FF', '#E6E0FF'],
    theme: { '--ai-chat-accent': '#5B3FE0', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '8px' },
    ask: 'Can I run it against a local model?',
    answer: `Point the OpenAI-compatible adapter at Ollama. No key needed:

${fence}js
chat.transport = openAIAdapter({
  model: 'qwen3:1.7b',
  baseURL: 'http://localhost:11434/v1/chat/completions',
});
${fence}`,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'model',
    code: 'AC-09',
    chips: ['#3A0F52', '#7A2E9E', '#9B45C4', '#B97BD6', '#D7B3E8', '#F0E3F7'],
    theme: { '--ai-chat-accent': '#7A2E9E', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '8px' },
    ask: 'Can I switch between many models?',
    answer: `Any OpenAI-compatible endpoint works, so OpenRouter gives you hundreds of models:

${fence}js
chat.transport = openAIAdapter({
  model: 'openai/gpt-4o-mini',
  baseURL: 'https://openrouter.ai/api/v1/chat/completions',
});
${fence}`,
  },
  {
    id: 'backend',
    name: 'Your API',
    kind: 'model',
    code: 'AC-10',
    chips: ['#23300A', '#4D7A12', '#6A9A1F', '#94BE52', '#C3DD99', '#E7F2D6'],
    theme: { '--ai-chat-accent': '#4D7A12', '--ai-chat-accent-fg': '#FFFFFF', '--ai-chat-radius': '8px' },
    ask: 'We have our own backend.',
    answer: `Wrap it in \`functionAdapter\` and yield text as it arrives; your key stays on your server. The full example is in the Quick start.

${fence}js
chat.transport = functionAdapter(async function* (messages, signal) {
  // fetch your /api/chat with the signal, yield each text chunk
});
${fence}`,
  },
];

/**
 * Strips are in on-screen order, left to right: frameworks fan out to the left of
 * the card, models to the right, the most common choice of each (HTML, OpenAI)
 * in the inner slot right beside it.
 */
/** The strip the fan opens on. */
export const DEFAULT_STRIP = 'html';
