import { inject, type InjectionKey } from 'vue'
import type { ColumnId, Direction } from './types'

/** KanbanBoard 提供給欄位與卡片的操作；狀態（編輯中、拿起中）以 props 往下傳 */
export interface BoardContext {
  instructionsId: string
  startEdit(id: string): void
  /** 驗證失敗回傳錯誤訊息；restoreFocus 為 false 時（blur 觸發）不搶焦點 */
  saveEdit(id: string, title: string, restoreFocus: boolean): string | null
  cancelEdit(id: string, restoreFocus: boolean): void
  remove(id: string): void
  addCard(column: ColumnId, title: string): string | null
  lift(id: string): void
  moveLifted(direction: Direction): void
  dropLifted(): void
  cancelLifted(): void
}

export const boardContextKey: InjectionKey<BoardContext> = Symbol('kanban-board')

export function useBoardContext(): BoardContext {
  const context = inject(boardContextKey)
  if (!context) throw new Error('useBoardContext() must be used inside <KanbanBoard>')
  return context
}
