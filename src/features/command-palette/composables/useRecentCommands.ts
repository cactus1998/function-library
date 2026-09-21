import { readonly, ref, type Ref } from 'vue'

export const RECENT_STORAGE_KEY = 'command-palette:recent'
const STORAGE_VERSION = 1

interface StoredRecent {
  version: number
  data: string[]
}

function isStoredRecent(value: unknown): value is StoredRecent {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    record.version === STORAGE_VERSION &&
    Array.isArray(record.data) &&
    record.data.every((id) => typeof id === 'string')
  )
}

function load(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return isStoredRecent(parsed) ? parsed.data : []
  } catch {
    // JSON 損毀或 localStorage 不可用（無痕模式、權限）：退回空陣列
    return []
  }
}

function save(ids: string[]) {
  try {
    const payload: StoredRecent = { version: STORAGE_VERSION, data: ids }
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 無法寫入時功能照常，只是不保存
  }
}

// 模組層級共用狀態：面板與示範頁的「清除最近使用」操作同一份資料
let shared: Ref<string[]> | null = null

function state(): Ref<string[]> {
  shared ??= ref(load())
  return shared
}

/** 測試用：丟棄快取，下次呼叫重新從 localStorage 讀取 */
export function resetRecentCommandsCache() {
  shared = null
}

export function useRecentCommands(max = 5) {
  const ids = state()

  function push(id: string) {
    ids.value = [id, ...ids.value.filter((x) => x !== id)].slice(0, max)
    save(ids.value)
  }

  function clear() {
    ids.value = []
    save([])
  }

  return { ids: readonly(ids), push, clear }
}
