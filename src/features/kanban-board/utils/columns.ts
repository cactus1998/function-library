import type { ColumnId, ColumnMap } from '../types'

export interface ColumnDefinition {
  id: ColumnId
  title: string
}

export const COLUMNS: readonly ColumnDefinition[] = [
  { id: 'todo', title: '待辦' },
  { id: 'doing', title: '進行中' },
  { id: 'done', title: '完成' },
]

export const COLUMN_IDS: readonly ColumnId[] = COLUMNS.map((column) => column.id)

export function isColumnId(value: unknown): value is ColumnId {
  return typeof value === 'string' && (COLUMN_IDS as readonly string[]).includes(value)
}

export function columnTitle(id: ColumnId): string {
  return COLUMNS.find((column) => column.id === id)?.title ?? id
}

export function emptyColumns(): ColumnMap {
  return { todo: [], doing: [], done: [] }
}
