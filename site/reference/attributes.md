---
description: "Every ai-chat attribute with its property name, default value and what it does, generated from the component source so it never drifts."
---

<script setup>
import { data } from './api.data'
import { attributeDescriptions as d } from './descriptions'
import { fmt } from './fmt'
</script>

# Attributes

Set these in HTML, or as properties from JavaScript (the property name is under each
attribute). To turn a boolean off, set it to `"false"`:
`show-timestamps="false"`.

Generated from the source: {{ data.attributes.length }} attributes.

<table class="fd-ref">
  <thead><tr><th>Attribute</th><th>Type and default</th><th>What it does</th></tr></thead>
  <tbody>
    <tr v-for="a in data.attributes" :key="a.name" :id="a.name">
      <td><code>{{ a.name }}</code><span class="fd-sub"><code>.{{ a.property }}</code></span></td>
      <td><code class="fd-wrap">{{ a.type }}</code><span v-if="a.default" class="fd-sub">default <code>{{ a.default }}</code></span></td>
      <td v-html="fmt(d[a.name])"></td>
    </tr>
  </tbody>
</table>
