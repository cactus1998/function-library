import { DEFAULT_STOCK, PRODUCTS } from '../data/products'
import type { StockServer } from '../types'
import { isRecord } from '../utils/lww'

/** 模擬「所有分頁共用的伺服器」：庫存與失敗率存在 localStorage */
export const SERVER_STORAGE_KEY = 'cart-sync:server:v1'
const SERVER_VERSION = 1
export const STOCK_MAX = 20
export const FAILURE_RATE_MAX = 0.5
export const DEFAULT_FAILURE_RATE = 0.1
export const DEFAULT_LATENCY: readonly [number, number] = [300, 800]

export interface ServerState {
  stock: Record<string, number>
  failureRate: number
}

export function defaultServerState(): ServerState {
  return { stock: { ...DEFAULT_STOCK }, failureRate: DEFAULT_FAILURE_RATE }
}

function clampInt(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.trunc(value)))
}

/** 只保留已知商品，數值夾到合法範圍；缺漏的商品補預設值 */
export function normalizeServerState(raw: unknown): ServerState {
  const state = defaultServerState()
  if (!isRecord(raw)) return state
  if (isRecord(raw.stock)) {
    for (const { id } of PRODUCTS) {
      const value = raw.stock[id]
      if (typeof value === 'number' && Number.isFinite(value)) state.stock[id] = clampInt(value, STOCK_MAX)
    }
  }
  if (typeof raw.failureRate === 'number' && Number.isFinite(raw.failureRate)) {
    state.failureRate = Math.min(FAILURE_RATE_MAX, Math.max(0, raw.failureRate))
  }
  return state
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** localStorage 不可用時退回模組內的記憶體 */
let memoryState: ServerState | null = null
/** 同一份文件內的變更通知（storage event 只在其他分頁觸發） */
const localChanges = new EventTarget()

export function readServerState(storage: Storage | null = defaultStorage()): ServerState {
  try {
    const raw = storage?.getItem(SERVER_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed) && parsed.version === SERVER_VERSION) return normalizeServerState(parsed.data)
    }
  } catch {
    // 損毀或不可用：退回記憶體或預設值
  }
  return memoryState ?? defaultServerState()
}

export function writeServerState(state: ServerState, storage: Storage | null = defaultStorage()) {
  const next = normalizeServerState(state)
  memoryState = next
  try {
    storage?.setItem(SERVER_STORAGE_KEY, JSON.stringify({ version: SERVER_VERSION, data: next }))
  } catch {
    // 只保存在記憶體
  }
  localChanges.dispatchEvent(new Event('change'))
}

export function subscribeServerState(listener: () => void, target: Window = window): () => void {
  function onStorage(event: StorageEvent) {
    if (event.key === SERVER_STORAGE_KEY) listener()
  }
  target.addEventListener('storage', onStorage)
  localChanges.addEventListener('change', listener)
  return () => {
    target.removeEventListener('storage', onStorage)
    localChanges.removeEventListener('change', listener)
  }
}

export interface MockServerOptions {
  storage?: Storage | null
  latency?: readonly [number, number]
  random?: () => number
  /** 覆寫共用設定中的失敗率（測試用） */
  failureRate?: number
}

function abortError(): DOMException {
  return new DOMException('The request was aborted', 'AbortError')
}

export function createMockServer(options: MockServerOptions = {}): StockServer {
  const storage = options.storage === undefined ? defaultStorage() : options.storage
  const [minLatency, maxLatency] = options.latency ?? DEFAULT_LATENCY
  const random = options.random ?? Math.random

  return {
    validateCart(items, signal) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(abortError())
          return
        }
        const delay = minLatency + (maxLatency - minLatency) * random()
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort)
          // 回應時才讀庫存，模擬請求途中庫存被其他人買走
          const state = readServerState(storage)
          if (random() < (options.failureRate ?? state.failureRate)) {
            reject(new Error('模擬伺服器錯誤（503）'))
            return
          }
          resolve({ stock: Object.fromEntries(items.map((item) => [item.productId, state.stock[item.productId] ?? 0])) })
        }, delay)
        function onAbort() {
          clearTimeout(timer)
          reject(abortError())
        }
        signal.addEventListener('abort', onAbort, { once: true })
      })
    },
    subscribe: (listener) => subscribeServerState(listener),
  }
}
