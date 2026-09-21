import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOG_LIMIT } from '../plugins/syncPlugin'
import { CART_STORAGE_KEY } from '../stores/cart'
import { contents, createBus, createTab, line, settle } from './helpers'

let bus: ReturnType<typeof createBus>
const tabs: ReturnType<typeof createTab>[] = []

function openTab(options: Parameters<typeof createTab>[0] = {}) {
  const tab = createTab({ createChannel: bus.create, ...options })
  tabs.push(tab)
  return tab
}

function saved(): unknown {
  const raw = localStorage.getItem(CART_STORAGE_KEY)
  return raw === null ? null : JSON.parse(raw)
}

beforeEach(() => {
  localStorage.clear()
  bus = createBus()
})

afterEach(() => {
  for (const tab of tabs.splice(0)) tab.close()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('cross-tab sync over BroadcastChannel', () => {
  it('shows an item added in tab A in tab B (AC-01)', async () => {
    const a = openTab()
    const b = openTab()
    a.store.add('keyboard')
    await settle()
    expect(contents(b.store)).toBe('keyboard×1')
    expect(a.sync.transport.value).toBe('broadcast')
  })

  it('broadcasts only the changed line, not the whole cart', async () => {
    const a = openTab()
    openTab()
    a.store.add('keyboard')
    a.store.add('mouse')
    await settle()
    bus.posted.length = 0
    a.store.setQty('mouse', 4)
    const patches = bus.posted.filter((p) => (p.message as { type: string }).type === 'patch')
    expect(patches).toHaveLength(1)
    expect((patches[0].message as { payload: unknown[] }).payload).toHaveLength(1)
  })

  it('does not rebroadcast data received from another tab (EC-03)', async () => {
    const a = openTab()
    openTab()
    openTab()
    await settle()
    bus.posted.length = 0
    a.store.add('keyboard')
    await settle()
    expect(bus.posted).toHaveLength(1)
  })

  it('does not broadcast actions that changed nothing', async () => {
    const a = openTab()
    await settle()
    bus.posted.length = 0
    a.store.remove('keyboard')
    a.store.setQty('keyboard', 2)
    expect(bus.posted).toEqual([])
  })

  it('converges when both tabs edit the same item at the same time (EC-01)', async () => {
    const a = openTab()
    const b = openTab()
    a.store.add('keyboard')
    await settle()
    // 兩邊在收到對方訊息前各自寫入：clock 相同，由 tabId 決勝
    a.store.setQty('keyboard', 5)
    b.store.setQty('keyboard', 7)
    await settle()
    expect(contents(a.store)).toBe(contents(b.store))
    const winner = a.store.tabId > b.store.tabId ? '5' : '7'
    expect(contents(a.store)).toBe(`keyboard×${winner}`)
  })

  it('lets a new tab catch up through sync-request (AC-05)', async () => {
    const a = openTab({ saveDelay: 60_000 })
    a.store.add('keyboard')
    a.store.add('hub')
    expect(saved()).toBeNull()
    const b = openTab()
    await settle()
    expect(contents(b.store)).toBe('keyboard×1,hub×1')
  })

  it('ignores malformed messages without throwing (EC-09)', async () => {
    const a = openTab()
    const intruder = bus.create('cart-sync')
    for (const message of [
      null,
      'hello',
      { type: 'patch', payload: [] },
      { type: 'unknown', from: 'x' },
      { type: 'patch', from: 'x', payload: [{ productId: 'keyboard', qty: 'lots' }] },
      { type: 'patch', from: 'x', payload: [line('__proto__', 1, 1, 'x')] },
    ]) {
      intruder.postMessage(message)
    }
    await settle()
    expect(a.store.items).toEqual([])
    expect(Object.getPrototypeOf(a.store.lines)).toBe(Object.prototype)
  })
})

describe('persistence', () => {
  // $subscribe 在下一個 microtask 才觸發，因此每個測試在 flush / 關閉前先 settle，
  // 對應瀏覽器中 pagehide 與 unmount 一定發生在後續 task 的順序
  it('writes to localStorage once after a burst of changes (AC-11)', async () => {
    vi.useFakeTimers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const a = openTab()
    for (let i = 0; i < 10; i++) a.store.add('keyboard')
    await settle()
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(saved()).toMatchObject({ version: 1, data: [{ productId: 'keyboard', qty: 10 }] })
  })

  it('restores the cart after a reload (AC-04)', async () => {
    const a = openTab()
    a.store.add('keyboard')
    a.store.add('mouse')
    await settle()
    a.close()
    const reloaded = openTab()
    expect(contents(reloaded.store)).toBe('keyboard×1,mouse×1')
    expect(reloaded.store.clock).toBe(2)
    expect(reloaded.store.tabId).not.toBe(a.store.tabId)
  })

  it('discards data with another version or corrupt JSON (AC-04, EC-06)', () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 0, data: [line('keyboard', 1, 1, 'a')] }))
    expect(openTab().store.items).toEqual([])
    localStorage.setItem(CART_STORAGE_KEY, '{not json')
    expect(openTab().store.items).toEqual([])
  })

  it('keeps syncing in memory when localStorage cannot be written (EC-07)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const a = openTab()
    const b = openTab()
    a.store.add('keyboard')
    await settle()
    a.sync.flush()
    expect(a.sync.persistent.value).toBe(false)
    expect(contents(b.store)).toBe('keyboard×1')
  })

  it('works without any storage', () => {
    const a = openTab({ getStorage: () => null })
    a.store.add('keyboard')
    expect(a.sync.persistent.value).toBe(false)
    expect(a.sync.transport.value).toBe('broadcast')
  })

  it('saves the pending state on pagehide', async () => {
    vi.useFakeTimers()
    const a = openTab()
    a.store.add('keyboard')
    await settle()
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
    expect(saved()).toMatchObject({ data: [{ productId: 'keyboard' }] })
  })
})

describe('fallbacks', () => {
  it('merges storage events when BroadcastChannel is unavailable (AC-06)', () => {
    const a = openTab({ createChannel: () => null })
    expect(a.sync.transport.value).toBe('storage')
    const newValue = JSON.stringify({ version: 1, data: [line('mouse', 2, 4, 'other')] })
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY, newValue }))
    expect(contents(a.store)).toBe('mouse×2')
    expect(a.sync.log.value[0]).toMatchObject({ direction: 'in', kind: 'storage' })
  })

  it('ignores storage events for other keys or while using BroadcastChannel', () => {
    const fallback = openTab({ createChannel: () => null })
    const broadcast = openTab()
    const newValue = JSON.stringify({ version: 1, data: [line('mouse', 2, 4, 'other')] })
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else', newValue }))
    expect(fallback.store.items).toEqual([])
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY, newValue }))
    expect(broadcast.store.items).toEqual([])
  })

  it('reports a local-only transport when neither channel nor storage exists (EC-08)', () => {
    const a = openTab({ createChannel: () => null, getStorage: () => null })
    expect(a.sync.transport.value).toBe('none')
    a.store.add('keyboard')
    expect(contents(a.store)).toBe('keyboard×1')
  })
})

describe('simulated offline mode', () => {
  it('stops sending and receiving while offline', async () => {
    const a = openTab()
    const b = openTab()
    b.sync.setOnline(false)
    a.store.add('keyboard')
    b.store.add('mouse')
    await settle()
    expect(contents(a.store)).toBe('keyboard×1')
    expect(contents(b.store)).toBe('mouse×1')
  })

  it('converges after both tabs edit offline and reconnect (EC-19)', async () => {
    const a = openTab()
    const b = openTab()
    a.store.add('keyboard')
    await settle()
    a.sync.setOnline(false)
    b.sync.setOnline(false)
    a.store.setQty('keyboard', 5)
    a.store.add('hub')
    b.store.setQty('keyboard', 7)
    b.store.remove('keyboard')
    a.sync.setOnline(true)
    b.sync.setOnline(true)
    await settle()
    expect(contents(a.store)).toBe(contents(b.store))
  })
})

describe('lifecycle', () => {
  it('reconnects and asks for missed changes when restored from bfcache (EC-17)', async () => {
    const a = openTab()
    const b = openTab()
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    expect(bus.channels.size).toBe(0)
    // 兩個分頁都在同一個 window：模擬 b 返回前 a 已經有新資料
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    a.store.add('keyboard')
    await settle()
    expect(bus.channels.size).toBe(2)
    expect(contents(b.store)).toBe('keyboard×1')
  })

  it('closes the channel and removes listeners on dispose (AC-12)', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const a = openTab()
    const b = openTab()
    const channelCount = bus.channels.size
    a.close()
    expect(bus.channels.size).toBe(channelCount - 1)
    expect(removeListener.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['storage', 'pagehide', 'pageshow']),
    )
    b.store.add('keyboard')
    await settle()
    expect(a.store.items).toEqual([])
  })

  it('keeps only the most recent log entries', () => {
    const a = openTab()
    for (let i = 0; i < LOG_LIMIT + 5; i++) a.store.add('keyboard')
    expect(a.sync.log.value).toHaveLength(LOG_LIMIT)
    expect(a.sync.log.value[0].detail).toContain(`× ${LOG_LIMIT + 5}`)
  })
})
