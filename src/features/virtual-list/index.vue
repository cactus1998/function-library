<script setup lang="ts">
import { computed, markRaw, ref, shallowRef, useTemplateRef, watch } from 'vue'
import FeatureHeader from '../../components/FeatureHeader.vue'
import DemoRow from './components/DemoRow.vue'
import NaiveList from './components/NaiveList.vue'
import VirtualList from './components/VirtualList.vue'
import { useFps } from './composables/useFps'
import { useRenderTiming } from './composables/useRenderTiming'
import { generateItems, type ListItem } from './utils/generateItems'
import { EMPTY_RANGE, type PublicScrollAlign, type VirtualRange } from './utils/layout'
import meta from './meta'

type RenderMode = 'virtual' | 'naive'
type HeightMode = 'fixed' | 'dynamic'

const COUNT_OPTIONS = [0, 1_000, 10_000, 100_000] as const
const NAIVE_LIMIT = 10_000
const FIXED_HEIGHT = 48
const ESTIMATED_HEIGHT = 72
const numberFormat = new Intl.NumberFormat('zh-TW')

// 只產生一次最大筆數，切換筆數時取前段；markRaw 避免 Vue 對 10 萬筆物件做深層代理
const generateStart = performance.now()
const allItems = markRaw(generateItems(COUNT_OPTIONS[COUNT_OPTIONS.length - 1]))
const generateMs = performance.now() - generateStart

const renderMode = ref<RenderMode>('virtual')
const heightMode = ref<HeightMode>('fixed')
const count = ref<number>(10_000)
const selected = ref<number | null>(null)
const notice = ref('')

const items = computed(() => markRaw(allItems.slice(0, count.value)))
const itemKey = (item: ListItem) => item.id

watch(renderMode, (mode) => {
  if (mode === 'naive' && count.value > NAIVE_LIMIT) {
    count.value = NAIVE_LIMIT
    notice.value = `全量渲染最多 ${numberFormat.format(NAIVE_LIMIT)} 筆，已自動調整筆數。`
  } else {
    notice.value = ''
  }
})

watch(count, (value) => {
  if (selected.value !== null && selected.value >= value) selected.value = null
})

// 模式或筆數改變時重建列表：捲回頂端，並清空動態高度的量測快取
const listKey = computed(() => `${renderMode.value}-${heightMode.value}-${count.value}`)

const range = shallowRef<VirtualRange>(EMPTY_RANGE)
watch(listKey, () => {
  range.value = EMPTY_RANGE
})

const { fps } = useFps()
const { duration: renderMs } = useRenderTiming(listKey)

const renderedRows = computed(() =>
  renderMode.value === 'naive' ? count.value : Math.max(0, range.value.renderEnd - range.value.renderStart + 1),
)

const visibleText = computed(() => {
  if (renderMode.value === 'naive') return '全部'
  const { start, end } = range.value
  return end < start ? '無' : `${start} – ${end}`
})

// ---- 跳到指定索引 --------------------------------------------------------

const list = useTemplateRef<{ scrollToIndex: (index: number, align?: PublicScrollAlign) => void }>(
  'list',
)
// input type="number" 搭配 v-model 時，Vue 會自動轉成 number，空字串或無法解析時保留字串
const jumpInput = ref<string | number>(5000)
const jumpAlign = ref<PublicScrollAlign>('start')
const jumpError = ref('')

function jump() {
  const raw = String(jumpInput.value).trim()
  const value = Math.trunc(Number(raw))
  if (raw === '' || !Number.isFinite(value)) {
    jumpError.value = '請輸入數字。'
    return
  }
  const last = count.value - 1
  const target = Math.min(last, Math.max(0, value))
  jumpError.value =
    count.value === 0
      ? '目前沒有資料。'
      : target !== value
        ? `超出範圍，已改為 ${target}（範圍 0 – ${last}）。`
        : ''
  if (count.value === 0) return
  list.value?.scrollToIndex(target, jumpAlign.value)
  if (renderMode.value === 'virtual') selected.value = target
}
</script>

<template>
  <article class="virtual-list-demo">
    <FeatureHeader :meta="meta" />

    <form class="controls" @submit.prevent="jump">
      <fieldset>
        <legend>渲染方式</legend>
        <label><input v-model="renderMode" type="radio" value="virtual" /> 虛擬列表</label>
        <label><input v-model="renderMode" type="radio" value="naive" /> 全量渲染</label>
      </fieldset>

      <fieldset>
        <legend>列高</legend>
        <label><input v-model="heightMode" type="radio" value="fixed" /> 固定 {{ FIXED_HEIGHT }}px</label>
        <label><input v-model="heightMode" type="radio" value="dynamic" /> 動態</label>
      </fieldset>

      <fieldset>
        <legend>資料筆數</legend>
        <label v-for="option in COUNT_OPTIONS" :key="option">
          <input
            v-model="count"
            type="radio"
            :value="option"
            :disabled="renderMode === 'naive' && option > NAIVE_LIMIT"
          />
          {{ numberFormat.format(option) }}
        </label>
      </fieldset>

      <fieldset class="jump">
        <legend>跳到索引</legend>
        <label>
          <span class="visually-hidden">索引</span>
          <input
            v-model="jumpInput"
            type="number"
            inputmode="numeric"
            class="jump-input"
            :aria-invalid="jumpError !== ''"
            aria-describedby="jump-error"
          />
        </label>
        <label>
          <span class="visually-hidden">對齊方式</span>
          <select v-model="jumpAlign">
            <option value="start">頂端</option>
            <option value="center">置中</option>
            <option value="end">底端</option>
          </select>
        </label>
        <button type="submit" :disabled="count === 0">跳轉</button>
      </fieldset>
    </form>

    <p class="messages" aria-live="polite">
      <span v-if="notice">{{ notice }}</span>
      <span v-if="jumpError" id="jump-error" class="error">{{ jumpError }}</span>
    </p>

    <div class="stage">
      <dl class="metrics" aria-label="效能指標">
        <div>
          <dt>FPS</dt>
          <dd :class="{ warn: fps > 0 && fps < 50 }">{{ fps }}</dd>
        </div>
        <div>
          <dt>渲染列數</dt>
          <dd>{{ numberFormat.format(renderedRows) }}</dd>
        </div>
        <div>
          <dt>可視範圍</dt>
          <dd>{{ visibleText }}</dd>
        </div>
        <div>
          <dt>切換耗時</dt>
          <dd>{{ renderMs === null ? '量測中' : `${renderMs.toFixed(0)} ms` }}</dd>
        </div>
        <div>
          <dt>選取</dt>
          <dd>{{ selected ?? '無' }}</dd>
        </div>
        <div>
          <dt>產生資料</dt>
          <dd>{{ generateMs.toFixed(0) }} ms</dd>
        </div>
      </dl>

      <div class="list-area">
        <VirtualList
          v-if="renderMode === 'virtual'"
          :key="listKey"
          ref="list"
          v-model:selected="selected"
          :items="items"
          :item-key="itemKey"
          :item-height="heightMode === 'fixed' ? FIXED_HEIGHT : undefined"
          :estimated-height="ESTIMATED_HEIGHT"
          label="展示資料列表"
          @range-change="range = $event"
        >
          <template #default="{ item, index }">
            <DemoRow :item="item" :index="index" :compact="heightMode === 'fixed'" />
          </template>
        </VirtualList>
        <NaiveList
          v-else
          :key="listKey"
          ref="list"
          :items="items"
          :item-key="itemKey"
          :item-height="heightMode === 'fixed' ? FIXED_HEIGHT : undefined"
          label="展示資料列表（全量渲染）"
        >
          <template #default="{ item, index }">
            <DemoRow :item="item" :index="index" :compact="heightMode === 'fixed'" />
          </template>
        </NaiveList>
        <p class="hint">
          點一下列表後可用 <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Home</kbd> <kbd>End</kbd>
          <kbd>PageUp</kbd> <kbd>PageDown</kbd> 移動選取（虛擬列表模式）。
        </p>
      </div>
    </div>
  </article>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

fieldset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

legend {
  padding-inline: 0.25rem;
  font-size: 0.8125rem;
  color: var(--text-h);
}

label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9375rem;
  white-space: nowrap;
}

label:has(input:disabled) {
  opacity: 0.5;
}

.jump-input {
  width: 7rem;
}

.jump button,
.jump input,
.jump select {
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
}

.jump button {
  cursor: pointer;
  color: var(--accent);
  border-color: var(--accent-border);
}

.jump button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.messages {
  min-height: 1.5rem;
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.error {
  color: var(--danger);
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;
}

.metrics div {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--surface);
}

.metrics dt {
  font-size: 0.75rem;
}

.metrics dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 1.125rem;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.metrics dd.warn {
  color: var(--danger);
}

.list-area {
  --list-height: 60vh;
  min-width: 0;
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
}

kbd {
  font-family: var(--mono);
  font-size: 0.75rem;
  padding: 0 0.3rem;
  border: 1px solid var(--border);
  border-radius: 4px;
}

@media (min-width: 900px) {
  .stage {
    flex-direction: row;
    align-items: flex-start;
  }

  .metrics {
    flex: 0 0 11rem;
    grid-template-columns: 1fr;
  }

  .list-area {
    --list-height: 560px;
    flex: 1;
  }
}
</style>
