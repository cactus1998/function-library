<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { useBoardContext } from '../context'
import type { Card } from '../types'
import { TITLE_MAX_LENGTH } from '../utils/card'
import type { ColumnDefinition } from '../utils/columns'
import KanbanCard from './KanbanCard.vue'

const {
  column,
  cardIds,
  cards,
  placeholder = null,
  hiddenId = null,
  liftedId = null,
  editingId = null,
} = defineProps<{
  column: ColumnDefinition
  cardIds: readonly string[]
  cards: Readonly<Record<string, Card>>
  /** 指標拖曳時的插入位置（索引不含被拖的卡片） */
  placeholder?: { index: number; height: number } | null
  hiddenId?: string | null
  liftedId?: string | null
  editingId?: string | null
}>()

type Row = { type: 'card'; key: string; card: Card } | { type: 'placeholder'; key: string }

const PLACEHOLDER_KEY = '__placeholder__'

/** 依序排出卡片與 placeholder；被拖的卡片保留原位（隱藏），placeholder 依「不含它」的索引插入 */
const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let visibleIndex = 0
  for (const id of cardIds) {
    const card = cards[id]
    if (!card) continue
    if (id !== hiddenId) {
      if (placeholder && visibleIndex === placeholder.index) result.push({ type: 'placeholder', key: PLACEHOLDER_KEY })
      visibleIndex++
    }
    result.push({ type: 'card', key: id, card })
  }
  if (placeholder && placeholder.index >= visibleIndex) result.push({ type: 'placeholder', key: PLACEHOLDER_KEY })
  return result
})

const visibleCount = computed(() => cardIds.filter((id) => id !== hiddenId).length)

// ---- 新增卡片 ---------------------------------------------------------------

const ctx = useBoardContext()
const headingId = useId()
const errorId = useId()
const adding = ref(false)
const draft = ref('')
const error = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const addButton = useTemplateRef<HTMLButtonElement>('addButton')

async function openForm() {
  adding.value = true
  await nextTick()
  input.value?.focus()
}

async function closeForm() {
  adding.value = false
  draft.value = ''
  error.value = ''
  await nextTick()
  addButton.value?.focus()
}

function submit() {
  const message = ctx.addCard(column.id, draft.value)
  if (message) {
    error.value = message
    input.value?.focus()
    return
  }
  // 保持輸入框開啟，方便連續新增
  draft.value = ''
  error.value = ''
  input.value?.focus()
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    void closeForm()
  }
}
</script>

<template>
  <section class="column" :data-column-id="column.id" :aria-labelledby="headingId">
    <header class="column-header">
      <h3 :id="headingId">{{ column.title }}</h3>
      <span class="count" :aria-label="`${visibleCount} 張卡片`">{{ visibleCount }}</span>
    </header>

    <ul class="card-list" data-card-list :aria-labelledby="headingId">
      <template v-for="row in rows" :key="row.key">
        <li
          v-if="row.type === 'placeholder'"
          class="placeholder"
          data-placeholder
          aria-hidden="true"
          :style="{ height: `${placeholder?.height ?? 0}px` }"
        />
        <KanbanCard
          v-else
          :card="row.card"
          :hidden="row.card.id === hiddenId"
          :lifted="row.card.id === liftedId"
          :editing="row.card.id === editingId"
        />
      </template>
      <li v-if="visibleCount === 0 && !placeholder" class="empty">沒有卡片，拖曳或新增一張</li>
    </ul>

    <div class="add">
      <template v-if="adding">
        <input
          ref="input"
          v-model="draft"
          data-add-focus
          type="text"
          :maxlength="TITLE_MAX_LENGTH"
          :aria-label="`新增卡片到「${column.title}」`"
          placeholder="輸入標題後按 Enter"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? errorId : undefined"
          @input="error = ''"
          @keydown="onInputKeydown"
        />
        <p v-if="error" :id="errorId" class="error">{{ error }}</p>
        <div class="add-actions">
          <button type="button" class="primary" @click="submit">新增</button>
          <button type="button" class="ghost" @click="closeForm">取消</button>
        </div>
      </template>
      <button
        v-else
        ref="addButton"
        type="button"
        class="add-button"
        data-add-focus
        :aria-label="`新增卡片到「${column.title}」`"
        @click="openForm"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
        新增卡片
      </button>
    </div>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  scroll-snap-align: start;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem 0.375rem;
}

.column-header h3 {
  margin: 0;
  font-size: 0.9375rem;
}

.count {
  min-width: 1.5rem;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  line-height: 1.25rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--badge-text);
  border-radius: 999px;
  background: var(--badge-bg);
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 3.5rem;
  max-height: min(60vh, 32rem);
  margin: 0;
  padding: 0.25rem 0.5rem 0.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.placeholder {
  flex-shrink: 0;
  border: 2px dashed var(--accent-border);
  border-radius: var(--radius);
  background: var(--accent-bg);
}

.empty {
  padding: 0.75rem 0.5rem;
  font-size: 0.8125rem;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
}

.add {
  padding: 0 0.5rem 0.5rem;
}

.add input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.add input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.add input[aria-invalid='true'] {
  border-color: var(--danger);
}

.error {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--danger);
}

.add-actions {
  display: flex;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.add-actions button,
.add-button {
  min-height: 2.25rem;
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  border-radius: var(--radius);
  cursor: pointer;
}

.primary {
  color: var(--on-accent);
  border: 1px solid var(--accent-solid);
  background: var(--accent-solid);
}

.primary:hover {
  background: var(--accent-solid-hover);
}

.ghost {
  color: var(--text);
  border: 1px solid var(--border-strong);
  background: var(--bg);
}

.add-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  color: var(--text-muted);
  border: 0;
  background: none;
}

.add-button:hover {
  color: var(--text-h);
  background: var(--bg-subtle);
}

.add-button svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

@media (pointer: coarse) {
  .add-actions button,
  .add-button {
    min-height: 2.75rem;
  }
}
</style>
