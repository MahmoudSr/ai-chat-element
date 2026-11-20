<script setup>
import { data } from '../reference/api.data'
</script>

# Theming

Every colour, size, corner and font comes from a CSS variable, so you restyle
the chat from your own stylesheet without reaching into its Shadow DOM. There
are {{ data.cssVars.length }} of them, and almost all follow a parent, so you
usually set only a few.

<ThemeLab />

## One line to match your brand

```css
ai-chat {
  --ai-chat-accent: #0a7a60;
}
```

The accent colours the Send button, your message bubbles, links and the focus
ring. If your accent is light, set the text on it too:
`--ai-chat-accent-fg: #16181d`.

## Corners

One variable rounds everything: bubbles, the input, code blocks, buttons and
avatars.

```css
ai-chat {
  --ai-chat-radius: 12px; /* 0 for sharp corners */
}
```

Each surface still has its own variable when you want one different, for
example round buttons with `--ai-chat-button-radius: 50%`. The chat rounds its
own outer frame by default; set `--ai-chat-outer-radius: 0` when the box you
put it in already does.

## Fonts and spacing

```css
ai-chat {
  --ai-chat-font: 'Inter', sans-serif;
  --ai-chat-font-mono: 'JetBrains Mono', monospace;
  --ai-chat-font-size: 15px;
  --ai-chat-max-width: 760px; /* width of the message column */
}
```

## Light and dark

The `theme` attribute picks the colours: `auto` (the default) follows the
visitor's system setting, `light` and `dark` force one.

```html
<ai-chat theme="dark"></ai-chat>
```

::: warning Your colours apply in both modes
A colour you set on the element wins over the built-in dark palette too. If
you change backgrounds or text colours, give the dark mode its own values:

```css
ai-chat {
  --ai-chat-bg: #fbfaf7;
}
@media (prefers-color-scheme: dark) {
  ai-chat:not([theme='light']) {
    --ai-chat-bg: #141517;
  }
}
ai-chat[theme='dark'] {
  --ai-chat-bg: #141517;
}
```

The accent alone is safe in both modes.
:::

## Beyond variables

For a change no variable covers, style the chat's inner parts with
[`::part()`](./parts), or put your own markup in its [slots](./slots).
