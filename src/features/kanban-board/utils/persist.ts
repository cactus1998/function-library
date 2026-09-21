import type { BoardState, Card } from '../types'
import { TITLE_MAX_LENGTH } from './card'
import { COLUMN_IDS, emptyColumns } from './columns'

export const STORAGE_KEY = 'kanban-board:v1'
const STORAGE_VERSION = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCard(value: unknown): Card | null {
  if (!isRecord(value)) return null
  const { id, title, createdAt } = value
  if (typeof id !== 'string' || !id) return null
  if (typeof title !== 'string' || !title.trim()) return null
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null
  return { id, title: title.trim().slice(0, TITLE_MAX_LENGTH), createdAt }
}

/**
 * 解析並驗證儲存的看板。格式或版本不符回傳 null；
 * 欄位中引用不存在的卡片、重複的 id 會被過濾，沒有任何欄位引用的卡片也會丟棄。
 */
export function parseBoard(raw: string | null): BoardState | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isRecord(parsed.data)) return null
  const { cards: rawCards, columns: rawColumns } = parsed.data
  if (!isRecord(rawCards) || !isRecord(rawColumns)) return null

  // 用 Map 蒐集，避免 "__proto__" 之類的 id 汙染一般物件
  const cards = new Map<string, Card>()
  for (const value of Object.values(rawCards)) {
    const card = parseCard(value)
    if (card && !cards.has(card.id)) cards.set(card.id, card)
  }

  const columns = emptyColumns()
  const used = new Map<string, Card>()
  for (const column of COLUMN_IDS) {
    const ids = rawColumns[column]
    if (!Array.isArray(ids)) return null
    for (const id of ids) {
      if (typeof id !== 'string' || used.has(id)) continue
      const card = cards.get(id)
      if (!card) continue
      used.set(id, card)
      columns[column].push(id)
    }
  }

  return { cards: Object.fromEntries(used), columns }
}

export function serializeBoard(state: BoardState): string {
  return JSON.stringify({ version: STORAGE_VERSION, data: { cards: state.cards, columns: state.columns } })
}

export function loadBoard(key = STORAGE_KEY): BoardState | null {
  try {
    return parseBoard(localStorage.getItem(key))
  } catch {
    // localStorage 不可用（無痕模式、權限）
    return null
  }
}

export function saveBoard(state: BoardState, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, serializeBoard(state))
  } catch {
    // 無法寫入時功能照常，只是不保存
  }
}
