import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { Booking, BookingApi, PlainDate, YearMonth } from '../types'
import { monthOf } from '../utils/plainDate'

export type LoadStatus = 'loading' | 'ready' | 'error'

interface CacheEntry {
  at: number
  bookings: Booking[]
}

export interface MonthBookingsOptions {
  ttl?: number
  clock?: () => number
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * 依顯示中的月份載入既有預約。
 * - 切換月份時 abort 上一個請求，舊回應永遠不會覆蓋新月份。
 * - 同月份結果快取 ttl 毫秒，期間切回來不重打 API。
 */
export function useMonthBookings(month: Ref<YearMonth>, api: BookingApi, options: MonthBookingsOptions = {}) {
  const ttl = options.ttl ?? 60_000
  const clock = options.clock ?? Date.now
  /** 整份替換以觸發更新，Map 內容不需要深層響應 */
  const cache = shallowRef(new Map<YearMonth, CacheEntry>())
  const status = ref<LoadStatus>('loading')
  const error = ref<string | null>(null)
  let controller: AbortController | null = null

  function isFresh(target: YearMonth): boolean {
    const entry = cache.value.get(target)
    return !!entry && clock() - entry.at < ttl
  }

  async function load(target: YearMonth, force = false) {
    controller?.abort()
    controller = null
    if (!force && isFresh(target)) {
      status.value = 'ready'
      error.value = null
      return
    }
    const current = new AbortController()
    controller = current
    status.value = 'loading'
    error.value = null
    try {
      const bookings = await api.fetchBookings(target, current.signal)
      if (current.signal.aborted) return
      const next = new Map(cache.value)
      next.set(target, { at: clock(), bookings })
      cache.value = next
      status.value = 'ready'
    } catch (reason) {
      if (current.signal.aborted || isAbortError(reason)) return
      status.value = 'error'
      error.value = reason instanceof Error ? reason.message : '無法載入空檔'
    } finally {
      if (controller === current) controller = null
    }
  }

  watch(month, (target) => void load(target), { immediate: true })
  onScopeDispose(() => controller?.abort())

  /** 已載入（即使過期）的月份都可用來計算；尚未載入回傳 undefined */
  function bookingsFor(date: PlainDate): Booking[] | undefined {
    return cache.value.get(monthOf(date))?.bookings
  }

  const bookings = computed<Booking[] | undefined>(() =>
    status.value === 'ready' ? cache.value.get(month.value)?.bookings : undefined,
  )

  return {
    bookings,
    status,
    error,
    bookingsFor,
    retry: () => load(month.value, true),
    invalidate,
  }

  /** 409 之後丟棄該月快取；若正在顯示該月則立即重新載入 */
  function invalidate(target: YearMonth) {
    const next = new Map(cache.value)
    next.delete(target)
    cache.value = next
    if (target === month.value) void load(target, true)
  }
}
