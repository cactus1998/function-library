import type { Expense, Member, SavedState, Split } from '../types'
import { AMOUNT_MAX } from './expression'

export const STORAGE_KEY = 'split-bill:v1'
const VERSION = 1

export function defaultState(): SavedState {
  return {
    members: [
      { id: 'm-me', name: '我' },
      { id: 'm-ming', name: '小明' },
      { id: 'm-hua', name: '小華' },
    ],
    expenses: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isNonNegativeInt = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

function parseNumberRecord(value: unknown, ids: Set<string>): Record<string, number> | null {
  if (!isRecord(value)) return null
  const result: Record<string, number> = {}
  for (const [key, n] of Object.entries(value)) {
    if (!ids.has(key) || !isNonNegativeInt(n)) return null
    result[key] = n
  }
  return result
}

function parseSplit(value: unknown, ids: Set<string>): Split | null {
  if (!isRecord(value)) return null
  if (value.mode === 'equal') {
    const list = value.participants
    if (!Array.isArray(list) || !list.every((id): id is string => typeof id === 'string' && ids.has(id))) return null
    return { mode: 'equal', participants: [...list] }
  }
  if (value.mode === 'exact') {
    const amounts = parseNumberRecord(value.amounts, ids)
    return amounts && { mode: 'exact', amounts }
  }
  if (value.mode === 'shares') {
    const shares = parseNumberRecord(value.shares, ids)
    return shares && { mode: 'shares', shares }
  }
  return null
}

function parseMember(value: unknown): Member | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null
  const name = value.name.trim()
  return name ? { id: value.id, name } : null
}

function parseExpense(value: unknown, ids: Set<string>): Expense | null {
  if (!isRecord(value)) return null
  const { id, title, payerId, amount, serviceCharge } = value
  if (typeof id !== 'string' || typeof title !== 'string' || typeof payerId !== 'string' || !ids.has(payerId)) return null
  if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > AMOUNT_MAX) return null
  if (typeof serviceCharge !== 'boolean') return null
  const split = parseSplit(value.split, ids)
  if (!split) return null
  return { id, title, payerId, amount: amount as number, serviceCharge, split }
}

/**
 * 逐筆驗證儲存內容：成員不足 2 人或格式錯誤時整份捨棄；
 * 個別帳目不合法（例如引用不存在的成員）只丟棄該筆。
 */
export function parseSaved(raw: string | null): SavedState | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== VERSION || !isRecord(parsed.data)) return null
  const { members: rawMembers, expenses: rawExpenses } = parsed.data
  if (!Array.isArray(rawMembers) || !Array.isArray(rawExpenses)) return null
  const members: Member[] = []
  const seen = new Set<string>()
  for (const item of rawMembers) {
    const member = parseMember(item)
    if (member && !seen.has(member.id)) {
      seen.add(member.id)
      members.push(member)
    }
  }
  if (members.length < 2) return null
  const expenses = rawExpenses.map((item) => parseExpense(item, seen)).filter((e): e is Expense => e !== null)
  return { members, expenses }
}

export function serialize(state: SavedState): string {
  return JSON.stringify({ version: VERSION, data: state })
}
