<script setup lang="ts">
/* One group's table on the CSS variables page: name, default, description,
   narrowed by the page's shared filter. */
import { computed } from 'vue';
import { data } from '../../../reference/api.data';
import { cssVarDescriptions as d } from '../../../reference/descriptions';
import { fmt, words } from '../../../reference/fmt';
import { cssVarGroups, varFilter } from '../../../reference/groups';

const props = defineProps<{ group: string }>();
const values = new Map(data.cssVars.map((v) => [v.name, v.value]));

const rows = computed(() => {
  const q = varFilter.value.trim().toLowerCase();
  return (cssVarGroups[props.group] ?? [])
    .map((short) => `--ai-chat-${short}`)
    .filter((name) => !q || name.includes(q) || (d[name] ?? '').toLowerCase().includes(q))
    .map((name) => ({ name, value: values.get(name) ?? '' }));
});
</script>

<template>
  <table v-if="rows.length" class="fd-ref">
    <thead><tr><th>Variable and default</th><th>What it changes</th></tr></thead>
    <tbody>
      <tr v-for="v in rows" :key="v.name" :id="v.name.slice(2)">
        <td><code>{{ v.name }}</code><span class="fd-sub">default <code class="fd-wrap" v-html="words(v.value)"></code></span></td>
        <td v-html="fmt(d[v.name] ?? '')"></td>
      </tr>
    </tbody>
  </table>
  <p v-else class="fd-none">Nothing here matches the filter.</p>
</template>
