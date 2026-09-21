import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMockServer,
  defaultServerState,
  normalizeServerState,
  readServerState,
  SERVER_STORAGE_KEY,
  subscribeServerState,
  writeServerState,
} from '../services/mockServer'

beforeEach(() => {
  vi.useFakeTimers()
  // 重設模組內的記憶體備援，再清掉 localStorage
  writeServerState(defaultServerState())
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createMockServer', () => {
  it('responds after the latency with the stock at response time', async () => {
    const server = createMockServer({ latency: [300, 800], random: () => 0, failureRate: 0 })
    const promise = server.validateCart([{ productId: 'hub', qty: 3 }], new AbortController().signal)
    writeServerState({ ...defaultServerState(), stock: { ...defaultServerState().stock, hub: 0 } })
    vi.advanceTimersByTime(299)
    let settled = false
    void promise.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    vi.advanceTimersByTime(1)
    await expect(promise).resolves.toEqual({ stock: { hub: 0 } })
  })

  it('fails with a 503 according to the failure rate', async () => {
    const server = createMockServer({ latency: [0, 0], random: () => 0.2, failureRate: 0.5 })
    const promise = server.validateCart([{ productId: 'hub', qty: 1 }], new AbortController().signal)
    vi.advanceTimersByTime(0)
    await expect(promise).rejects.toThrow('模擬伺服器錯誤（503）')
  })

  it('uses the shared failure rate when none is given', async () => {
    writeServerState({ ...defaultServerState(), failureRate: 0 })
    const server = createMockServer({ latency: [0, 0], random: () => 0 })
    const promise = server.validateCart([{ productId: 'hub', qty: 1 }], new AbortController().signal)
    vi.advanceTimersByTime(0)
    await expect(promise).resolves.toEqual({ stock: { hub: 1 } })
  })

  it('rejects with AbortError when aborted, before or during the request', async () => {
    const timersBefore = vi.getTimerCount()
    const server = createMockServer({ failureRate: 0 })
    const controller = new AbortController()
    const pending = server.validateCart([{ productId: 'hub', qty: 1 }], controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await expect(server.validateCart([], controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(timersBefore)
  })
})

describe('server state', () => {
  it('falls back to defaults for corrupt data or another version', () => {
    localStorage.setItem(SERVER_STORAGE_KEY, '{oops')
    expect(readServerState()).toEqual(defaultServerState())
    localStorage.setItem(SERVER_STORAGE_KEY, JSON.stringify({ version: 2, data: { failureRate: 0.3 } }))
    expect(readServerState().failureRate).toBe(defaultServerState().failureRate)
  })

  it('clamps values and drops unknown products', () => {
    const state = normalizeServerState({ stock: { hub: 99, mouse: -3, stand: 2.7, ghost: 5 }, failureRate: 0.9 })
    expect(state.stock).toMatchObject({ hub: 20, mouse: 0, stand: 2 })
    expect(state.stock).not.toHaveProperty('ghost')
    expect(state.failureRate).toBe(0.5)
  })

  it('round-trips through localStorage', () => {
    writeServerState({ ...defaultServerState(), failureRate: 0.25 })
    expect(JSON.parse(localStorage.getItem(SERVER_STORAGE_KEY)!)).toMatchObject({ version: 1 })
    expect(readServerState().failureRate).toBe(0.25)
  })

  it('notifies subscribers for local writes and storage events until unsubscribed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeServerState(listener)
    writeServerState(defaultServerState())
    window.dispatchEvent(new StorageEvent('storage', { key: SERVER_STORAGE_KEY }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }))
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    writeServerState(defaultServerState())
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
