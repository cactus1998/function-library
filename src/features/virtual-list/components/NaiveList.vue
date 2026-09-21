<script setup lang="ts" generic="T">
import { useTemplateRef } from 'vue'
import type { PublicScrollAlign } from '../utils/layout'

/** 對照組：直接渲染全部資料，用來和虛擬列表比較 DOM 數量與 FPS */
const { items, itemKey, label, itemHeight } = defineProps<{
  items: readonly T[]
  itemKey: (item: T, index: number) => string | number
  label: string
  itemHeight?: number
}>()

defineSlots<{
  default(props: { item: T; index: number; selected: boolean }): unknown
}>()

const viewport = useTemplateRef<HTMLElement>('viewport')

function scrollToIndex(index: number, align: PublicScrollAlign = 'start') {
  const el = viewport.value
  if (!el || items.length === 0 || !Number.isFinite(index)) return
  const i = Math.min(items.length - 1, Math.max(0, Math.trunc(index)))
  const row = el.children[i]
  if (!(row instanceof HTMLElement)) return

  const { offsetTop: top, offsetHeight: size } = row
  const view = el.clientHeight
  const target = align === 'start' ? top : align === 'center' ? top + size / 2 - view / 2 : top + size - view
  el.scrollTop = target
}

defineExpose({ scrollToIndex })
</script>

<template>
  <ul ref="viewport" class="viewport" :aria-label="label">
    <li
      v-for="(item, index) in items"
      :key="itemKey(item, index)"
      class="row"
      :style="itemHeight === undefined ? undefined : { height: `${itemHeight}px` }"
    >
      <slot :item="item" :index="index" :selected="false" />
    </li>
    <li v-if="items.length === 0" class="empty">沒有資料</li>
  </ul>
</template>

<style scoped>
.viewport {
  position: relative;
  height: var(--list-height, 480px);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

.row {
  overflow: hidden;
}

.empty {
  padding: 2rem 1rem;
  text-align: center;
}
</style>
