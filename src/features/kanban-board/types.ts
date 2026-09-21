export type ColumnId = 'todo' | 'doing' | 'done'

export interface Card {
  id: string
  title: string
  createdAt: number
}

/** 每欄依序存放卡片 id */
export type ColumnMap = Record<ColumnId, string[]>

export interface BoardState {
  cards: Record<string, Card>
  columns: ColumnMap
}

/** index 為「把該卡片從看板移除後」在目標欄中的位置，同欄往下移動時不需要再扣掉自己 */
export interface CardPosition {
  column: ColumnId
  index: number
}

/** Undo / Redo 的最小單位：do 與 undo 直接修改傳入的 state */
export interface BoardCommand {
  label: string
  do(state: BoardState): void
  undo(state: BoardState): void
}

export interface Point {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'
