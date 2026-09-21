import { createPinia } from 'pinia'
import { createApp, effectScope } from 'vue'
import { useCartSession } from '../composables/useCartSession'
import { getSyncHandle, type SyncChannel, type SyncPluginOptions } from '../plugins/syncPlugin'
import type { CartLine } from '../types'

/** 在 effect scope 中執行 composable，回傳結果與 stop（模擬元件 unmount） */
export function withScope<T>(factory: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)!
  return { result, stop: () => scope.stop() }
}

/** 讓排在 microtask 的訊息投遞與 Promise 回呼跑完（不依賴計時器，可搭配 fake timers） */
export async function settle(rounds = 10) {
  for (let i = 0; i < rounds; i++) await Promise.resolve()
}

export function line(productId: string, qty: number, clock: number, tabId: string, extra: Partial<CartLine> = {}): CartLine {
  return { productId, qty, clock, tabId, deleted: false, corrected: false, ...extra }
}

export interface FakeChannel extends SyncChannel {
  readonly name: string
  closed: boolean
}

/**
 * 模擬同源分頁共用的 BroadcastChannel：訊息以 structuredClone 複製後非同步投遞給
 * 同名的其他 channel，不回送給自己，與瀏覽器行為一致。
 */
export function createBus() {
  const channels = new Set<FakeChannel>()
  const posted: { name: string; message: unknown }[] = []

  function create(name: string): SyncChannel {
    const channel: FakeChannel = {
      name,
      closed: false,
      onmessage: null,
      postMessage(message: unknown) {
        if (channel.closed) throw new DOMException('Channel is closed', 'InvalidStateError')
        const data: unknown = structuredClone(message)
        posted.push({ name, message: data })
        for (const other of channels) {
          if (other === channel || other.name !== name) continue
          queueMicrotask(() => {
            if (!other.closed) other.onmessage?.(new MessageEvent('message', { data }))
          })
        }
      },
      close() {
        channel.closed = true
        channels.delete(channel)
      },
    }
    channels.add(channel)
    return channel
  }

  return { create, posted, channels }
}

/**
 * 建立一個「分頁」：獨立的 pinia 與 store，共用 localStorage 與 bus。
 * pinia 必須先 app.use 安裝過，pinia.use 加掛的 plugin 才會生效。
 */
export function createTab(options: SyncPluginOptions = {}) {
  const pinia = createPinia()
  createApp({}).use(pinia)
  const { result: store, stop } = withScope(() => useCartSession(pinia, { saveDelay: 100, ...options }))
  return { pinia, store, sync: getSyncHandle(store), close: stop }
}

/** 購物車可見內容，方便比較兩個分頁是否收斂 */
export function contents(store: { items: readonly { product: { id: string }; line: CartLine }[] }): string {
  return store.items.map(({ product, line: l }) => `${product.id}×${l.qty}`).join(',')
}
