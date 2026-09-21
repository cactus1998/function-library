import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useStockValidation, type StockValidationOptions } from '../composables/useStockValidation'
import { useCartStore } from '../stores/cart'
import type { StockItem, StockResult, StockServer } from '../types'
import { line, settle, withScope } from './helpers'

interface Call {
  items: readonly StockItem[]
  signal: AbortSignal
  resolve: (result: StockResult) => void
  reject: (error: Error) => void
}

/** 手動控制回應時機的假伺服器 */
function createServer() {
  const calls: Call[] = []
  const listeners = new Set<() => void>()
  const server: StockServer = {
    validateCart: (items, signal) =>
      new Promise<StockResult>((resolve, reject) => {
        calls.push({ items, signal, resolve, reject })
      }),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return { server, calls, listeners, notify: () => listeners.forEach((listener) => listener()) }
}

let fake: ReturnType<typeof createServer>
let stops: (() => void)[] = []

function setup(options: Partial<StockValidationOptions> = {}) {
  const store = useCartStore()
  const isLeader = ref(options.isLeader?.value ?? true)
  const { result, stop } = withScope(() =>
    useStockValidation(store, fake.server, { locksSupported: true, random: () => 0.5, ...options, isLeader }),
  )
  stops.push(stop)
  return { store, isLeader, stop, ...result }
}

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  fake = createServer()
})

afterEach(() => {
  for (const stop of stops) stop()
  stops = []
  vi.useRealTimers()
})

describe('useStockValidation', () => {
  it('corrects an over-stock quantity after the debounce (AC-08)', async () => {
    const { store, status } = setup()
    store.add('hub')
    await settle()
    store.setQty('hub', 3)
    await settle()
    expect(status.value).toBe('pending')
    vi.advanceTimersByTime(300)
    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0].items).toEqual([{ productId: 'hub', qty: 3 }])
    expect(status.value).toBe('checking')

    fake.calls[0].resolve({ stock: { hub: 1 } })
    await settle()
    expect(store.lines.hub).toMatchObject({ qty: 1, corrected: true })
    expect(status.value).toBe('confirmed')

    // 修正本身不會再觸發一次檢查
    vi.advanceTimersByTime(1000)
    expect(fake.calls).toHaveLength(1)
  })

  it('sends a single request for a burst of changes (AC-11)', async () => {
    const { store } = setup()
    for (let i = 0; i < 10; i++) store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(299)
    expect(fake.calls).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0].items).toEqual([{ productId: 'keyboard', qty: 10 }])
  })

  it('retries three times with exponential backoff, then fails (AC-09)', async () => {
    const { store, status, attempt, lastError } = setup()
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)

    for (const [index, delay] of [500, 1000, 2000].entries()) {
      fake.calls[index].reject(new Error('模擬伺服器錯誤（503）'))
      await settle()
      expect(status.value).toBe('retrying')
      vi.advanceTimersByTime(delay - 1)
      expect(fake.calls).toHaveLength(index + 1)
      vi.advanceTimersByTime(1)
      expect(fake.calls).toHaveLength(index + 2)
      expect(attempt.value).toBe(index + 1)
    }

    fake.calls[3].reject(new Error('模擬伺服器錯誤（503）'))
    await settle()
    expect(status.value).toBe('failed')
    expect(lastError.value).toBe('模擬伺服器錯誤（503）')
    vi.advanceTimersByTime(10_000)
    expect(fake.calls).toHaveLength(4)
  })

  it('starts over immediately when asked to retry after failing', async () => {
    const { store, status, check } = setup({ retries: 0 })
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)
    fake.calls[0].reject(new Error('down'))
    await settle()
    expect(status.value).toBe('failed')
    check()
    expect(fake.calls).toHaveLength(2)
    fake.calls[1].resolve({ stock: { keyboard: 10 } })
    await settle()
    expect(status.value).toBe('confirmed')
  })

  it('aborts the in-flight request and ignores its late response (AC-10)', async () => {
    const { store } = setup()
    store.add('hub')
    await settle()
    vi.advanceTimersByTime(300)
    const stale = fake.calls[0]

    store.setQty('hub', 2)
    await settle()
    expect(stale.signal.aborted).toBe(true)
    stale.resolve({ stock: { hub: 0 } })
    await settle()
    expect(store.lines.hub).toMatchObject({ qty: 2, deleted: false })

    vi.advanceTimersByTime(300)
    expect(fake.calls).toHaveLength(2)
  })

  it('cancels a scheduled retry when the cart changes', async () => {
    const { store, status } = setup()
    store.add('hub')
    await settle()
    vi.advanceTimersByTime(300)
    fake.calls[0].reject(new Error('down'))
    await settle()
    store.add('hub')
    await settle()
    expect(status.value).toBe('pending')
    vi.advanceTimersByTime(300)
    expect(fake.calls).toHaveLength(2)
    expect(fake.calls[1].items).toEqual([{ productId: 'hub', qty: 2 }])
  })

  it('re-checks remote changes while leader', async () => {
    const { store } = setup()
    store.mergeRemote([line('mouse', 4, 5, 'other')])
    await settle()
    vi.advanceTimersByTime(300)
    expect(fake.calls).toHaveLength(1)
  })

  it('confirms an empty cart without calling the server', async () => {
    const { status } = setup()
    expect(status.value).toBe('confirmed')
    expect(fake.calls).toHaveLength(0)
  })

  it('does nothing as a follower and checks at once after becoming leader (AC-07)', async () => {
    const { store, isLeader, status, active } = setup({ isLeader: ref(false) })
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(1000)
    expect(fake.calls).toHaveLength(0)
    expect([active.value, status.value]).toEqual([false, 'idle'])

    isLeader.value = true
    await settle()
    expect(fake.calls).toHaveLength(1)
  })

  it('stops checking when leadership is lost', async () => {
    const { store, isLeader, status } = setup()
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)
    isLeader.value = false
    await settle()
    expect(fake.calls[0].signal.aborted).toBe(true)
    expect(status.value).toBe('idle')
  })

  it('checks only its own writes when Web Locks are unsupported (EC-11)', async () => {
    const { store, active } = setup({ locksSupported: false, isLeader: ref(false) })
    expect(active.value).toBe(true)
    store.mergeRemote([line('mouse', 4, 5, 'other')])
    await settle()
    vi.advanceTimersByTime(1000)
    expect(fake.calls).toHaveLength(0)

    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)
    expect(fake.calls[0].items).toEqual([{ productId: 'keyboard', qty: 1 }])
  })

  it('re-checks when the server stock changes', async () => {
    const { store } = setup()
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)
    fake.notify()
    await settle()
    vi.advanceTimersByTime(300)
    expect(fake.calls).toHaveLength(2)
    expect(fake.calls[0].signal.aborted).toBe(true)
  })

  it('aborts requests, clears timers and unsubscribes on dispose', async () => {
    const timersBefore = vi.getTimerCount()
    const { store, stop } = setup()
    store.add('keyboard')
    await settle()
    vi.advanceTimersByTime(300)
    store.add('keyboard')
    await settle()
    stop()
    expect(fake.calls[0].signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(timersBefore)
    expect(fake.listeners.size).toBe(0)
  })
})
