<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { FeatureMeta } from '../features/types'

const { meta } = defineProps<{ meta: FeatureMeta }>()
</script>

<template>
  <header class="feature-header">
    <RouterLink to="/" class="back">返回功能列表</RouterLink>
    <h1>{{ meta.title }}</h1>
    <p class="summary">{{ meta.summary }}</p>
    <details class="highlights">
      <summary>技術重點</summary>
      <ul>
        <li v-for="item in meta.highlights" :key="item">{{ item }}</li>
      </ul>
    </details>
  </header>
</template>

<style scoped>
.feature-header {
  margin-bottom: 1.5rem;
}

.back {
  display: inline-block;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.summary {
  max-width: 48rem;
}

.highlights {
  margin-top: 0.75rem;
  font-size: 0.9375rem;
}

.highlights summary {
  cursor: pointer;
  color: var(--text-h);
}

.highlights ul {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
</style>
