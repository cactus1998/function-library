import type { BoardState, Card, ColumnId, ColumnMap } from '../types'
import { COLUMN_IDS, emptyColumns } from './columns'

const SEED: Record<ColumnId, string[]> = {
  todo: ['設計登入頁線框圖', '撰寫 API 錯誤處理規格', '調查首頁 LCP 過慢', '補上表單驗證單元測試', '整理設計系統色票'],
  doing: ['實作虛擬列表動態高度', '重構購物車狀態管理', '修正 Safari 日期解析錯誤', '撰寫元件無障礙檢查清單'],
  done: ['導入 Vitest 測試環境', '設定 CI 型別檢查', '升級 Vue 3.5'],
}

const BASE_TIME = Date.UTC(2026, 8, 1)

function build(titles: Record<ColumnId, string[]>, prefix: string): BoardState {
  const cards: Record<string, Card> = {}
  const columns: ColumnMap = emptyColumns()
  let n = 0
  for (const column of COLUMN_IDS) {
    for (const title of titles[column]) {
      const id = `${prefix}-${++n}`
      cards[id] = { id, title, createdAt: BASE_TIME + n * 3_600_000 }
      columns[column].push(id)
    }
  }
  return { cards, columns }
}

export function createSeedBoard(): BoardState {
  return build(SEED, 'seed')
}

/** 壓力測試：每欄 perColumn 張卡片 */
export function createStressBoard(perColumn = 100): BoardState {
  const titles = (label: string) =>
    Array.from({ length: perColumn }, (_, i) => `${label} #${String(i + 1).padStart(3, '0')}`)
  return build({ todo: titles('待辦任務'), doing: titles('進行中任務'), done: titles('已完成任務') }, 'stress')
}
