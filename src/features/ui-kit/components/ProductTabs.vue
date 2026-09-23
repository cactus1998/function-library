<script setup lang="ts">
import { nextTick, shallowRef, useId, useTemplateRef } from 'vue'

interface Tab {
  id: string
  label: string
  body: string
}

const tabs: Tab[] = [
  { id: 'flavor', label: '風味', body: '柑橘、茉莉花香，尾韻帶紅茶感。適合手沖與冷萃。' },
  { id: 'origin', label: '產地', body: '衣索比亞耶加雪菲，海拔 1,900–2,200 公尺，水洗處理。' },
  { id: 'brew', label: '沖煮建議', body: '粉水比 1:15，水溫 92°C，總時間 2 分 30 秒。' },
  { id: 'shipping', label: '運送', body: '滿 799 元免運，接單後 48 小時內烘焙出貨。' },
]

const uid = useId()
const selected = shallowRef(0)
const tabButtons = useTemplateRef<HTMLButtonElement[]>('tabButtons')

async function select(index: number) {
  selected.value = (index + tabs.length) % tabs.length
  await nextTick()
  // v-for 的 ref 陣列不保證與資料順序一致，用 id 找
  const id = `${uid}-tab-${tabs[selected.value]!.id}`
  tabButtons.value?.find((el) => el.id === id)?.focus()
}

/** WAI-ARIA Tabs：方向鍵切換並自動啟用，Home／End 到頭尾 */
function onKeydown(event: KeyboardEvent) {
  const actions: Record<string, () => number> = {
    ArrowRight: () => selected.value + 1,
    ArrowLeft: () => selected.value - 1,
    Home: () => 0,
    End: () => tabs.length - 1,
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  void select(action())
}
</script>

<template>
  <div class="tabs">
    <div class="tablist" role="tablist" aria-label="商品資訊" @keydown="onKeydown">
      <button
        v-for="(tab, i) in tabs"
        :id="`${uid}-tab-${tab.id}`"
        ref="tabButtons"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="i === selected"
        :aria-controls="`${uid}-panel-${tab.id}`"
        :tabindex="i === selected ? 0 : -1"
        @click="select(i)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      v-for="(tab, i) in tabs"
      v-show="i === selected"
      :id="`${uid}-panel-${tab.id}`"
      :key="tab.id"
      class="panel"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-${tab.id}`"
      tabindex="0"
    >
      <p>{{ tab.body }}</p>
    </div>
  </div>
</template>

<style scoped>
/* 窄螢幕時 tab 列可橫向捲動，不換行、不擠壓文字 */
.tablist {
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-strong);
  scrollbar-width: thin;
}

.tab {
  flex: none;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  white-space: nowrap;
  color: var(--text-muted);
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  cursor: pointer;
}

.tab:hover {
  color: var(--text-h);
}

.tab[aria-selected='true'] {
  font-weight: 600;
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.panel {
  padding: 1rem 0.25rem;
}
</style>
