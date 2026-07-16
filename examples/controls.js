/**
 * The playground's control definitions.
 *
 * One entry per knob, describing it declaratively — the panel UI, the applying
 * of values to the element, and the generated code snippet are ALL derived from
 * this list. Adding a CSS variable to the component means adding one line here
 * and it shows up everywhere, in sync.
 *
 * kind: 'attr'  -> an HTML attribute on <ai-chat>
 *       'var'   -> a CSS custom property
 *       'label' -> a key on the .labels object
 *       'frame' -> styles the playground's own wrapper (not the component)
 *       'slot'  -> toggles demo content in a named slot
 */

const px = (v) => `${v}px`;

export const CONTROLS = [
  // ---------- Transport ----------
  { g: 'Transport', kind: 'meta', key: 'transport', type: 'select', label: 'Transport', def: 'mock',
    options: [['mock', 'Mock (no setup)'], ['ollama', 'Ollama (local model)']],
    hint: 'Mock needs nothing. Ollama talks to a real model on your machine.' },
  { g: 'Transport', kind: 'meta', key: 'ollamaModel', type: 'text', def: 'llama3.2', label: 'Ollama model',
    showIf: (get) => get('transport') === 'ollama' },
  { g: 'Transport', kind: 'meta', key: 'scenario', type: 'select', label: 'Mock replies', def: 'normal',
    options: [
      ['normal', 'Normal (markdown + code)'],
      ['long', 'Long answer (scroll test)'],
      ['slow', 'Slow first token (2.6s)'],
      ['empty', 'Empty reply'],
      ['markdown', 'Markdown torture test'],
      ['xss', 'XSS / sanitization test'],
    ],
    showIf: (get) => get('transport') === 'mock',
    hint: 'What the mock sends back — each one reproduces a case that has broken this component before.' },

  // ---------- Behaviour ----------
  { g: 'Behaviour', kind: 'attr', key: 'theme', type: 'select', label: 'theme', def: 'light',
    options: [['auto', 'auto (follow OS)'], ['light', 'light'], ['dark', 'dark']] },
  { g: 'Behaviour', kind: 'attr', key: 'placeholder', type: 'text', def: 'Ask me anything…', label: 'placeholder' },
  { g: 'Behaviour', kind: 'attr', key: 'system-prompt', type: 'textarea', def: '', label: 'system-prompt',
    hint: 'Prepended to every request; never shown in the UI.' },
  { g: 'Behaviour', kind: 'attr', key: 'disabled', type: 'bool', def: false, label: 'disabled' },

  // ---------- Chrome ----------
  { g: 'Chrome', kind: 'attr', key: 'show-header', type: 'bool', def: false, label: 'show-header' },
  { g: 'Chrome', kind: 'attr', key: 'show-clear', type: 'bool', def: false, label: 'show-clear' },
  { g: 'Chrome', kind: 'attr', key: 'show-retry', type: 'bool', def: true, label: 'show-retry' },
  { g: 'Chrome', kind: 'attr', key: 'show-names', type: 'bool', def: true, label: 'show-names' },
  { g: 'Chrome', kind: 'attr', key: 'show-timestamps', type: 'bool', def: true, label: 'show-timestamps' },
  { g: 'Chrome', kind: 'attr', key: 'assistant-bubble', type: 'bool', def: false, label: 'assistant-bubble',
    hint: 'Off = borderless plain text (ChatGPT/Claude style).' },
  { g: 'Chrome', kind: 'attr', key: 'show-aside', type: 'bool', def: false, label: 'show-aside',
    hint: 'The sidebar column. Its content is YOUR list — the component stores one conversation.' },
  { g: 'Chrome', kind: 'attr', key: 'aside-side', type: 'select', def: 'left', label: 'aside-side',
    options: [['left', 'left'], ['right', 'right']], showIf: (get) => get('show-aside') },
  { g: 'Chrome', kind: 'attr', key: 'empty-heading', type: 'text', def: '', label: 'empty-heading' },
  { g: 'Chrome', kind: 'attr', key: 'empty-body', type: 'text', def: '', label: 'empty-body' },

  // ---------- Slots ----------
  { g: 'Slots', kind: 'slot', key: 'slot:assistant-avatar', type: 'bool', def: false, label: 'assistant-avatar' },
  { g: 'Slots', kind: 'slot', key: 'slot:user-avatar', type: 'bool', def: false, label: 'user-avatar' },
  { g: 'Slots', kind: 'slot', key: 'slot:header', type: 'bool', def: false, label: 'header (replaces bar)',
    hint: 'Needs show-header.' },
  { g: 'Slots', kind: 'slot', key: 'slot:composer-actions-start', type: 'bool', def: false, label: 'composer-actions-start' },
  { g: 'Slots', kind: 'slot', key: 'slot:composer-actions-end', type: 'bool', def: false, label: 'composer-actions-end' },
  { g: 'Slots', kind: 'slot', key: 'slot:send-icon', type: 'bool', def: false, label: 'send-icon' },
  { g: 'Slots', kind: 'slot', key: 'slot:empty-icon', type: 'bool', def: false, label: 'empty-icon' },

  // ---------- Colors ----------
  { g: 'Colors', kind: 'var', key: '--ai-chat-accent', type: 'color', def: '#4f46e5', label: 'accent',
    hint: 'The one-line rebrand — cascades to buttons, user bubble, focus, links.' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-accent-fg', type: 'color', def: '#ffffff', label: 'accent-fg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-bg', type: 'color', def: '#ffffff', label: 'bg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-fg', type: 'color', def: '#1a1a1a', label: 'fg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-muted', type: 'color', def: '#6b7280', label: 'muted' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-border', type: 'color', def: '#e5e7eb', label: 'border' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-user-bg', type: 'color', def: '#4f46e5', label: 'user-bg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-user-fg', type: 'color', def: '#ffffff', label: 'user-fg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-assistant-bg', type: 'color', def: '#f3f4f6', label: 'assistant-bg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-assistant-fg', type: 'color', def: '#1a1a1a', label: 'assistant-fg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-code-bg', type: 'color', def: '#0d1117', label: 'code-bg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-code-fg', type: 'color', def: '#e6edf3', label: 'code-fg' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-error', type: 'color', def: '#dc2626', label: 'error' },
  { g: 'Colors', kind: 'var', key: '--ai-chat-aside-bg', type: 'color', def: '#ffffff', label: 'aside-bg' },

  // ---------- Radius ----------
  { g: 'Radius', kind: 'var', key: '--ai-chat-radius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'radius (master)',
    hint: 'Every other radius follows this unless overridden below.' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-outer-radius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'outer-radius',
    hint: 'The widget frame itself. 0 = square.' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-bubble-radius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'bubble-radius' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-input-radius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'input-radius' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-code-radius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'code-radius' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-radius-sm', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'radius-sm' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-button-radius', type: 'text', def: '8px', label: 'button-radius',
    hint: 'Try 50% for circular icon buttons.' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-send-radius', type: 'text', def: '8px', label: 'send-radius' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-new-chat-radius', type: 'text', def: '8px', label: 'new-chat-radius',
    hint: 'The sidebar button is full-width — 50% would make it a pill, so it has its own knob.' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-jump-radius', type: 'text', def: '50%', label: 'jump-radius' },
  { g: 'Radius', kind: 'var', key: '--ai-chat-avatar-radius', type: 'text', def: '8px', label: 'avatar-radius' },

  // ---------- Borders ----------
  { g: 'Borders', kind: 'var', key: '--ai-chat-border-width', type: 'range', def: 1, min: 0, max: 4, fmt: px, label: 'border-width' },
  { g: 'Borders', kind: 'var', key: '--ai-chat-input-border-width', type: 'range', def: 1, min: 0, max: 4, fmt: px, label: 'input-border-width' },
  { g: 'Borders', kind: 'var', key: '--ai-chat-composer-border-width', type: 'range', def: 0, min: 0, max: 4, fmt: px, label: 'composer-border-width' },
  { g: 'Borders', kind: 'var', key: '--ai-chat-header-border-width', type: 'range', def: 1, min: 0, max: 4, fmt: px, label: 'header-border-width' },
  { g: 'Borders', kind: 'var', key: '--ai-chat-code-border-width', type: 'range', def: 1, min: 0, max: 4, fmt: px, label: 'code-border-width' },
  { g: 'Borders', kind: 'var', key: '--ai-chat-table-border-width', type: 'range', def: 1, min: 0, max: 4, fmt: px, label: 'table-border-width' },

  // ---------- Focus ring ----------
  { g: 'Focus ring', kind: 'var', key: '--ai-chat-focus-color', type: 'text', def: 'color-mix(in srgb, var(--ai-chat-accent) 55%, transparent)', label: 'focus-color',
    hint: 'Keyboard focus ring (:focus-visible only). Defaults to a softened accent — try a solid color or a different alpha.' },
  { g: 'Focus ring', kind: 'var', key: '--ai-chat-focus-width', type: 'range', def: 2, min: 0, max: 6, fmt: px, label: 'focus-width',
    hint: '0 removes the ring (not recommended — it is an accessibility affordance).' },
  { g: 'Focus ring', kind: 'var', key: '--ai-chat-focus-offset', type: 'range', def: 2, min: 0, max: 6, fmt: px, label: 'focus-offset' },

  // ---------- Type & size ----------
  { g: 'Type & size', kind: 'var', key: '--ai-chat-font', type: 'text', def: '', label: 'font',
    hint: 'e.g. Georgia, serif — blank uses the system stack.' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-font-mono', type: 'text', def: '', label: 'font-mono' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-font-size', type: 'range', def: 15, min: 11, max: 22, fmt: px, label: 'font-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-line-height', type: 'range', def: 1.55, min: 1.1, max: 2.2, step: 0.05, label: 'line-height' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-max-width', type: 'range', def: 760, min: 320, max: 1200, fmt: px, label: 'max-width' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-gap', type: 'range', def: 16, min: 0, max: 44, fmt: px, label: 'gap' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-avatar-size', type: 'range', def: 32, min: 18, max: 56, fmt: px, label: 'avatar-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-button-size', type: 'range', def: 42, min: 24, max: 60, fmt: px, label: 'button-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-send-size', type: 'range', def: 34, min: 20, max: 52, fmt: px, label: 'send-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-clear-size', type: 'range', def: 32, min: 20, max: 52, fmt: px, label: 'clear-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-jump-size', type: 'range', def: 36, min: 20, max: 56, fmt: px, label: 'jump-size' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-input-max-height', type: 'range', def: 200, min: 60, max: 420, fmt: px, label: 'input-max-height' },
  { g: 'Type & size', kind: 'var', key: '--ai-chat-show-avatars', type: 'select', def: 'grid', label: 'show-avatars',
    options: [['grid', 'grid (show)'], ['none', 'none (force-hide)']],
    hint: 'none hides avatars even when slotted.' },

  // ---------- Spacing ----------
  { g: 'Spacing', kind: 'var', key: '--ai-chat-bubble-padding', type: 'text', def: '4px 14px', label: 'bubble-padding' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-input-padding', type: 'text', def: '8px 14px 2px', label: 'input-padding' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-messages-padding', type: 'text', def: '20px 16px', label: 'messages-padding' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-composer-padding', type: 'text', def: '12px 16px 16px', label: 'composer-padding' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-header-padding', type: 'text', def: '10px 16px', label: 'header-padding' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-aside-width', type: 'range', def: 260, min: 150, max: 400, fmt: px, label: 'aside-width' },
  { g: 'Spacing', kind: 'var', key: '--ai-chat-aside-padding', type: 'text', def: '12px', label: 'aside-padding' },

  // ---------- Labels ----------
  { g: 'Labels (i18n)', kind: 'label', key: 'userName', type: 'text', def: 'You' },
  { g: 'Labels (i18n)', kind: 'label', key: 'assistantName', type: 'text', def: 'AI bot' },
  { g: 'Labels (i18n)', kind: 'label', key: 'headerTitle', type: 'text', def: 'Chat' },
  { g: 'Labels (i18n)', kind: 'label', key: 'clearChat', type: 'text', def: 'New chat' },
  { g: 'Labels (i18n)', kind: 'label', key: 'retry', type: 'text', def: 'Retry' },
  { g: 'Labels (i18n)', kind: 'label', key: 'emptyHeading', type: 'text', def: 'Start a conversation' },
  { g: 'Labels (i18n)', kind: 'label', key: 'emptyBody', type: 'text', def: 'Ask anything to get started.' },
  { g: 'Labels (i18n)', kind: 'label', key: 'emptyResponse', type: 'text', def: 'No response.' },
  { g: 'Labels (i18n)', kind: 'label', key: 'typing', type: 'text', def: 'Assistant is typing' },
  { g: 'Labels (i18n)', kind: 'label', key: 'copy', type: 'text', def: 'Copy' },
  { g: 'Labels (i18n)', kind: 'label', key: 'copied', type: 'text', def: 'Copied!' },
  { g: 'Labels (i18n)', kind: 'label', key: 'send', type: 'text', def: 'Send message' },
  { g: 'Labels (i18n)', kind: 'label', key: 'stop', type: 'text', def: 'Stop' },
  { g: 'Labels (i18n)', kind: 'label', key: 'jumpToLatest', type: 'text', def: 'Jump to latest' },
  { g: 'Labels (i18n)', kind: 'label', key: 'inputLabel', type: 'text', def: 'Message' },
  { g: 'Labels (i18n)', kind: 'label', key: 'messagesRegion', type: 'text', def: 'Chat messages' },

  // ---------- Host page (not the component) ----------
  { g: 'Host page', kind: 'frame', key: 'frameRadius', css: 'borderRadius', type: 'range', def: 8, min: 0, max: 28, fmt: px, label: 'wrapper radius',
    hint: 'The playground\'s own box. It clips the widget — if this is square, outer-radius looks ignored.' },
  { g: 'Host page', kind: 'frame', key: 'frameShadow', css: 'boxShadow', type: 'select', def: 'none', label: 'wrapper shadow',
    options: [['none', 'none'], ['0 1px 3px rgba(0,0,0,.1)', 'subtle'], ['0 12px 32px rgba(0,0,0,.18)', 'strong']] },
];

/** One-click looks. Values are exactly what `state` holds. */
export const PRESETS = [
  { name: 'Default', desc: 'Ship-as-is', swatches: ['#4f46e5', '#fff', '#f3f4f6'], values: {} },
  {
    name: 'ChatGPT-ish', desc: 'Plain, roomy', swatches: ['#10a37f', '#fff', '#f7f7f8'],
    values: {
      '--ai-chat-accent': '#10a37f', '--ai-chat-assistant-bg': '#f7f7f8',
      '--ai-chat-radius': 12, '--ai-chat-button-radius': '50%',
      '--ai-chat-new-chat-radius': '10px', '--ai-chat-avatar-radius': '50%',
      '--ai-chat-max-width': 720, '--ai-chat-gap': 24,
      'show-aside': true, 'show-clear': true, 'show-header': true,
      'slot:assistant-avatar': true, 'slot:user-avatar': true,
    },
  },
  {
    name: 'Terminal', desc: 'Sharp, mono', swatches: ['#22c55e', '#0b0f0c', '#111a13'],
    values: {
      theme: 'dark', '--ai-chat-accent': '#22c55e', '--ai-chat-accent-fg': '#04120a',
      '--ai-chat-bg': '#0b0f0c', '--ai-chat-fg': '#c8f5d8', '--ai-chat-assistant-bg': '#111a13',
      '--ai-chat-border': '#1d2f22', '--ai-chat-muted': '#6f8f7c',
      '--ai-chat-radius': 0, '--ai-chat-outer-radius': 0, '--ai-chat-button-radius': '0px',
      '--ai-chat-send-radius': '0px', '--ai-chat-new-chat-radius': '0px', '--ai-chat-jump-radius': '0px',
      '--ai-chat-avatar-radius': '0px',
      '--ai-chat-font': 'ui-monospace, Menlo, Consolas, monospace',
      '--ai-chat-font-size': 13, 'assistant-bubble': true, 'frameRadius': 0,
    },
  },
  {
    name: 'Soft / pastel', desc: 'Round, airy', swatches: ['#e0669b', '#fffafc', '#fdeef4'],
    values: {
      '--ai-chat-accent': '#e0669b', '--ai-chat-bg': '#fffafc',
      '--ai-chat-assistant-bg': '#fdeef4', '--ai-chat-border': '#f6dbe6',
      '--ai-chat-radius': 20, '--ai-chat-outer-radius': 20, '--ai-chat-button-radius': '50%',
      '--ai-chat-new-chat-radius': '16px', '--ai-chat-avatar-radius': '50%',
      '--ai-chat-gap': 22, 'assistant-bubble': true, 'frameRadius': 20,
      'frameShadow': '0 12px 32px rgba(0,0,0,.18)',
    },
  },
];

/* ===========================================================================
   Panel builder — renders CONTROLS into the sidebar.
   =========================================================================== */

const GROUPS_OPEN = new Set(['Transport', 'Behaviour']);

export function buildPanel(root, ctx) {
  const { get, set, isSet, onAction, onPreset, onScenario, onTransport } = ctx;
  const openState = new Map(
    [...root.querySelectorAll('details.group')].map((d) => [d.dataset.g, d.open]),
  );
  root.innerHTML = '';

  // ---- Presets ----
  root.appendChild(group('Presets', true, (body) => {
    const grid = el('div', 'preset-grid');
    for (const p of PRESETS) {
      const b = el('button', 'preset');
      b.type = 'button';
      b.innerHTML = `<b>${p.name}</b><span>${p.desc}</span>`;
      const sw = el('div', 'swatches');
      for (const c of p.swatches) { const i = document.createElement('i'); i.style.background = c; sw.appendChild(i); }
      b.appendChild(sw);
      b.onclick = () => onPreset(p);
      grid.appendChild(b);
    }
    body.appendChild(grid);
  }, openState));

  // ---- Scenarios / actions ----
  root.appendChild(group('Try it', true, (body) => {
    const g1 = el('div', 'btn-grid');
    g1.append(
      action('Seed a conversation', () => onAction('seed')),
      action('14 messages (scroll)', () => onAction('long')),
      action('Fail next request', () => onAction('failNext')),
      action('Stop stream', () => onAction('stop')),
      action('Clear', () => onAction('clear')),
      action('Reset all controls', () => onAction('reset')),
    );
    body.appendChild(g1);
    const hint = el('p', 'hint');
    hint.textContent = 'Keyboard: Enter sends, Shift+Enter newline, Esc stops a stream.';
    body.appendChild(hint);
  }, openState));

  // ---- Everything from CONTROLS, grouped ----
  const groups = [];
  for (const c of CONTROLS) if (!groups.includes(c.g)) groups.push(c.g);

  for (const gname of groups) {
    const items = CONTROLS.filter((c) => c.g === gname);
    root.appendChild(group(gname, GROUPS_OPEN.has(gname), (body) => {
      for (const c of items) {
        if (c.showIf && !c.showIf(get)) continue;
        body.appendChild(widget(c, ctx));
      }
      if (gname === 'Transport') {
        const st = el('p', 'status');
        st.id = 'transportStatus';
        // Re-render the current status: this panel gets rebuilt when the
        // transport changes, and a fresh empty <p> would silently swallow a
        // message that was already set (or one from an in-flight probe).
        const s = ctx.getStatus?.();
        if (s?.text) { st.textContent = s.text; st.className = 'status ' + (s.kind || ''); }
        body.appendChild(st);
      }
    }, openState));
  }

  // ---- Event log ----
  root.appendChild(group('Event log', false, (body) => {
    const p = el('p', 'hint');
    p.textContent = 'What your app would receive from the component.';
    const pre = document.createElement('pre');
    pre.id = 'eventLog';
    pre.className = 'mono';
    pre.style.cssText = 'margin:0;max-height:150px;overflow:auto;white-space:pre-wrap;line-height:1.5';
    pre.textContent = 'No events yet.';
    body.append(p, pre);
  }, openState));

  function widget(c, { get, set }) {
    const row = el('div', c.type === 'textarea' || c.hint ? 'row row--stack' : 'row');
    const lab = document.createElement('label');
    lab.textContent = c.label ?? c.key;
    if (c.kind === 'var' || c.kind === 'label') {
      lab.title = c.key;
    }

    let input;
    if (c.type === 'bool') {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!get(c.key);
      input.onchange = () => set(c.key, input.checked);
    } else if (c.type === 'color') {
      input = document.createElement('input');
      input.type = 'color';
      input.value = get(c.key);
      input.oninput = () => set(c.key, input.value);
    } else if (c.type === 'range') {
      const wrap = el('div', 'num');
      // Own binding: `input` gets reassigned to `wrap` below, and the oninput
      // closure would otherwise read wrap.value (undefined on a div).
      const range = document.createElement('input');
      range.type = 'range';
      range.min = c.min; range.max = c.max; range.step = c.step ?? 1;
      range.value = get(c.key);
      const out = el('span', 'val');
      const show = (v) => (c.fmt ? c.fmt(v) : String(v));
      out.textContent = show(get(c.key));
      range.oninput = () => { out.textContent = show(range.value); set(c.key, Number(range.value)); };
      wrap.append(range, out);
      input = wrap;
    } else if (c.type === 'select') {
      input = document.createElement('select');
      for (const [v, t] of c.options) {
        const o = document.createElement('option');
        o.value = v; o.textContent = t;
        o.selected = String(get(c.key)) === String(v);
        input.appendChild(o);
      }
      input.onchange = () => {
        if (c.key === 'scenario') { onScenario(input.value); set(c.key, input.value); return; }
        set(c.key, input.value);
        if (c.key === 'transport') { onTransport(); rebuild(); }
        if (c.key === 'show-aside') rebuild();
      };
    } else if (c.type === 'textarea') {
      input = document.createElement('textarea');
      input.value = get(c.key);
      input.placeholder = 'e.g. You are a terse support agent for Acme.';
      input.oninput = () => set(c.key, input.value);
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = get(c.key) ?? '';
      input.placeholder = String(c.def ?? '');
      input.oninput = () => set(c.key, input.value);
    }

    row.append(lab, input);
    if (c.hint) {
      const h = el('p', 'hint');
      h.textContent = c.hint;
      row.appendChild(h);
      row.insertBefore(h, input);
    }
    return row;
  }

  function rebuild() { buildPanel(root, ctx); }
}

/* --- tiny DOM helpers --- */
function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function action(text, fn) { const b = el('button', 'act'); b.type = 'button'; b.textContent = text; b.onclick = fn; return b; }
function group(name, defOpen, fill, openState) {
  const d = document.createElement('details');
  d.className = 'group';
  d.dataset.g = name;
  d.open = openState?.has(name) ? openState.get(name) : defOpen;
  const s = document.createElement('summary');
  s.textContent = name;
  const body = el('div', 'group__body');
  fill(body);
  d.append(s, body);
  return d;
}
