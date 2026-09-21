<script setup lang="ts" generic="T">
import { computed, useId, useTemplateRef, watch } from 'vue'
import { useVirtualList } from '../composables/useVirtualList'
import { nextIndex } from '../utils/keyboard'
import type { PublicScrollAlign, VirtualRange } from '../utils/layout'

const {
  items,
  itemKey,
  label,
  itemHeight,
  estimatedHeight = 48,
  overscan = 5,
} = defineProps<{
  items: readonly T[]
  itemKey: (item: T, index: number) => string | number
  /** 無障礙名稱 */
  label: string
  /** 有值為固定高度模式；不傳則為動態高度模式 */
  itemHeight?: number
  estimatedHeight?: number
  overscan?: number
}>()

const selected = defineModel<number | null>('selected', { default: null })

const emit = defineEmits<{
  rangeChange: [range: VirtualRange]
}>()

defineSlots<{
  default(props: { item: T; index: number; selected: boolean }): unknown
}>()

const viewport = useTemplateRef<HTMLElement>('viewport')

const { range, totalHeight, windowOffset, scrollToIndex } = useVirtualList(viewport, {
  count: () => items.length,
  itemHeight: () => itemHeight,
  estimatedHeight: () => estimatedHeight,
  overscan: () => overscan,
})

const rows = computed(() => {
  const { renderStart, renderEnd } = range.value
  const result: { item: T; index: number; key: string | number }[] = []
  for (let index = renderStart; index <= renderEnd; index++) {
    const item = items[index]
    result.push({ item, index, key: itemKey(item, index) })
  }
  return result
})

watch(range, (value) => emit('rangeChange', value), { immediate: true })

const idPrefix = useId()
const optionId = (index: number) => `${idPrefix}-option-${index}`

// aria-activedescendant 只能指向 DOM 中存在的元素，選取項目被捲出渲染範圍時就不設定
const activeDescendant = computed(() => {
  const index = selected.value
  const { renderStart, renderEnd } = range.value
  return index !== null && index >= renderStart && index <= renderEnd
    ? optionId(index)
    : undefined
})

const rowStyle = computed(() =>
  itemHeight === undefined ? undefined : { height: `${itemHeight}px` },
)

function onKeydown(event: KeyboardEvent) {
  const { start, end } = range.value
  const next = nextIndex(event.key, selected.value, items.length, end - start, start)
  if (next === null) return
  event.preventDefault()
  selected.value = next
  scrollToIndex(next, 'auto')
}

defineExpose({
  scrollToIndex: (index: number, align: PublicScrollAlign = 'start') =>
    scrollToIndex(index, align),
})
</script>

<template>
  <div
    ref="viewport"
    class="viewport"
    role="listbox"
    tabindex="0"
    :aria-label="label"
    :aria-activedescendant="activeDescendant"
    @keydown="onKeydown"
  >
    <p v-if="items.length === 0" class="empty">沒有資料</p>
    <div v-else class="spacer" role="presentation" :style="{ height: `${totalHeight}px` }">
      <div
        class="window"
        role="presentation"
        :style="{ transform: `translateY(${windowOffset}px)` }"
      >
        <div
          v-for="row in rows"
          :id="optionId(row.index)"
          :key="row.key"
          class="row"
          :class="{ 'is-selected': row.index === selected }"
          role="option"
          :aria-selected="row.index === selected"
          :aria-posinset="row.index + 1"
          :aria-setsize="items.length"
          :data-virtual-index="row.index"
          :style="rowStyle"
          @click="selected = row.index"
        >
          <slot :item="row.item" :index="row.index" :selected="row.index === selected" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  height: var(--list-height, 480px);
  overflow-y: auto;
  /* 由程式自行補償 scrollTop，關閉瀏覽器的 scroll anchoring 避免兩者互相干擾 */
  overflow-anchor: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

.spacer {
  position: relative;
}

.window {
  will-change: transform;
}

.row {
  overflow: hidden;
  cursor: pointer;
}

.row.is-selected {
  background: var(--accent-bg);
  box-shadow: inset 3px 0 0 var(--accent);
}

.empty {
  padding: 2rem 1rem;
  text-align: center;
}
</style>
