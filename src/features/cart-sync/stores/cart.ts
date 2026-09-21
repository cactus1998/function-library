import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { findProduct, isKnownProduct, PRODUCTS } from '../data/products'
import type { CartItem, CartLine, CartLines, Stamp } from '../types'
import { clampQty, compareStamp, mergeLines, parseCartLines, QTY_MAX } from '../utils/lww'
import { createTabId, tabLabel } from '../utils/tab'

export const CART_STORAGE_KEY = 'cart-sync:v1'
export const CART_CHANNEL = 'cart-sync'
const DESCRIBE_LIMIT = 3

function describeLines(payload: unknown): string {
  const lines = parseCartLines(payload, isKnownProduct)
  if (!lines) return '格式不符，已忽略'
  if (lines.length === 0) return '（空）'
  const parts = lines.slice(0, DESCRIBE_LIMIT).map((line) => {
    const name = findProduct(line.productId)?.name ?? line.productId
    const value = line.deleted ? '刪除' : `× ${line.qty}`
    return `${name} ${value}（clock ${line.clock}，${tabLabel(line.tabId)}）`
  })
  if (lines.length > DESCRIBE_LIMIT) parts.push(`等 ${lines.length} 項`)
  return parts.join('、')
}

/**
 * 購物車是一個 LWW-map：每個品項各自帶 Lamport clock 與 tabId。
 * 本地操作的 action 回傳變更的品項，由 sync plugin 廣播；遠端資料一律經過 mergeRemote。
 */
export const useCartStore = defineStore(
  'cart-sync',
  () => {
    const tabId = createTabId()
    const lines = shallowRef<CartLines>({})
    const clock = ref(0)
    /** 使用者造成的變更（本地或遠端）次數，leader 據此重新檢查庫存；庫存修正不計入 */
    const userRevision = ref(0)
    /** 本分頁使用者操作次數，瀏覽器不支援 Web Locks 時據此檢查自己的變更 */
    const localRevision = ref(0)

    const items = computed<CartItem[]>(() =>
      PRODUCTS.flatMap((product) => {
        const line = lines.value[product.id]
        return line && !line.deleted ? [{ product, line, subtotal: product.price * line.qty }] : []
      }),
    )
    const totalCount = computed(() => items.value.reduce((sum, item) => sum + item.line.qty, 0))
    const totalPrice = computed(() => items.value.reduce((sum, item) => sum + item.subtotal, 0))

    function visibleLine(productId: string): CartLine | null {
      const line = lines.value[productId]
      return line && !line.deleted ? line : null
    }

    function write(productId: string, qty: number, deleted: boolean, corrected: boolean): CartLine {
      clock.value += 1
      const line: CartLine = { productId, qty, deleted, corrected, clock: clock.value, tabId }
      lines.value = { ...lines.value, [productId]: line }
      if (!corrected) {
        userRevision.value += 1
        localRevision.value += 1
      }
      return line
    }

    function add(productId: string): CartLine[] | null {
      if (!isKnownProduct(productId)) return null
      const current = visibleLine(productId)
      if (current && current.qty >= QTY_MAX) return null
      return [write(productId, current ? current.qty + 1 : 1, false, false)]
    }

    function setQty(productId: string, qty: number): CartLine[] | null {
      const current = visibleLine(productId)
      if (!current || !Number.isFinite(qty)) return null
      const next = clampQty(qty)
      if (next === current.qty) return null
      return [write(productId, next, false, false)]
    }

    function remove(productId: string): CartLine[] | null {
      const current = visibleLine(productId)
      return current ? [write(productId, current.qty, true, false)] : null
    }

    function clear(): CartLine[] | null {
      const visible = items.value.map((item) => item.line)
      if (visible.length === 0) return null
      return visible.map((line) => write(line.productId, line.qty, true, false))
    }

    /**
     * leader 依庫存修正數量。expected 是送出檢查時的時間戳；
     * 品項在等待回應期間被改過（時間戳不同）就不修正，避免蓋掉較新的操作。
     */
    function correct(productId: string, stock: number, expected: Stamp): CartLine[] | null {
      const current = visibleLine(productId)
      if (!current || compareStamp(current, expected) !== 0 || stock >= current.qty) return null
      return stock <= 0 ? [write(productId, 0, true, true)] : [write(productId, stock, false, true)]
    }

    /** 合併其他分頁或 localStorage 的資料，回傳實際改變的品項 */
    function mergeRemote(incoming: readonly CartLine[]): CartLine[] {
      const result = mergeLines(lines.value, incoming)
      // Lamport clock：收到較大的 clock 後，下一次本地寫入一定比它大
      if (result.maxClock > clock.value) clock.value = result.maxClock
      if (result.changed.length > 0) {
        lines.value = result.lines
        if (result.changed.some((line) => !line.corrected)) userRevision.value += 1
      }
      return result.changed
    }

    return {
      tabId,
      lines,
      clock,
      userRevision,
      localRevision,
      items,
      totalCount,
      totalPrice,
      add,
      setQty,
      remove,
      clear,
      correct,
      mergeRemote,
    }
  },
  {
    sync: {
      key: CART_STORAGE_KEY,
      version: 1,
      channel: CART_CHANNEL,
      outgoing: ['add', 'setQty', 'remove', 'clear', 'correct'],
      tabId: (store) => store.tabId,
      snapshot: (store) => Object.values(store.lines),
      receive(store, payload) {
        const lines = parseCartLines(payload, isKnownProduct)
        if (!lines) return false
        store.mergeRemote(lines)
        return true
      },
      describe: describeLines,
    },
  },
)

export type CartStore = ReturnType<typeof useCartStore>
