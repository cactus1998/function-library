<script setup lang="ts">
import { nextTick, provide, ref, useId, useTemplateRef } from 'vue'
import { useBoardDrag } from '../composables/useBoardDrag'
import { useHistoryShortcuts } from '../composables/useHistoryShortcuts'
import { useKeyboardDrag } from '../composables/useKeyboardDrag'
import { usePersistedBoard } from '../composables/usePersistedBoard'
import { boardContextKey, type BoardContext } from '../context'
import { HISTORY_LIMIT, useBoardStore } from '../stores/board'
import type { CardPosition, ColumnId } from '../types'
import { findPosition } from '../utils/board'
import { validateTitle } from '../utils/card'
import { COLUMNS, columnTitle } from '../utils/columns'
import { detectMac } from '../utils/platform'
import { createSeedBoard, createStressBoard } from '../utils/seed'
import DragGhost from './DragGhost.vue'
import KanbanColumn from './KanbanColumn.vue'

const STRESS_PER_COLUMN = 100

const store = useBoardStore()
usePersistedBoard(store)

const isMac = detectMac()
const undoKeys = isMac ? ['⌘', 'Z'] : ['Ctrl', 'Z']
const redoKeys = isMac ? ['⌘', 'Shift', 'Z'] : ['Ctrl', 'Shift', 'Z']
const instructionsId = useId()
const scroller = useTemplateRef<HTMLElement>('scroller')

// ---- 螢幕報讀器宣告 ----------------------------------------------------------

const announcement = ref('')

function announce(message: string) {
  // 內容相同時 live region 不會重新宣告，補一個不換行空白讓文字不同
  announcement.value = announcement.value === message ? `${message} ` : message
}

// ---- 焦點管理 ----------------------------------------------------------------

function cardFocusTarget(id: string): HTMLElement | null {
  const cards = scroller.value?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []
  for (const card of cards) {
    if (card.dataset.cardId === id) return card.querySelector<HTMLElement>('[data-card-focus]')
  }
  return null
}

async function focusCard(id: string) {
  await nextTick()
  cardFocusTarget(id)?.focus()
}

/** 卡片消失後：同欄同索引的下一張，沒有則該欄的新增按鈕 */
async function focusNear(position: CardPosition) {
  await nextTick()
  const nextId = store.board.columns[position.column][position.index]
  const target =
    (nextId && cardFocusTarget(nextId)) ||
    scroller.value?.querySelector<HTMLElement>(`[data-column-id="${position.column}"] [data-add-focus]`)
  target?.focus()
}

function focusedCardId(): string | null {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !scroller.value?.contains(active)) return null
  return active.closest<HTMLElement>('[data-card-id]')?.dataset.cardId ?? null
}

// ---- 拖放 --------------------------------------------------------------------

const editingId = ref<string | null>(null)

const keyboard = useKeyboardDrag(store, { announce, focusCard: (id) => void focusCard(id) })

const pointerDrag = useBoardDrag(scroller, store, {
  canStart: () => editingId.value === null,
  announce,
})

function onPointerDownCapture() {
  // 指標拖曳優先：放棄鍵盤拿起的狀態
  if (keyboard.lifted.value) keyboard.cancel(false)
}

function placeholderFor(column: ColumnId) {
  const drag = pointerDrag.drag.value
  if (!drag) return null
  const target = drag.target ?? drag.origin
  return target.column === column ? { index: target.index, height: drag.rect.height } : null
}

// 拿起的卡片失焦（Tab 離開、點別處）視同取消；延後檢查，讓移動後的重新聚焦先完成
function onFocusOut() {
  if (!keyboard.lifted.value) return
  setTimeout(() => {
    const lifted = keyboard.lifted.value
    if (!lifted) return
    if (document.activeElement !== cardFocusTarget(lifted.id)) keyboard.cancel(false)
  }, 0)
}

// ---- 歷史 --------------------------------------------------------------------

async function runHistory(kind: 'undo' | 'redo') {
  if (pointerDrag.drag.value || keyboard.lifted.value) return
  const focused = focusedCardId()
  const position = focused ? findPosition(store.board.columns, focused) : null
  const command = kind === 'undo' ? store.undo() : store.redo()
  if (!command) return
  announce(`${kind === 'undo' ? '已復原' : '已重做'}：${command.label}`)
  if (!focused || !position) return
  if (store.board.cards[focused]) await focusCard(focused)
  else await focusNear(position)
}

useHistoryShortcuts({
  isMac,
  onUndo: () => void runHistory('undo'),
  onRedo: () => void runHistory('redo'),
})

function resetTo(kind: 'seed' | 'stress') {
  pointerDrag.cancel()
  keyboard.cancel(false)
  editingId.value = null
  if (kind === 'seed') {
    store.replace(createSeedBoard())
    announce('已重設看板並清空歷史')
  } else {
    store.replace(createStressBoard(STRESS_PER_COLUMN))
    announce(`已載入 ${STRESS_PER_COLUMN * COLUMNS.length} 張卡片並清空歷史`)
  }
}

// ---- 提供給欄位與卡片的操作 ---------------------------------------------------

const context: BoardContext = {
  instructionsId,
  startEdit(id) {
    if (pointerDrag.drag.value || keyboard.lifted.value) return
    editingId.value = id
  },
  saveEdit(id, raw, restoreFocus) {
    if (editingId.value !== id) return null
    const result = validateTitle(raw)
    if (!result.ok) return result.error
    editingId.value = null
    if (store.editCard(id, result.title)) announce(`已將標題改為「${result.title}」`)
    if (restoreFocus) void focusCard(id)
    return null
  },
  cancelEdit(id, restoreFocus) {
    if (editingId.value !== id) return
    editingId.value = null
    if (restoreFocus) void focusCard(id)
  },
  remove(id) {
    const title = store.board.cards[id]?.title
    const position = findPosition(store.board.columns, id)
    if (!title || !position || !store.removeCard(id)) return
    if (editingId.value === id) editingId.value = null
    announce(`已刪除「${title}」，按 ${undoKeys.join('+')} 可復原`)
    void focusNear(position)
  },
  addCard(column, raw) {
    const result = validateTitle(raw)
    if (!result.ok) return result.error
    store.addCard(column, result.title)
    announce(`已新增「${result.title}」到「${columnTitle(column)}」`)
    return null
  },
  lift(id) {
    if (pointerDrag.drag.value || editingId.value) return
    keyboard.lift(id)
  },
  moveLifted: keyboard.move,
  dropLifted: keyboard.drop,
  cancelLifted: () => keyboard.cancel(),
}

provide(boardContextKey, context)
</script>

<template>
  <div class="kanban" @focusout="onFocusOut">
    <div class="toolbar">
      <div class="history" role="group" aria-label="歷史紀錄">
        <button
          type="button"
          :disabled="!store.canUndo"
          :title="store.nextUndo ? `復原：${store.nextUndo.label}` : '沒有可復原的操作'"
          :aria-keyshortcuts="isMac ? 'Meta+Z' : 'Control+Z'"
          @click="runHistory('undo')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4L3 7l3 3M3 7h6.5a3.5 3.5 0 010 7H7" /></svg>
          復原
          <span class="keys" aria-hidden="true"><kbd v-for="key in undoKeys" :key="key">{{ key }}</kbd></span>
        </button>
        <button
          type="button"
          :disabled="!store.canRedo"
          :title="store.nextRedo ? `重做：${store.nextRedo.label}` : '沒有可重做的操作'"
          :aria-keyshortcuts="isMac ? 'Meta+Shift+Z' : 'Control+Shift+Z'"
          @click="runHistory('redo')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 4l3 3-3 3M13 7H6.5a3.5 3.5 0 000 7H9" /></svg>
          重做
          <span class="keys" aria-hidden="true"><kbd v-for="key in redoKeys" :key="key">{{ key }}</kbd></span>
        </button>
        <span class="history-count">歷史 {{ store.past.length }} / {{ HISTORY_LIMIT }}</span>
      </div>

      <div class="actions">
        <button type="button" @click="resetTo('stress')">
          壓力測試：{{ STRESS_PER_COLUMN * COLUMNS.length }} 張
        </button>
        <button type="button" @click="resetTo('seed')">重設看板</button>
      </div>
    </div>

    <p :id="instructionsId" class="visually-hidden">
      按 Space 拿起卡片，方向鍵移動，Space 放下，Esc 取消；按 Enter 編輯標題。
    </p>

    <div
      ref="scroller"
      class="board"
      :class="{ dragging: pointerDrag.drag.value }"
      role="region"
      aria-label="看板"
      @pointerdown.capture="onPointerDownCapture"
      @dragstart.prevent
    >
      <KanbanColumn
        v-for="column in COLUMNS"
        :key="column.id"
        :column="column"
        :card-ids="keyboard.displayColumns.value[column.id]"
        :cards="store.board.cards"
        :placeholder="placeholderFor(column.id)"
        :hidden-id="pointerDrag.drag.value?.id ?? null"
        :lifted-id="keyboard.lifted.value?.id ?? null"
        :editing-id="editingId"
      />
    </div>

    <p class="visually-hidden" aria-live="assertive" aria-atomic="true">{{ announcement }}</p>

    <DragGhost
      v-if="pointerDrag.drag.value"
      :title="pointerDrag.drag.value.title"
      :width="pointerDrag.drag.value.rect.width"
      :height="pointerDrag.drag.value.rect.height"
      :pointer="pointerDrag.pointer.value"
      :grab="pointerDrag.drag.value.grab"
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.history,
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  color: var(--text-h);
  border-color: var(--accent-border);
}

.toolbar button:disabled {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.6;
}

.toolbar button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.toolbar svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.keys {
  display: inline-flex;
  gap: 0.125rem;
  margin-left: 0.25rem;
}

.keys kbd {
  font-size: 0.6875rem;
}

.history-count {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* 窄螢幕：欄位水平排列並 snap；拖曳中關掉 snap，否則自動捲動會被拉回 */
.board {
  display: grid;
  grid-auto-columns: 85%;
  grid-auto-flow: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
}

.board.dragging {
  scroll-snap-type: none;
}

@media (min-width: 768px) {
  .board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-flow: row;
    overflow-x: visible;
    overflow-y: visible;
  }
}

@media (max-width: 480px) {
  .keys {
    display: none;
  }
}
</style>
