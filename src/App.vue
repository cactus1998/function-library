<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { findFeature } from './features/registry'

const route = useRoute()

// 仿 HackMD 筆記頁：導覽列中央顯示目前頁面標題與標籤
const current = computed(() => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : route.path.split('/')[2]
  return slug ? findFeature(slug) : undefined
})

// 功能頁以 iframe 嵌入自己時（?embed=1）不顯示導覽列
const embedded = computed(() => route.query.embed === '1')
</script>

<template>
  <header v-if="!embedded" class="navbar">
    <RouterLink to="/" class="brand">
      <span class="logo" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" opacity="0.5" />
          <rect x="2" y="9" width="5" height="5" rx="1" opacity="0.5" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </svg>
      </span>
      <span class="brand-name">Function Library</span>
    </RouterLink>

    <div v-if="current" class="doc-title">
      <span class="doc-name">{{ current.title }}</span>
      <span class="doc-tags">
        <span v-for="tag in current.tags" :key="tag" class="badge">{{ tag }}</span>
      </span>
    </div>
  </header>
  <main class="main" :class="{ embedded }">
    <RouterView />
  </main>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--nav-height);
  padding-inline: var(--gutter);
  font-size: 0.875rem;
  line-height: 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--display);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}

.logo {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--accent-solid);
}

.logo svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: var(--on-accent);
}

.doc-title {
  display: none;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin-inline: auto;
  padding-right: 10rem;
}

.doc-name {
  overflow: hidden;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-h);
}

.doc-tags {
  display: flex;
  gap: 0.25rem;
}

.main {
  flex: 1;
  padding-bottom: 4rem;
}

.main.embedded {
  padding-bottom: 0;
}

@media (min-width: 900px) {
  .doc-title {
    display: flex;
  }
}
</style>
