<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import DifficultyMeter from '../components/DifficultyMeter.vue'
import { features } from '../features/registry'

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

const lastUpdated = features[0]?.createdAt

// 編號依建立順序固定，不受篩選影響
const orderOf = new Map(features.map((f, i) => [f.slug, features.length - i]))
const formatOrder = (slug: string) => String(orderOf.get(slug) ?? 0).padStart(2, '0')

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
  <section class="home container" aria-labelledby="home-title">
    <p class="infobar">
      <span>{{ features.length }} 個功能</span>
      <span v-if="lastUpdated">更新於 <time :datetime="lastUpdated">{{ lastUpdated }}</time></span>
    </p>

    <h1 id="home-title">功能集</h1>
    <p class="lead">
      一組可獨立操作的前端實作，每個都附上規格、測試與設計取捨。點進去切換參數、看即時數據。
    </p>

    <div class="toolbar">
      <div v-if="allTags.length > 0" class="filters" role="group" aria-label="依標籤篩選">
        <span class="filter-label" aria-hidden="true">標籤</span>
        <button
          v-for="{ tag, count } in allTags"
          :key="tag"
          type="button"
          class="chip"
          :aria-pressed="selectedTags.includes(tag)"
          @click="toggleTag(tag)"
        >
          {{ tag }}<span class="chip-count">{{ count }}</span>
        </button>
        <button v-if="selectedTags.length > 0" type="button" class="clear" @click="setTags([])">
          清除
        </button>
      </div>
      <p class="result" aria-live="polite">
        顯示 {{ visibleFeatures.length }} / {{ features.length }}
      </p>
    </div>

    <ol v-if="visibleFeatures.length > 0" class="rows">
      <li v-for="feature in visibleFeatures" :key="feature.slug">
        <RouterLink :to="`/features/${feature.slug}`" class="row">
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 16 16">
              <path d="M4 1.5h5.5L13 5v9.5H4z" />
              <path d="M9.5 1.5V5H13M6 8h5M6 10.5h5" />
            </svg>
          </span>
          <span class="main-col">
            <span class="title-line">
              <span class="order">{{ formatOrder(feature.slug) }}</span>
              <span class="title">{{ feature.title }}</span>
            </span>
            <span class="summary">{{ feature.summary }}</span>
            <span class="meta">
              <span class="visually-hidden">標籤：</span>
              <span v-for="tag in feature.tags" :key="tag" class="badge">{{ tag }}</span>
              <DifficultyMeter class="level" :level="feature.difficulty" />
              <time class="date" :datetime="feature.createdAt">{{ feature.createdAt }}</time>
            </span>
          </span>
        </RouterLink>
      </li>
    </ol>
    <div v-else class="callout empty">
      <p>沒有同時符合這些標籤的功能。</p>
      <button type="button" class="clear" @click="setTags([])">清除篩選</button>
    </div>
  </section>
</template>

<style scoped>
.home {
  max-width: 880px;
  padding-top: 1rem;
}

.infobar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

h1 {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.lead {
  max-width: 40rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-top: 2rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.filter-label {
  margin-right: 0.25rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.chip,
.clear {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.625rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
}

.chip {
  color: var(--badge-text);
  background: var(--badge-bg);
}

.chip:hover {
  border-color: var(--border-strong);
}

.chip[aria-pressed='true'] {
  color: var(--on-accent);
  background: var(--accent-solid);
}

.chip-count {
  font-size: 0.75rem;
  opacity: 0.65;
}

.clear {
  color: var(--accent);
  background: transparent;
}

.clear:hover {
  text-decoration: underline;
}

.result {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rows li {
  border-bottom: 1px solid var(--border);
}

.row {
  display: flex;
  gap: 0.875rem;
  padding: 1rem 0.5rem;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.15s;
}

.row:hover {
  text-decoration: none;
  background: var(--bg-subtle);
}

.icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius);
  color: var(--accent);
  background: var(--accent-bg);
}

.icon svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linejoin: round;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  line-height: 2rem;
}

.order {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.title {
  font-family: var(--display);
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-h);
}

.row:hover .title {
  color: var(--accent);
}

.summary {
  font-size: 0.9375rem;
  line-height: 1.6;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.level {
  margin-left: 0.5rem;
  color: var(--text-muted);
}

.date {
  margin-left: 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.empty .clear {
  padding: 0;
  height: auto;
}
</style>
