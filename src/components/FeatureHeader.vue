<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { FeatureMeta } from '../features/types'
import DifficultyMeter from './DifficultyMeter.vue'

const { meta } = defineProps<{ meta: FeatureMeta }>()
</script>

<template>
  <header class="feature-header">
    <p class="infobar">
      <RouterLink to="/" class="back">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
        功能集
      </RouterLink>
      <span>建立於 <time :datetime="meta.createdAt">{{ meta.createdAt }}</time></span>
      <DifficultyMeter :level="meta.difficulty" />
    </p>

    <h1>{{ meta.title }}</h1>
    <p class="summary">{{ meta.summary }}</p>
    <p class="tags">
      <span class="visually-hidden">標籤：</span>
      <span v-for="tag in meta.tags" :key="tag" class="badge">{{ tag }}</span>
    </p>

    <section class="highlights" aria-labelledby="highlights-title">
      <h2 id="highlights-title">實作重點</h2>
      <ol>
        <li v-for="item in meta.highlights" :key="item">{{ item }}</li>
      </ol>
    </section>
  </header>
</template>

<style scoped>
.feature-header {
  max-width: 760px;
  margin-bottom: 2.5rem;
}

.infobar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  margin-bottom: 1.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  color: var(--text-muted);
}

.back:hover {
  color: var(--accent);
  text-decoration: none;
}

.back svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

h1,
h2 {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.75rem;
}

.highlights {
  margin-top: 2rem;
}

.highlights ol {
  margin: 0;
  padding-left: 1.5rem;
}

.highlights li + li {
  margin-top: 0.25rem;
}

.highlights li::marker {
  color: var(--text-muted);
}
</style>
