<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { features } from '../features/registry'
import type { Difficulty } from '../features/types'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  basic: '基礎',
  intermediate: '中階',
  advanced: '進階',
}

const route = useRoute()
const router = useRouter()

function parseTags(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : [value]
  return raw
    .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

const allTags = computed(() => {
  const counts = new Map<string, number>()
  for (const f of features) {
    for (const tag of f.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }))
})

// 篩選狀態存在 URL query，重新整理或分享連結都能保留
const selectedTags = computed(() => {
  const known = new Set(allTags.value.map((t) => t.tag))
  return parseTags(route.query.tags).filter((t) => known.has(t))
})

const visibleFeatures = computed(() => {
  const selected = selectedTags.value
  if (selected.length === 0) return features
  return features.filter((f) => selected.every((t) => f.tags.includes(t)))
})

function setTags(tags: string[]) {
  void router.replace({
    query: { ...route.query, tags: tags.length > 0 ? tags.join(',') : undefined },
  })
}

function toggleTag(tag: string) {
  const current = selectedTags.value
  setTags(current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag])
}
</script>

<template>
  <section class="home" aria-labelledby="home-title">
    <h1 id="home-title">功能集</h1>
    <p class="lead">
      每個功能是一個獨立、可互動的前端技術展示，附上設計取捨與實作重點。
    </p>

    <div v-if="allTags.length > 0" class="filters" role="group" aria-label="依標籤篩選">
      <button
        v-for="{ tag, count } in allTags"
        :key="tag"
        type="button"
        class="chip"
        :aria-pressed="selectedTags.includes(tag)"
        @click="toggleTag(tag)"
      >
        {{ tag }} <span class="chip-count">{{ count }}</span>
      </button>
      <button
        v-if="selectedTags.length > 0"
        type="button"
        class="clear"
        @click="setTags([])"
      >
        清除篩選
      </button>
    </div>

    <p class="result" aria-live="polite">共 {{ visibleFeatures.length }} 個功能</p>

    <ul v-if="visibleFeatures.length > 0" class="grid">
      <li v-for="feature in visibleFeatures" :key="feature.slug">
        <RouterLink :to="`/features/${feature.slug}`" class="card">
          <div class="card-head">
            <h2>{{ feature.title }}</h2>
            <span class="difficulty" :data-level="feature.difficulty">
              {{ DIFFICULTY_LABEL[feature.difficulty] }}
            </span>
          </div>
          <p class="summary">{{ feature.summary }}</p>
          <ul class="tags" aria-label="標籤">
            <li v-for="tag in feature.tags" :key="tag">{{ tag }}</li>
          </ul>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="empty">沒有符合所有標籤的功能，試著減少篩選條件。</p>
  </section>
</template>

<style scoped>
.lead {
  max-width: 40rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.chip,
.clear {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  color: var(--accent);
  background: var(--accent-bg);
  border-color: var(--accent-border);
}

.chip-count {
  font-size: 0.8em;
  opacity: 0.7;
}

.clear {
  border-style: dashed;
}

.result {
  margin-top: 1rem;
  font-size: 0.875rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  gap: 1rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}

.card:hover {
  border-color: var(--accent-border);
  box-shadow: var(--shadow);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.card-head h2 {
  margin: 0;
  font-size: 1.125rem;
}

.difficulty {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  background: var(--surface);
}

.difficulty[data-level='advanced'] {
  color: var(--accent);
  background: var(--accent-bg);
}

.summary {
  flex: 1;
  font-size: 0.9375rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.75rem;
}

.tags li {
  padding: 0 0.4rem;
  border-radius: 4px;
  background: var(--code-bg);
}

.empty {
  margin-top: 1.5rem;
}
</style>
