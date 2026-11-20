<script setup>
import { computed, ref } from 'vue'
import { data } from './api.data'
import { cssVarDescriptions as d } from './descriptions'
import { fmt } from './fmt'

const q = ref('')
const rows = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s
    ? data.cssVars.filter((v) => v.name.includes(s) || (d[v.name] ?? '').toLowerCase().includes(s))
    : data.cssVars
})
</script>

# CSS variables

Generated from the source: {{ data.cssVars.length }} variables, with their
defaults. Most default to another variable, so changing a parent moves its
children with it: every corner follows `--ai-chat-radius`, every user bubble
follows `--ai-chat-accent`. See [Theming](/customize/) for how to use them.

<label class="fd-filter">
  <span>Filter</span>
  <input v-model="q" type="search" placeholder="radius, accent, tool…" />
  <output>{{ rows.length }} shown</output>
</label>

<table class="fd-ref">
  <thead><tr><th>Variable</th><th>Default</th><th>What it controls</th></tr></thead>
  <tbody>
    <tr v-for="v in rows" :key="v.name" :id="v.name.slice(2)">
      <td><code>{{ v.name }}</code></td>
      <td><code class="fd-wrap">{{ v.value }}</code></td>
      <td v-html="fmt(d[v.name])"></td>
    </tr>
  </tbody>
</table>
