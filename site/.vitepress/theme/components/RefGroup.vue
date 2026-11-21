<script setup lang="ts">
/* One group of a grouped reference list: attributes (a table), parts (a strip
   of chips) or labels (key and English default). The groups live in
   site/reference/groups.ts; test/site-docs.test.ts checks each name is real
   and in exactly one group. */
import { computed } from 'vue';
import { data } from '../../../reference/api.data';
import { attributeDescriptions } from '../../../reference/descriptions';
import { fmt, words } from '../../../reference/fmt';
import { attributeGroups, labelGroups, partGroups } from '../../../reference/groups';

const props = defineProps<{ kind: 'attributes' | 'parts' | 'labels'; group: string }>();

const attrs = computed(() => {
  const names = attributeGroups[props.group] ?? [];
  return names.map((n) => data.attributes.find((a) => a.name === n)!).filter(Boolean);
});
const parts = computed(() => (partGroups[props.group] ?? []).filter((p) => data.parts.includes(p)));
const labels = computed(() => {
  const keys = labelGroups[props.group] ?? [];
  return keys.map((k) => data.labels.find((l) => l.key === k)!).filter(Boolean);
});
</script>

<template>
  <table v-if="kind === 'attributes'" class="fd-ref">
    <thead><tr><th>Attribute</th><th>Type and default</th><th>What it does</th></tr></thead>
    <tbody>
      <tr v-for="a in attrs" :key="a.name" :id="a.name">
        <td><code>{{ a.name }}</code><span class="fd-sub"><code>.{{ a.property }}</code></span></td>
        <td><code class="fd-wrap" v-html="words(a.type)"></code><span v-if="a.default" class="fd-sub">default <code>{{ a.default }}</code></span></td>
        <td v-html="fmt(attributeDescriptions[a.name] ?? '')"></td>
      </tr>
    </tbody>
  </table>

  <p v-else-if="kind === 'parts'" class="fd-chips">
    <code v-for="p in parts" :key="p">{{ p }}</code>
  </p>

  <table v-else class="fd-ref">
    <thead><tr><th>Key</th><th>Default</th></tr></thead>
    <tbody>
      <tr v-for="l in labels" :key="l.key">
        <td><code>{{ l.key }}</code></td>
        <td>{{ l.text }}</td>
      </tr>
    </tbody>
  </table>
</template>
