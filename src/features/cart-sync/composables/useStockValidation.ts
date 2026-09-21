import { computed, onScopeDispose, readonly, ref, watch, type Ref } from 'vue'
import type { CartStore } from '../stores/cart'
import type { Stamp, StockServer, ValidationStatus } from '../types'
import { backoffDelay } from '../utils/backoff'

export interface StockValidationOptions {
  isLeader: Readonly<Ref<boolean>>
  /** 不支援 Web Locks 時沒有 leader，每個分頁只檢查自己寫入的品項 */
  locksSupported: boolean
  debounce?: number
  retries?: number
  baseDelay?: number
  random?: () => number
}

interface Pending extends Stamp {
  productId: string
  qty: number
}

/**
 * 樂觀更新後的庫存檢查：購物車變更後 debounce 送出，失敗時指數退避重試。
 * 新的檢查開始前一律 abort 舊請求；回應只修正時間戳沒變過的品項。
 */
export function useStockValidation(store: CartStore, server: StockServer, options: StockValidationOptions) {
  const { isLeader, locksSupported, debounce = 300, retries = 3, baseDelay = 500, random } = options

  const status = ref<ValidationStatus>('idle')
  /** 目前是第幾次重試（0 為第一次請求） */
  const attempt = ref(0)
  const lastError = ref<string | null>(null)
  const active = computed(() => (locksSupported ? isLeader.value : true))

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  function cancel() {
    clearTimeout(debounceTimer)
    clearTimeout(retryTimer)
    debounceTimer = retryTimer = undefined
    controller?.abort()
    controller = null
  }

  function snapshot(): Pending[] {
    return store.items
      .map(({ line }) => ({ productId: line.productId, qty: line.qty, clock: line.clock, tabId: line.tabId }))
      .filter((item) => locksSupported || item.tabId === store.tabId)
  }

  async function run(n: number) {
    const pending = snapshot()
    if (pending.length === 0) {
      status.value = 'confirmed'
      lastError.value = null
      return
    }

    const current = new AbortController()
    controller = current
    status.value = 'checking'
    attempt.value = n

    try {
      const { stock } = await server.validateCart(
        pending.map(({ productId, qty }) => ({ productId, qty })),
        current.signal,
      )
      if (current.signal.aborted) return
      controller = null
      for (const item of pending) {
        const available = stock[item.productId] ?? 0
        if (item.qty > available) store.correct(item.productId, available, item)
      }
      status.value = 'confirmed'
      lastError.value = null
    } catch (error) {
      if (current.signal.aborted) return
      controller = null
      lastError.value = error instanceof Error ? error.message : String(error)
      if (n < retries) {
        status.value = 'retrying'
        retryTimer = setTimeout(() => void run(n + 1), backoffDelay(n, baseDelay, random))
      } else {
        status.value = 'failed'
      }
    }
  }

  function schedule() {
    if (!active.value) return
    cancel()
    status.value = 'pending'
    debounceTimer = setTimeout(() => void run(0), debounce)
  }

  /** 立即檢查（「重試」按鈕、剛成為 leader） */
  function check() {
    if (!active.value) return
    cancel()
    void run(0)
  }

  watch(
    () => (locksSupported ? store.userRevision : store.localRevision),
    () => schedule(),
  )

  watch(
    active,
    (value) => {
      if (value) {
        check()
      } else {
        cancel()
        status.value = 'idle'
      }
    },
    { immediate: true },
  )

  // 庫存或失敗率在後台被修改時重新檢查
  const unsubscribe = server.subscribe(() => schedule())

  onScopeDispose(() => {
    cancel()
    unsubscribe()
  })

  return {
    status: readonly(status),
    attempt: readonly(attempt),
    lastError: readonly(lastError),
    active,
    check,
  }
}
