<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'

const {
  title,
  code,
  nativeSupported = null,
  canForceFallback = false,
} = defineProps<{
  title: string
  code: string
  /** null：此案例沒有「原生／fallback」兩條路徑 */
  nativeSupported?: boolean | null
  canForceFallback?: boolean
}>()

defineSlots<{
  problem(): unknown
  broken(): unknown
  fixed(props: { fallback: boolean }): unknown
}>()

const forceFallback = shallowRef(false)
const titleId = useId()

/** 實際走的路徑：瀏覽器不支援，或手動強制 */
const fallback = computed(() => nativeSupported === false || forceFallback.value)
const pathLabel = computed(() => {
  if (nativeSupported === null) return ''
  if (nativeSupported === false) return '此瀏覽器不支援，使用 fallback'
  return forceFallback.value ? '強制使用 fallback' : '使用原生寫法'
})
</script>

<template>
  <section class="case" :aria-labelledby="titleId">
    <h3 :id="titleId">{{ title }}</h3>
    <div class="problem"><slot name="problem" /></div>

    <div class="compare">
      <figure class="pane broken">
        <figcaption>沒處理：問題瀏覽器看到的樣子</figcaption>
        <div class="pane-body"><slot name="broken" /></div>
      </figure>
      <figure class="pane fixed">
        <figcaption>處理後：這個瀏覽器實際渲染</figcaption>
        <div class="pane-body"><slot name="fixed" :fallback="fallback" /></div>
      </figure>
    </div>

    <div v-if="pathLabel" class="path">
      <span class="badge">{{ pathLabel }}</span>
      <label v-if="canForceFallback && nativeSupported">
        <input v-model="forceFallback" type="checkbox" />
        模擬不支援，強制走 fallback
      </label>
    </div>

    <details class="code">
      <summary>程式碼</summary>
      <pre><code>{{ code }}</code></pre>
    </details>
  </section>
</template>

<style scoped>
.case {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.case h3 {
  margin-bottom: 0.25rem;
}

.problem {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.compare {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

@media (min-width: 720px) {
  .compare {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.pane {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.pane figcaption {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.broken figcaption {
  color: var(--danger);
  background: var(--danger-bg);
}

.fixed figcaption {
  color: var(--info);
  background: var(--info-bg);
}

.pane-body {
  padding: 0.75rem;
}

.path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  margin-top: 0.625rem;
  font-size: 0.8125rem;
}

.code {
  margin-top: 0.625rem;
  font-size: 0.8125rem;
}

.code summary {
  cursor: pointer;
  color: var(--text-muted);
}

pre {
  margin: 0.5rem 0 0;
  padding: 0.75rem;
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.6;
  border-radius: var(--radius);
  background: var(--code-bg);
}

pre code {
  padding: 0;
  background: none;
}
</style>
