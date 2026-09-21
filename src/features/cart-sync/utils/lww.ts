import type { CartLine, CartLines, Stamp } from '../types'

export const QTY_MIN = 1
export const QTY_MAX = 99
const TAB_ID_MAX_LENGTH = 64

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 全序比較：clock 大者勝，相同時 tabId 字典序大者勝；只有同一次寫入才會相等 */
export function compareStamp(a: Stamp, b: Stamp): -1 | 0 | 1 {
  if (a.clock !== b.clock) return a.clock > b.clock ? 1 : -1
  if (a.tabId === b.tabId) return 0
  return a.tabId > b.tabId ? 1 : -1
}

export function clampQty(qty: number): number {
  return Math.min(QTY_MAX, Math.max(QTY_MIN, Math.trunc(qty)))
}

/**
 * 解析數量輸入框的文字：空白與非數字回傳 null（呼叫端還原原值），
 * 小數無條件捨去，超出範圍夾到 1–99。
 */
export function parseQtyInput(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return clampQty(value)
}

function parseCartLine(value: unknown): CartLine | null {
  if (!isRecord(value)) return null
  const { productId, qty, deleted, corrected, clock, tabId } = value
  if (typeof productId !== 'string' || !productId) return null
  if (typeof deleted !== 'boolean' || typeof corrected !== 'boolean') return null
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty > QTY_MAX) return null
  if (qty < (deleted ? 0 : QTY_MIN)) return null
  if (typeof clock !== 'number' || !Number.isSafeInteger(clock) || clock < 0) return null
  if (typeof tabId !== 'string' || !tabId || tabId.length > TAB_ID_MAX_LENGTH) return null
  return { productId, qty, deleted, corrected, clock, tabId }
}

/**
 * 驗證外部來的品項清單（訊息、localStorage）。任何一筆格式不符就整批拒絕，
 * 避免只套用一半的更新；未知商品則交給 isAllowed 過濾掉。
 */
export function parseCartLines(raw: unknown, isAllowed: (productId: string) => boolean = () => true): CartLine[] | null {
  if (!Array.isArray(raw)) return null
  const lines: CartLine[] = []
  for (const value of raw) {
    const line = parseCartLine(value)
    if (!line) return null
    if (isAllowed(line.productId)) lines.push(line)
  }
  return lines
}

export interface MergeResult {
  lines: CartLines
  /** 實際勝出、改變了本地狀態的品項 */
  changed: CartLine[]
  maxClock: number
}

/**
 * LWW-map 合併：逐項比較時間戳，較新者勝。不修改 local；沒有變更時回傳同一個物件。
 * 合併具冪等性、交換律與結合律，因此訊息重複或亂序送達，各分頁仍會收斂到相同結果。
 * 呼叫端需先以 parseCartLines 驗證 productId。
 */
export function mergeLines(local: CartLines, incoming: readonly CartLine[]): MergeResult {
  let lines: Record<string, CartLine> | null = null
  const changed = new Map<string, CartLine>()
  let maxClock = 0

  for (const line of incoming) {
    maxClock = Math.max(maxClock, line.clock)
    const current = (lines ?? local)[line.productId]
    if (current && compareStamp(line, current) <= 0) continue
    lines ??= { ...local }
    lines[line.productId] = line
    changed.set(line.productId, line)
  }

  return { lines: lines ?? local, changed: [...changed.values()], maxClock }
}
