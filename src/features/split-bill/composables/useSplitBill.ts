import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { Expense, Member } from '../types'
import { computeBalances, settle } from '../utils/split'
import { defaultState, parseSaved, serialize, STORAGE_KEY } from '../utils/storage'

export const MEMBER_MIN = 2
export const MEMBER_MAX = 20
export const NAME_MAX = 12
export const UNDO_MS = 5000

export interface SplitBillOptions {
  storage?: Storage | null
  key?: string
  saveDelay?: number
  createId?: () => string
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

let counter = 0
const defaultId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`

/** 成員名稱比較：去除前後空白、不分大小寫 */
const nameKey = (name: string) => name.trim().toLocaleLowerCase()

export function useSplitBill(options: SplitBillOptions = {}) {
  const storage = options.storage === undefined ? defaultStorage() : options.storage
  const key = options.key ?? STORAGE_KEY
  const saveDelay = options.saveDelay ?? 300
  const createId = options.createId ?? defaultId

  let initial = defaultState()
  try {
    initial = parseSaved(storage?.getItem(key) ?? null) ?? initial
  } catch {
    // storage 不可用：使用預設資料
  }

  // 每次變更整份替換，不需要深層響應
  const members = shallowRef<Member[]>(initial.members)
  const expenses = shallowRef<Expense[]>(initial.expenses)
  const pendingUndo = ref<{ expense: Expense; index: number } | null>(null)

  const balances = computed(() => computeBalances(members.value, expenses.value))
  const transfers = computed(() => settle(balances.value))

  // ---- 成員 ----

  function validateName(name: string, exceptId?: string): string | null {
    const trimmed = name.trim()
    if (!trimmed) return '請輸入名稱'
    if ([...trimmed].length > NAME_MAX) return `名稱最多 ${NAME_MAX} 個字`
    if (members.value.some((m) => m.id !== exceptId && nameKey(m.name) === nameKey(trimmed))) return '已有同名成員'
    return null
  }

  function addMember(name: string): string | null {
    if (members.value.length >= MEMBER_MAX) return `最多 ${MEMBER_MAX} 人`
    const error = validateName(name)
    if (error) return error
    members.value = [...members.value, { id: createId(), name: name.trim() }]
    return null
  }

  function renameMember(id: string, name: string): string | null {
    const error = validateName(name, id)
    if (error) return error
    members.value = members.value.map((m) => (m.id === id ? { ...m, name: name.trim() } : m))
    return null
  }

  function isInvolved(id: string, expense: Expense): boolean {
    if (expense.payerId === id) return true
    const { split } = expense
    if (split.mode === 'equal') return split.participants.includes(id)
    if (split.mode === 'exact') return (split.amounts[id] ?? 0) > 0
    return (split.shares[id] ?? 0) > 0
  }

  function removeMember(id: string): string | null {
    const member = members.value.find((m) => m.id === id)
    if (!member) return null
    if (members.value.length <= MEMBER_MIN) return `至少要有 ${MEMBER_MIN} 人`
    // 復原中的帳目也算，避免復原後引用不存在的成員
    const related = [...expenses.value, ...(pendingUndo.value ? [pendingUndo.value.expense] : [])]
    if (related.some((e) => isInvolved(id, e))) return `${member.name} 有相關帳目，請先修改帳目`
    members.value = members.value.filter((m) => m.id !== id)
    return null
  }

  // ---- 帳目 ----

  function saveExpense(expense: Omit<Expense, 'id'> & { id?: string }): Expense {
    const saved: Expense = { ...expense, id: expense.id ?? createId() }
    const index = expenses.value.findIndex((e) => e.id === saved.id)
    expenses.value =
      index === -1 ? [...expenses.value, saved] : expenses.value.map((e, i) => (i === index ? saved : e))
    return saved
  }

  let undoTimer: ReturnType<typeof setTimeout> | undefined

  function clearUndo() {
    clearTimeout(undoTimer)
    undoTimer = undefined
    pendingUndo.value = null
  }

  /** 刪除後 UNDO_MS 內可復原；再刪另一筆時，前一筆直接確定刪除 */
  function removeExpense(id: string) {
    const index = expenses.value.findIndex((e) => e.id === id)
    if (index === -1) return
    clearUndo()
    pendingUndo.value = { expense: expenses.value[index]!, index }
    expenses.value = expenses.value.filter((e) => e.id !== id)
    undoTimer = setTimeout(clearUndo, UNDO_MS)
  }

  function undoRemove(): boolean {
    const pending = pendingUndo.value
    if (!pending) return false
    const next = [...expenses.value]
    next.splice(Math.min(pending.index, next.length), 0, pending.expense)
    expenses.value = next
    clearUndo()
    return true
  }

  function reset() {
    clearUndo()
    const state = defaultState()
    members.value = state.members
    expenses.value = state.expenses
  }

  // ---- 持久化 ----

  let saveTimer: ReturnType<typeof setTimeout> | undefined

  function write() {
    try {
      storage?.setItem(key, serialize({ members: members.value, expenses: expenses.value }))
    } catch {
      // 配額不足或無痕模式：只保留在記憶體
    }
  }

  function flush() {
    if (saveTimer === undefined) return
    clearTimeout(saveTimer)
    saveTimer = undefined
    write()
  }

  watch([members, expenses], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = undefined
      write()
    }, saveDelay)
  })

  window.addEventListener('pagehide', flush)
  onScopeDispose(() => {
    flush()
    clearUndo()
    window.removeEventListener('pagehide', flush)
  })

  return {
    members,
    expenses,
    balances,
    transfers,
    pendingUndo,
    validateName,
    addMember,
    renameMember,
    removeMember,
    saveExpense,
    removeExpense,
    undoRemove,
    reset,
    flush,
  }
}
