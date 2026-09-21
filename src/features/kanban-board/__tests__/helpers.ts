import { vi } from 'vitest'
import { effectScope } from 'vue'
import type { BoardState, ColumnId } from '../types'
import { COLUMN_IDS } from '../utils/columns'

/** 在 effect scope 中執行 composable，回傳結果與 stop（模擬元件 unmount） */
export function withScope<T>(factory: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)!
  return { result, stop: () => scope.stop() }
}

/** 以字母建立看板：board({ todo: ['A', 'B'] }) 的卡片 id 與標題都是字母 */
export function board(columns: Partial<Record<ColumnId, string[]>>): BoardState {
  const state: BoardState = { cards: {}, columns: { todo: [], doing: [], done: [] } }
  for (const column of COLUMN_IDS) {
    for (const id of columns[column] ?? []) {
      state.cards[id] = { id, title: id, createdAt: 0 }
      state.columns[column].push(id)
    }
  }
  return state
}

/** 可手動推進的 requestAnimationFrame */
export function installFrames() {
  let queue: FrameRequestCallback[] = []
  let now = 0
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      queue.push(callback)
      return queue.length
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn(() => {
      // 測試中只會取消「目前唯一排隊中的」frame，直接清空即可
      queue = []
    }),
  )
  return {
    /** 執行目前排隊的 frame（callback 中新排的留到下一次） */
    flush() {
      const current = queue
      queue = []
      now += 16
      for (const callback of current) callback(now)
    },
    get pending() {
      return queue.length
    },
  }
}

export interface PointerInit {
  x?: number
  y?: number
  pointerId?: number
  pointerType?: string
  button?: number
  isPrimary?: boolean
}

export function pointer(type: string, init: PointerInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    button: init.button ?? 0,
    isPrimary: init.isPrimary ?? true,
  })
}

export function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
}

// ---- 假版面：jsdom 不做 layout，依 DOM 結構算出固定尺寸 -------------------------

export const LAYOUT = {
  columnWidth: 280,
  columnGap: 20,
  listTop: 40,
  cardHeight: 40,
  cardGap: 10,
  boardHeight: 800,
} as const

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

/**
 * 看板：三欄橫排，每欄寬 280、間隔 20；列表從 y=40 開始，
 * 卡片與 placeholder 高 40、間隔 10；隱藏的卡片（data-drag-hidden）尺寸為 0。
 * 列表的 scrollTop 會讓卡片往上移。
 */
export function installLayout() {
  const original = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const el = this as HTMLElement
    const { columnWidth, columnGap, listTop, cardHeight, cardGap, boardHeight } = LAYOUT
    const columnEl = el.closest<HTMLElement>('[data-column-id]')
    const columnIndex = columnEl ? COLUMN_IDS.indexOf(columnEl.dataset.columnId as ColumnId) : 0
    const left = columnIndex * (columnWidth + columnGap)

    if (el.matches('[role="region"]')) return rect(0, 0, 3 * columnWidth + 2 * columnGap, boardHeight)
    if (el.dataset.columnId !== undefined) return rect(left, 0, columnWidth, boardHeight)
    if (el.dataset.cardList !== undefined) return rect(left, listTop, columnWidth, boardHeight - listTop - 60)

    const item = el.closest<HTMLElement>('[data-card-id], [data-placeholder]')
    const list = item?.parentElement
    if (item && list?.dataset.cardList !== undefined) {
      if (item.dataset.dragHidden !== undefined) return rect(0, 0, 0, 0)
      const visible = [...list.children].filter(
        (child) => child instanceof HTMLElement && child.dataset.dragHidden === undefined,
      )
      const index = visible.indexOf(item)
      const top = listTop + index * (cardHeight + cardGap) - list.scrollTop
      return rect(left, top, columnWidth, cardHeight)
    }
    return rect(0, 0, 0, 0)
  }
  return () => {
    Element.prototype.getBoundingClientRect = original
  }
}

/** 假版面中第 index 張卡片（不含被拖的那張）的中心點 */
export function cardCenter(column: ColumnId, index: number): { x: number; y: number } {
  const { columnWidth, columnGap, listTop, cardHeight, cardGap } = LAYOUT
  return {
    x: COLUMN_IDS.indexOf(column) * (columnWidth + columnGap) + columnWidth / 2,
    y: listTop + index * (cardHeight + cardGap) + cardHeight / 2,
  }
}
