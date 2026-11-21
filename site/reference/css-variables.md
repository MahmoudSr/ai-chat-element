---
description: "A searchable list of every ai-chat CSS variable with its default value and what it controls, generated from the component stylesheet."
---

<script setup>
import { computed } from 'vue'
import { data } from './api.data'
import { cssVarDescriptions as d } from './descriptions'
import { varFilter } from './groups'

const shown = computed(() => {
  const q = varFilter.value.trim().toLowerCase()
  return q
    ? data.cssVars.filter((v) => v.name.includes(q) || (d[v.name] ?? '').toLowerCase().includes(q)).length
    : data.cssVars.length
})
</script>

# CSS variables

All {{ data.cssVars.length }} variables, grouped by what they change. Set them
on `ai-chat` in your own CSS. Most of them follow another one, so you usually
only need a few: change `--ai-chat-accent` and the Send button, your messages
and links change with it; change `--ai-chat-radius` and every corner follows. [Theming](/customize/)
shows how.

<label class="fd-filter">
  <span>Filter</span>
  <input v-model="varFilter" type="search" placeholder="radius, accent, tool…" />
  <output>{{ shown }} shown</output>
</label>

## Colors

The main colors. Start with `--ai-chat-accent`: the Send button, your
messages, links and the focus ring all follow it.

<VarTable group="colors" />

## Text

Fonts and text size.

<VarTable group="text" />

## Corners

How round things are. Every corner follows `--ai-chat-radius`, so one line
changes them all; the rest let you change one corner on its own.

<VarTable group="corners" />

## Borders

How thick the lines are. They all follow `--ai-chat-border-width`.

<VarTable group="borders" />

## Layout and spacing

How wide the chat is and how much room is around things.

<VarTable group="layout" />

## Messages

The message bubbles and the avatars next to them.

<VarTable group="messages" />

## Formatted replies

How the AI's replies look: links, bold text, headings, lists, quotes, code and
tables.

<VarTable group="replies" />

## Input box

The box you type in, its Send button and the files you attach.

<VarTable group="input" />

## Message buttons

The Copy and Edit buttons under each message.

<VarTable group="actions" />

## Images

Images in messages, and the full-size view when you click one.

<VarTable group="images" />

## Header and sidebar

The bar at the top, the New chat button and the history sidebar.

<VarTable group="chrome" />

## Thinking and tools

The "Thought for 12s" panel and the rows for tool calls.

<VarTable group="steps" />

## Keyboard focus

The ring that shows which control has keyboard focus.

<VarTable group="focus" />
