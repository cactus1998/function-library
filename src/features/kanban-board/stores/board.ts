import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { BoardCommand, BoardState, Card, CardPosition, ColumnId } from '../types'
import { columnSizeWithout, findPosition } from '../utils/board'
import { createId } from '../utils/card'
import { addCardCommand, editCardCommand, moveCardCommand, removeCardCommand } from '../utils/commands'
import { createSeedBoard } from '../utils/seed'

export const HISTORY_LIMIT = 50

/**
 * 看板狀態與 Undo / Redo 歷史。所有變更都包成 BoardCommand 經過 execute，
 * 呼叫端傳入的標題應已通過 validateTitle。
 */
export const useBoardStore = defineStore('kanban-board', () => {
  const board = ref<BoardState>(createSeedBoard())
  const past = shallowRef<readonly BoardCommand[]>([])
  const future = shallowRef<readonly BoardCommand[]>([])
  /** 是否已從 localStorage 還原過，避免重新進入頁面時覆蓋掉本次 session 的歷史 */
  const hydrated = ref(false)

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const nextUndo = computed(() => past.value.at(-1) ?? null)
  const nextRedo = computed(() => future.value.at(-1) ?? null)

  function execute(command: BoardCommand) {
    command.do(board.value)
    past.value = [...past.value, command].slice(-HISTORY_LIMIT)
    future.value = []
  }

  function undo(): BoardCommand | null {
    const command = past.value.at(-1)
    if (!command) return null
    command.undo(board.value)
    past.value = past.value.slice(0, -1)
    future.value = [...future.value, command]
    return command
  }

  function redo(): BoardCommand | null {
    const command = future.value.at(-1)
    if (!command) return null
    command.do(board.value)
    future.value = future.value.slice(0, -1)
    past.value = [...past.value, command].slice(-HISTORY_LIMIT)
    return command
  }

  /** 整個換掉看板（還原、重設、壓力測試），同時清空歷史 */
  function replace(next: BoardState) {
    board.value = next
    past.value = []
    future.value = []
  }

  function addCard(column: ColumnId, title: string): Card {
    const card: Card = { id: createId(), title, createdAt: Date.now() }
    execute(addCardCommand(card, column))
    return card
  }

  function editCard(id: string, title: string): boolean {
    const card = board.value.cards[id]
    if (!card || card.title === title) return false
    execute(editCardCommand(id, card.title, title))
    return true
  }

  function removeCard(id: string): boolean {
    const card = board.value.cards[id]
    const from = findPosition(board.value.columns, id)
    if (!card || !from) return false
    execute(removeCardCommand({ ...card }, from))
    return true
  }

  /** 放回原位時不產生 command，回傳 false */
  function moveCard(id: string, to: CardPosition): boolean {
    const card = board.value.cards[id]
    const from = findPosition(board.value.columns, id)
    if (!card || !from) return false
    const size = columnSizeWithout(board.value.columns, to, id)
    const target: CardPosition = { column: to.column, index: Math.min(Math.max(to.index, 0), size) }
    if (target.column === from.column && target.index === from.index) return false
    execute(moveCardCommand(card, from, target))
    return true
  }

  return {
    board,
    past,
    future,
    hydrated,
    canUndo,
    canRedo,
    nextUndo,
    nextRedo,
    execute,
    undo,
    redo,
    replace,
    addCard,
    editCard,
    removeCard,
    moveCard,
  }
})
