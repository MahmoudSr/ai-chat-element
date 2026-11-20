/**
 * Reads the public API out of the component's source text. Pure: it takes the
 * file contents, so the site's data loader (reading from disk) and the
 * accuracy test (importing the files raw, in a browser) use the same code.
 */
export interface CssVar { name: string; value: string }
export interface Attribute { name: string; property: string; type: string; default: string }
export interface ApiData {
  cssVars: CssVar[];
  parts: string[];
  slots: string[];
  labels: { key: string; text: string }[];
  attributes: Attribute[];
  /** Set from JavaScript only (attribute: false). */
  properties: Attribute[];
  /** Public methods with their signatures, as written in the source. */
  methods: { name: string; signature: string }[];
  /** Every ai-chat:* event the element fires. */
  events: string[];
}

export interface Sources {
  styles: string;
  chat: string;
  icons: string;
  labels: Record<string, string>;
}

export function extractApi({ styles: source, chat, icons, labels }: Sources): ApiData {
  // Comments first: they quote declarations ("a bolder ring is just
  // --ai-chat-focus-width: 3px, ...") that would otherwise be read as the
  // real default, with the rest of the comment swallowed into it.
  const styles = source.replace(/\/\*[\s\S]*?\*\//g, '');
  // Every --ai-chat-* declaration, with its default value. A variable that is
  // only read with a fallback (var(--x, fallback)) is listed with the fallback.
  const cssVars = new Map<string, string>();
  for (const m of styles.matchAll(/^\s*(--ai-chat-[a-z-]+):\s*([^;]+);/gm)) {
    if (!cssVars.has(m[1])) cssVars.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  for (const m of styles.matchAll(/var\((--ai-chat-[a-z-]+),\s*([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
    if (!cssVars.has(m[1])) cssVars.set(m[1], m[2].trim());
  }
  for (const name of new Set(styles.match(/--ai-chat-[a-z-]+/g) ?? [])) {
    if (!cssVars.has(name)) cssVars.set(name, '');
  }

  const parts = new Set<string>();
  for (const m of chat.matchAll(/part="([a-z0-9 -]+)"/g)) {
    for (const p of m[1].split(/\s+/)) if (p) parts.add(p);
  }
  // Parts built from a value, e.g. part="message message-${m.role}": keep the
  // fixed names, and expand the per-sender one.
  for (const m of chat.matchAll(/part="([^"]*\$\{[^"]*)"/g)) {
    for (const p of m[1].split(/\s+/)) if (p && !p.includes('$')) parts.add(p);
  }
  for (const role of ['user', 'assistant', 'system']) parts.add(`message-${role}`);

  const slots = new Set<string>();
  for (const m of (chat + icons).matchAll(/<slot name="([a-z-]+)"/g)) slots.add(m[1]);

  // Each @property(...) decorator: its options (read with balanced brackets,
  // since a converter holds functions), then the field, its type and its
  // initial value.
  const attributes: Attribute[] = [];
  const properties: Attribute[] = [];
  let at = 0;
  while ((at = chat.indexOf('@property(', at)) !== -1) {
    let i = at + '@property('.length;
    let depth = 1;
    const start = i;
    for (; i < chat.length && depth; i++) {
      if (chat[i] === '(' || chat[i] === '{') depth++;
      else if (chat[i] === ')' || chat[i] === '}') depth--;
    }
    const opts = chat.slice(start, i - 1);
    // The field runs to its ';'. A default starts at an '=' that isn't '=>'.
    const decl = chat.slice(i, chat.indexOf(';', i));
    const field = decl.match(/^\s*(?:override\s+)?(\w+)(\??)\s*(?::\s*([\s\S]*?))?\s*(?:=(?!>)\s*([\s\S]*))?$/);
    at = i;
    if (!field) continue;
    const property = field[1];
    const tsType = field[3]?.trim();
    const type = /type:\s*Boolean/.test(opts) ? 'boolean' : /type:\s*Number/.test(opts) ? 'number' : tsType || 'string';
    const entry = { property, type, default: (field[4] ?? '').trim() };
    if (/attribute:\s*false/.test(opts)) {
      properties.push({ name: property, ...entry });
    } else {
      const name = opts.match(/attribute:\s*'([a-z-]+)'/)?.[1] ?? property.toLowerCase();
      attributes.push({ name, ...entry });
    }
  }

  // Public methods: a two-space-indented member with a return type. Private,
  // protected and Lit's own hooks (which carry `override`) don't match.
  const methods: { name: string; signature: string }[] = [];
  for (const m of chat.matchAll(/^  (async )?([a-z]\w*)(\([^)]*\)):\s*([^{]+?)\s*\{/gm)) {
    methods.push({ name: m[2], signature: `${m[2]}${m[3]}: ${m[4]}` });
  }

  return {
    cssVars: [...cssVars].map(([name, value]) => ({ name, value })),
    parts: [...parts],
    slots: [...slots],
    labels: Object.entries(labels).map(([key, text]) => ({ key, text: String(text) })),
    attributes,
    properties,
    methods,
    events: [...new Set([...chat.matchAll(/'ai-chat:([a-z-]+)'/g)].map((m) => `ai-chat:${m[1]}`))].sort(),
  };
}
