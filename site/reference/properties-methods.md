<script setup>
import { data } from './api.data'
import { propertyDescriptions as pd, methodDescriptions as md } from './descriptions'
import { fmt } from './fmt'
</script>

# Properties and methods

## Properties

These hold objects, arrays or functions, so they're set from JavaScript, never
as attributes. Every [attribute](./attributes) is a property too.

<table class="fd-ref">
  <thead><tr><th>Property</th><th>Type</th><th>What it does</th></tr></thead>
  <tbody>
    <tr v-for="p in data.properties" :key="p.name" :id="p.name">
      <td><code>.{{ p.name }}</code></td>
      <td><code class="fd-wrap">{{ p.type }}</code></td>
      <td v-html="fmt(pd[p.name])"></td>
    </tr>
  </tbody>
</table>

## Methods

Signatures as written in the source.

<table class="fd-ref">
  <thead><tr><th>Method</th><th>What it does</th></tr></thead>
  <tbody>
    <tr v-for="m in data.methods" :key="m.name" :id="m.name">
      <td><code class="fd-wrap">{{ m.signature }}</code></td>
      <td v-html="fmt(md[m.name])"></td>
    </tr>
  </tbody>
</table>
