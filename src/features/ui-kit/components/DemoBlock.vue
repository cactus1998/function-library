<script setup lang="ts">
import { useId } from 'vue'
import { useClipboard } from '../composables/useClipboard'

const { title, snippet } = defineProps<{ title: string; snippet: string }>()

defineSlots<{ default(): unknown; description(): unknown }>()

const titleId = useId()
const { state, copy } = useClipboard()
</script>

<template>
  <section class="block" :aria-labelledby="titleId">
    <h3 :id="titleId">{{ title }}</h3>
    <div class="desc"><slot name="description" /></div>
    <div class="stage"><slot /></div>

    <details class="snippet">
      <summary>HTML 結構（交給後端套版）</summary>
      <button type="button" class="copy" @click="copy(snippet)">
        {{ state === 'copied' ? '已複製' : state === 'failed' ? '複製失敗，請手動選取' : '複製 HTML' }}
      </button>
      <pre><code>{{ snippet }}</code></pre>
    </details>
    <p class="visually-hidden" aria-live="polite">{{ state === 'copied' ? `已複製${title}的 HTML` : '' }}</p>
  </section>
</template>

<style scoped>
.block {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.block h3 {
  margin-bottom: 0.25rem;
}

.desc {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.snippet {
  position: relative;
  margin-top: 0.75rem;
  font-size: 0.8125rem;
}

.snippet summary {
  padding-right: 8rem;
  cursor: pointer;
  color: var(--text-muted);
}

.copy {
  position: absolute;
  top: -0.125rem;
  right: 0;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

pre {
  margin: 0.5rem 0 0;
  padding: 0.75rem;
  max-height: 320px;
  overflow: auto;
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
