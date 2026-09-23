<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SIZES, pageRange, type PageSize } from '../composables/usePagination'

const props = defineProps<{
  page: number
  totalPages: number
  pageSize: PageSize
  total: number
  startIndex: number
  endIndex: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [size: PageSize]
}>()

const items = computed(() => pageRange(props.page, props.totalPages))
const hasPrev = computed(() => props.page > 1)
const hasNext = computed(() => props.page < props.totalPages)

function go(page: number) {
  if (page < 1 || page > props.totalPages || page === props.page) return
  emit('update:page', page)
}

function onSizeChange(event: Event) {
  emit('update:pageSize', Number((event.target as HTMLSelectElement).value) as PageSize)
}
</script>

<template>
  <nav class="pagination" aria-label="分頁">
    <label class="size">
      每頁
      <select :value="pageSize" @change="onSizeChange">
        <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
      </select>
      筆
    </label>

    <p class="range" aria-live="polite">
      <template v-if="total > 0">第 {{ startIndex + 1 }}–{{ endIndex }} 筆，共 {{ total }} 筆</template>
      <template v-else>共 0 筆</template>
    </p>

    <ul v-if="totalPages > 1" class="pages">
      <li>
        <button type="button" class="step" :disabled="!hasPrev" @click="go(page - 1)">
          <span aria-hidden="true">‹</span><span class="visually-hidden">上一頁</span>
        </button>
      </li>
      <li v-for="(item, i) in items" :key="item === 'ellipsis' ? `e${i}` : item">
        <span v-if="item === 'ellipsis'" class="ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="num"
          :aria-current="item === page ? 'page' : undefined"
          :aria-label="`第 ${item} 頁`"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </li>
      <li>
        <button type="button" class="step" :disabled="!hasNext" @click="go(page + 1)">
          <span aria-hidden="true">›</span><span class="visually-hidden">下一頁</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  margin-top: 1.25rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.size {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.size select {
  height: 1.75rem;
  padding: 0 0.375rem;
  font: inherit;
  color: var(--text-h);
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.range {
  margin: 0;
  margin-right: auto;
}

.pages {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.num,
.step {
  min-width: 1.875rem;
  height: 1.875rem;
  padding: 0 0.375rem;
  font-family: var(--mono);
  font-size: 0.8125rem;
  color: var(--text-h);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.num:hover,
.step:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--bg-subtle);
}

.num[aria-current='page'] {
  color: var(--on-accent);
  background: var(--accent-solid);
  border-color: var(--accent-solid);
  cursor: default;
}

.step:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ellipsis {
  display: inline-block;
  min-width: 1.25rem;
  text-align: center;
}
</style>
