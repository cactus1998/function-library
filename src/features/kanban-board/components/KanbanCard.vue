<script setup lang="ts">
import { nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { useBoardContext } from '../context'
import type { Card, Direction } from '../types'
import { TITLE_MAX_LENGTH } from '../utils/card'

const {
  card,
  hidden = false,
  lifted = false,
  editing = false,
} = defineProps<{
  card: Card
  /** 指標拖曳中的來源卡片：保留在 DOM（觸控事件仍以它為 target）但不顯示 */
  hidden?: boolean
  lifted?: boolean
  editing?: boolean
}>()

const ctx = useBoardContext()
const input = useTemplateRef<HTMLInputElement>('input')
const errorId = useId()
const draft = ref('')
const error = ref('')

watch(
  () => editing,
  async (on) => {
    if (!on) return
    draft.value = card.title
    error.value = ''
    await nextTick()
    input.value?.focus()
    input.value?.select()
  },
  { immediate: true },
)

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

function onCardKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (lifted) {
    const direction = ARROWS[event.key]
    if (direction) ctx.moveLifted(direction)
    else if (event.key === ' ' || event.key === 'Enter') {
      // 長按 Space 的自動重複不應拿起後立刻放下
      if (!event.repeat) ctx.dropLifted()
    } else if (event.key === 'Escape') ctx.cancelLifted()
    else return
    event.preventDefault()
    return
  }
  // Space 拿起；Enter 保留按鈕的原生 click（進入編輯）
  if (event.key === ' ' && !event.repeat) {
    event.preventDefault()
    ctx.lift(card.id)
  }
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Enter') {
    event.preventDefault()
    error.value = ctx.saveEdit(card.id, draft.value, true) ?? ''
  } else if (event.key === 'Escape') {
    event.preventDefault()
    ctx.cancelEdit(card.id, true)
  }
}

function onInputBlur() {
  if (!editing) return
  // 點到別處時：合法就儲存，不合法就放棄修改，不把使用者困在輸入框
  if (ctx.saveEdit(card.id, draft.value, false)) ctx.cancelEdit(card.id, false)
}
</script>

<template>
  <li
    class="card"
    :class="{ lifted, editing }"
    :data-card-id="card.id"
    :data-drag-hidden="hidden ? '' : undefined"
  >
    <div v-if="editing" class="edit">
      <input
        ref="input"
        v-model="draft"
        data-no-drag
        type="text"
        :maxlength="TITLE_MAX_LENGTH"
        aria-label="卡片標題"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        @input="error = ''"
        @keydown="onInputKeydown"
        @blur="onInputBlur"
      />
      <p v-if="error" :id="errorId" class="error">{{ error }}</p>
      <p class="edit-hint">Enter 儲存 · Esc 取消</p>
    </div>
    <template v-else>
      <button
        type="button"
        class="card-body"
        data-card-focus
        aria-roledescription="可拖曳的卡片"
        :aria-describedby="ctx.instructionsId"
        @click="ctx.startEdit(card.id)"
        @keydown="onCardKeydown"
        @keyup.space.prevent
      >
        {{ card.title }}
      </button>
      <button
        type="button"
        class="card-remove"
        data-no-drag
        :aria-label="`刪除「${card.title}」`"
        @click="ctx.remove(card.id)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </template>
  </li>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  align-items: flex-start;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.card[data-drag-hidden] {
  display: none;
}

.card.lifted {
  border-color: var(--accent);
  box-shadow:
    0 0 0 2px var(--accent-border),
    0 6px 16px rgba(0, 0, 0, 0.12);
}

.card-body {
  flex: 1;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: left;
  overflow-wrap: anywhere;
  color: var(--text-h);
  border: 0;
  border-radius: var(--radius);
  background: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.card-body:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.card-remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0.375rem 0.25rem 0 0;
  padding: 0;
  color: var(--text-muted);
  border: 0;
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
  opacity: 0;
}

.card:hover .card-remove,
.card-remove:focus-visible,
.card.lifted .card-remove {
  opacity: 1;
}

.card-remove:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

.card-remove:focus-visible {
  outline: 2px solid var(--accent);
}

.card-remove svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
}

/* 觸控裝置沒有 hover：刪除鈕常駐並放大到 44px */
@media (hover: none), (pointer: coarse) {
  .card-remove {
    width: 2.75rem;
    height: 2.75rem;
    margin: 0;
    opacity: 1;
  }
}

.edit {
  flex: 1;
  padding: 0.375rem;
}

.edit input {
  width: 100%;
  padding: 0.25rem 0.375rem;
  font-size: 0.875rem;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  background: var(--bg);
}

.edit input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.edit input[aria-invalid='true'] {
  border-color: var(--danger);
}

.error {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--danger);
}

.edit-hint {
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--text-muted);
}
</style>
