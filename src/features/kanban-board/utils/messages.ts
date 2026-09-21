import type { CardPosition, ColumnMap, Direction } from '../types'
import { columnSizeWithout } from './board'
import { columnTitle } from './columns'

export function describePosition(columns: ColumnMap, id: string, position: CardPosition): string {
  const total = columnSizeWithout(columns, position, id) + 1
  return `「${columnTitle(position.column)}」第 ${position.index + 1} 張，共 ${total} 張`
}

export const BLOCKED_MESSAGES: Record<Direction, string> = {
  up: '已在最上方',
  down: '已在最下方',
  left: '已在最左欄',
  right: '已在最右欄',
}
