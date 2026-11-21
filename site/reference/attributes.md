---
description: "Every ai-chat attribute with its property name, default value and what it does, generated from the component source so it never drifts."
---

<script setup>
import { data } from './api.data'
</script>

# Attributes

Set these in HTML, or as properties from JavaScript (the property name is under each
attribute). To turn a boolean off, set it to `"false"`:
`show-timestamps="false"`.

All {{ data.attributes.length }} attributes, grouped by what they do.

## Look

Light or dark, bubbles, names, times and avatars.

<RefGroup kind="attributes" group="look" />

## Words on screen

The input's placeholder and what an empty chat says.

<RefGroup kind="attributes" group="words" />

## Conversation

The system prompt, which conversation is open, loading older messages, and
turning the chat off.

<RefGroup kind="attributes" group="conversation" />

## Buttons

Which built-in buttons show: the header, New chat, Retry, Copy and Edit.

<RefGroup kind="attributes" group="buttons" />

## Sidebar

The history sidebar and when it turns into a drawer.

<RefGroup kind="attributes" group="sidebar" />

## Attachments

Letting people attach files, and which ones.

<RefGroup kind="attributes" group="attachments" />

## Images in replies

Whether a reply may show images, and from where.

<RefGroup kind="attributes" group="images" />

## Thinking and tools

Showing the model's reasoning and its tool calls.

<RefGroup kind="attributes" group="steps" />
