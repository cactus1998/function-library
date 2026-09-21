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
  <article class="virtual-list-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>

    <form class="controls" @submit.prevent="jump">
      <fieldset>
        <legend>渲染方式</legend>
        <div class="segmented">
          <label><input v-model="renderMode" type="radio" value="virtual" /><span>虛擬列表</span></label>
          <label><input v-model="renderMode" type="radio" value="naive" /><span>全量渲染</span></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>列高</legend>
        <div class="segmented">
          <label>
            <input v-model="heightMode" type="radio" value="fixed" /><span>固定 {{ FIXED_HEIGHT }}px</span>
          </label>
          <label><input v-model="heightMode" type="radio" value="dynamic" /><span>動態</span></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>資料筆數</legend>
        <div class="segmented">
          <label v-for="option in COUNT_OPTIONS" :key="option">
            <input
              v-model="count"
              type="radio"
              :value="option"
              :disabled="renderMode === 'naive' && option > NAIVE_LIMIT"
            />
            <span class="num">{{ numberFormat.format(option) }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset class="jump">
        <legend>跳到索引</legend>
        <div class="input-group">
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
        </div>
      </fieldset>
    </form>

    <p class="messages" aria-live="polite">
      <span v-if="notice" class="callout">{{ notice }}</span>
      <span v-if="jumpError" id="jump-error" class="callout danger">{{ jumpError }}</span>
    </p>

    <section class="panel" aria-label="列表與效能指標">
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
      </div>

      <p class="hint">
        <template v-if="renderMode === 'virtual'">
          點選列表後可用 <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Home</kbd> <kbd>End</kbd>
          <kbd>PgUp</kbd> <kbd>PgDn</kbd> 移動選取
        </template>
        <template v-else>全量渲染僅作對照組，不支援鍵盤選取</template>
      </p>
    </section>
  </article>
</template>

<style scoped>
.virtual-list-demo {
  padding-top: 1rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
}

fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.375rem;
  padding: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
}

/* 仿 HackMD 編輯／並排／檢視切換的按鈕群組；保留原生 radio 維持鍵盤與輔助技術行為 */
.segmented {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.segmented label {
  position: relative;
  display: inline-flex;
}

.segmented label + label {
  border-left: 1px solid var(--border-strong);
}

.segmented input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.segmented span {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
  white-space: nowrap;
  color: var(--text);
  transition:
    background-color 0.15s,
    color 0.15s;
}

.segmented .num {
  font-variant-numeric: tabular-nums;
}

.segmented label:hover span {
  background: var(--bg-subtle);
}

.segmented input:checked + span {
  color: var(--accent);
  background: var(--accent-bg);
}

.segmented input:focus-visible + span {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.segmented input:disabled,
.segmented input:disabled + span {
  cursor: not-allowed;
  opacity: 0.4;
}

.input-group {
  display: inline-flex;
  gap: 0.375rem;
}

.input-group input,
.input-group select {
  height: 2rem;
  padding: 0 0.625rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.jump-input {
  width: 6.5rem;
  font-variant-numeric: tabular-nums;
}

.jump-input[aria-invalid='true'] {
  border-color: var(--danger);
}

.input-group button {
  height: 2rem;
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  cursor: pointer;
}

.input-group button:hover {
  background: var(--accent-solid-hover);
}

.input-group button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.messages {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 1rem;
  margin: 1rem 0;
}

.messages .callout {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.panel {
  --list-height: 60vh;
  --list-border: 0;
  --list-radius: 0;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

/* 指標列比照 Markdown 表格：表頭粗體、欄位以線分隔 */
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-bottom: 1px solid var(--border-strong);
}

.metrics div {
  padding: 0.375rem 0.8125rem;
  border-right: 1px solid var(--border-strong);
  border-bottom: 1px solid var(--border-strong);
}

.metrics div:nth-child(3n) {
  border-right: 0;
}

.metrics div:nth-last-child(-n + 3) {
  border-bottom: 0;
}

.metrics dt {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-h);
}

.metrics dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.875rem;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.metrics dd.warn {
  color: var(--danger);
}

.list-area {
  min-width: 0;
}

.hint {
  padding: 0.5rem 0.8125rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border-strong);
  background: var(--bg-subtle);
}

.hint kbd {
  font-size: 0.75rem;
}

@media (min-width: 900px) {
  .panel {
    --list-height: 560px;
  }

  .metrics {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .metrics div,
  .metrics div:nth-child(3n) {
    border-right: 1px solid var(--border-strong);
    border-bottom: 0;
  }

  .metrics div:last-child {
    border-right: 0;
  }
}
</style>
