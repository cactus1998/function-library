import type { CardPosition, ColumnMap, Direction } from '../types'
import { COLUMN_IDS } from './columns'

export function findPosition(columns: ColumnMap, id: string): CardPosition | null {
  for (const column of COLUMN_IDS) {
    const index = columns[column].indexOf(id)
    if (index !== -1) return { column, index }
  }
  return null
}

export function samePosition(a: CardPosition | null, b: CardPosition | null): boolean {
  if (!a || !b) return a === b
  return a.column === b.column && a.index === b.index
}

/** 目標欄扣掉 id 後的卡片數，也就是合法插入索引的最大值 */
export function columnSizeWithout(columns: ColumnMap, position: Pick<CardPosition, 'column'>, id: string): number {
  return columns[position.column].reduce((count, x) => (x === id ? count : count + 1), 0)
}

/** 從所在欄移除 id（直接修改），回傳原位置 */
export function detach(columns: ColumnMap, id: string): CardPosition | null {
  const position = findPosition(columns, id)
  if (position) columns[position.column].splice(position.index, 1)
  return position
}

/** 把 id 插入指定位置（直接修改），索引超出範圍時夾到頭尾 */
export function attach(columns: ColumnMap, id: string, position: CardPosition) {
  const list = columns[position.column]
  list.splice(Math.min(Math.max(position.index, 0), list.length), 0, id)
}

/** 不修改原資料，回傳把 id 移到 to 之後的新 ColumnMap（鍵盤拖曳預覽用） */
export function moveInColumns(columns: ColumnMap, id: string, to: CardPosition): ColumnMap {
  const next: ColumnMap = { todo: [...columns.todo], doing: [...columns.doing], done: [...columns.done] }
  detach(next, id)
  attach(next, id, to)
  return next
}

export interface StepResult {
  position: CardPosition
  blocked: boolean
}

/**
 * 鍵盤拖曳的下一個位置。上下在同欄移動；左右移到相鄰欄並保持相同索引，超出則放到最後。
 * 已在邊界時回傳原位置與 blocked: true。
 */
export function stepPosition(
  columns: ColumnMap,
  id: string,
  current: CardPosition,
  direction: Direction,
): StepResult {
  const blocked: StepResult = { position: current, blocked: true }
  switch (direction) {
    case 'up':
      return current.index > 0 ? { position: { ...current, index: current.index - 1 }, blocked: false } : blocked
    case 'down':
      return current.index < columnSizeWithout(columns, current, id)
        ? { position: { ...current, index: current.index + 1 }, blocked: false }
        : blocked
    case 'left':
    case 'right': {
      const next = COLUMN_IDS[COLUMN_IDS.indexOf(current.column) + (direction === 'left' ? -1 : 1)]
      if (!next) return blocked
      const size = columnSizeWithout(columns, { column: next }, id)
      return { position: { column: next, index: Math.min(current.index, size) }, blocked: false }
    }
  }
}
