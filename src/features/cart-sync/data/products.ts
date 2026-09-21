import type { Product } from '../types'

export const PRODUCTS: readonly Product[] = [
  { id: 'keyboard', name: '機械鍵盤', price: 3290 },
  { id: 'mouse', name: '無線滑鼠', price: 1290 },
  { id: 'monitor', name: '27 吋螢幕', price: 7990 },
  { id: 'hub', name: 'USB-C 集線器', price: 890 },
  { id: 'headphones', name: '降噪耳機', price: 5490 },
  { id: 'stand', name: '筆電支架', price: 1190 },
  { id: 'webcam', name: '網路攝影機', price: 2190 },
  { id: 'microphone', name: '桌上型麥克風', price: 3490 },
]

/** mock 後端的預設庫存 */
export const DEFAULT_STOCK: Readonly<Record<string, number>> = {
  keyboard: 10,
  mouse: 5,
  monitor: 3,
  hub: 1,
  headphones: 8,
  stand: 2,
  webcam: 6,
  microphone: 4,
}

const productsById = new Map(PRODUCTS.map((product) => [product.id, product]))

export function findProduct(id: string): Product | undefined {
  return productsById.get(id)
}

export function isKnownProduct(id: string): boolean {
  return productsById.has(id)
}
