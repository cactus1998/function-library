export interface Product {
  id: string
  name: string
  /** 單價，新台幣整數 */
  price: number
}

/** LWW 比較用的時間戳：clock 大者勝，相同時 tabId 字典序大者勝 */
export interface Stamp {
  clock: number
  tabId: string
}

/**
 * 購物車中的一個品項，本身就是一個 LWW register。
 * 刪除不移除資料，而是寫入 deleted 為 true 的 tombstone，讓刪除也能參與衝突比較。
 */
export interface CartLine extends Stamp {
  productId: string
  /** 1–99；tombstone 可為 0 */
  qty: number
  deleted: boolean
  /** 這次寫入是 leader 依庫存做的修正，而不是使用者操作 */
  corrected: boolean
}

export type CartLines = Readonly<Record<string, CartLine>>

export interface CartItem {
  product: Product
  line: CartLine
  subtotal: number
}

export interface StockItem {
  productId: string
  qty: number
}

export interface StockResult {
  /** 每項商品目前可購買的數量 */
  stock: Record<string, number>
}

export interface StockServer {
  validateCart(items: readonly StockItem[], signal: AbortSignal): Promise<StockResult>
  /** 庫存或失敗率被修改時通知，回傳取消訂閱函式 */
  subscribe(listener: () => void): () => void
}

export type ValidationStatus = 'idle' | 'pending' | 'checking' | 'retrying' | 'confirmed' | 'failed'
