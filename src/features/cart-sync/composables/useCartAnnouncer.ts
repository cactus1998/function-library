import { readonly, ref, shallowRef, watch } from 'vue'
import { findProduct } from '../data/products'
import type { CartStore } from '../stores/cart'
import type { CartLine, CartLines, Stamp } from '../types'
import { compareStamp } from '../utils/lww'
import { tabLabel } from '../utils/tab'

export const NOTICE_LIMIT = 3
/** 一次同步超過這個數量的遠端變更時，合併成一句宣告 */
const SUMMARY_THRESHOLD = 3

export interface CartNotice {
  id: number
  text: string
}

function stamps(lines: CartLines): Map<string, Stamp> {
  return new Map(Object.values(lines).map((line) => [line.productId, { clock: line.clock, tabId: line.tabId }]))
}

function productName(line: CartLine): string {
  return `『${findProduct(line.productId)?.name ?? line.productId}』`
}

export function describeCorrection(line: CartLine): string {
  return line.deleted
    ? `${productName(line)}已無庫存，已從購物車移除`
    : `${productName(line)}庫存不足，已調整為 ${line.qty} 件`
}

function describeRemote(line: CartLine): string {
  const who = tabLabel(line.tabId)
  return line.deleted ? `${who} 移除了${productName(line)}` : `${who} 將${productName(line)}改為 ${line.qty} 件`
}

/**
 * 比對每次變更前後的時間戳，找出不是本分頁使用者造成的變更：
 * 庫存修正顯示成通知，其他分頁的操作只給螢幕報讀器宣告，不移動焦點。
 */
export function useCartAnnouncer(store: CartStore) {
  const message = ref('')
  const notices = shallowRef<readonly CartNotice[]>([])
  let previous = stamps(store.lines)
  let nextId = 1

  watch(
    () => store.lines,
    (lines) => {
      const corrections: CartLine[] = []
      const remote: CartLine[] = []
      for (const line of Object.values(lines)) {
        const before = previous.get(line.productId)
        if (before && compareStamp(before, line) === 0) continue
        if (line.corrected) corrections.push(line)
        else if (line.tabId !== store.tabId) remote.push(line)
      }
      previous = stamps(lines)
      if (corrections.length === 0 && remote.length === 0) return

      const correctionTexts = corrections.map(describeCorrection)
      const remoteTexts =
        remote.length > SUMMARY_THRESHOLD ? [`已從其他分頁同步 ${remote.length} 項變更`] : remote.map(describeRemote)
      message.value = [...correctionTexts, ...remoteTexts].join('；')

      if (correctionTexts.length > 0) {
        const added = correctionTexts.map((text) => ({ id: nextId++, text }))
        notices.value = [...added, ...notices.value].slice(0, NOTICE_LIMIT)
      }
    },
  )

  function dismiss(id: number) {
    notices.value = notices.value.filter((notice) => notice.id !== id)
  }

  return { message: readonly(message), notices, dismiss }
}
