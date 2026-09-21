import { computed, shallowRef } from 'vue'
import type { useBoardStore } from '../stores/board'
import type { CardPosition, ColumnMap, Direction } from '../types'
import { findPosition, moveInColumns, stepPosition } from '../utils/board'
import { BLOCKED_MESSAGES, describePosition } from '../utils/messages'

export interface LiftedCard {
  id: string
  origin: CardPosition
  current: CardPosition
}

export interface KeyboardDragOptions {
  announce(message: string): void
  focusCard(id: string): void
}

/**
 * 鍵盤拖放：Space 拿起、方向鍵移動、Space 放下、Esc 取消。
 * 移動中只改預覽位置（displayColumns），放下時才寫入 store 產生一筆 command。
 */
export function useKeyboardDrag(store: ReturnType<typeof useBoardStore>, options: KeyboardDragOptions) {
  const lifted = shallowRef<LiftedCard | null>(null)

  const displayColumns = computed<ColumnMap>(() => {
    const current = lifted.value
    return current ? moveInColumns(store.board.columns, current.id, current.current) : store.board.columns
  })

  const titleOf = (id: string) => store.board.cards[id]?.title ?? ''

  function lift(id: string) {
    const origin = findPosition(store.board.columns, id)
    if (!origin) return
    lifted.value = { id, origin, current: origin }
    options.announce(
      `已拿起「${titleOf(id)}」，位於${describePosition(store.board.columns, id, origin)}。方向鍵移動，Space 放下，Esc 取消。`,
    )
  }

  function move(direction: Direction) {
    const current = lifted.value
    if (!current) return
    const step = stepPosition(store.board.columns, current.id, current.current, direction)
    if (step.blocked) {
      options.announce(BLOCKED_MESSAGES[direction])
      return
    }
    lifted.value = { ...current, current: step.position }
    options.announce(describePosition(store.board.columns, current.id, step.position))
    // 換欄或換位置後元素會重建，焦點需要補回來
    options.focusCard(current.id)
  }

  function drop() {
    const current = lifted.value
    if (!current) return
    lifted.value = null
    const moved = store.moveCard(current.id, current.current)
    options.announce(
      moved
        ? `已放下「${titleOf(current.id)}」，位於${describePosition(store.board.columns, current.id, current.current)}`
        : `已放下「${titleOf(current.id)}」，位置未變更`,
    )
    options.focusCard(current.id)
  }

  function cancel(restoreFocus = true) {
    const current = lifted.value
    if (!current) return
    lifted.value = null
    options.announce(
      `已取消移動，「${titleOf(current.id)}」回到${describePosition(store.board.columns, current.id, current.origin)}`,
    )
    if (restoreFocus) options.focusCard(current.id)
  }

  return { lifted, displayColumns, lift, move, drop, cancel }
}
