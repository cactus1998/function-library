import { computed, type MaybeRefOrGetter, toValue } from 'vue'

export const PAGE_SIZES = [10, 20, 30, 40, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 10

export type PageItem = number | 'ellipsis'

export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value)
}

export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, totalPages))
}

/**
 * 產生頁碼按鈕序列：固定顯示首頁、末頁與目前頁前後各 `siblings` 頁，
 * 其餘以省略號代替。總格數固定，切換頁碼時按鈕列寬度不會跳動；
 * 若省略號只會蓋掉一頁，直接顯示該頁，避免「1 … 3」這種情形。
 */
export function pageRange(current: number, totalPages: number, siblings = 1): PageItem[] {
  if (totalPages <= 0) return []
  // 首頁 + 末頁 + 目前頁 + 兩側 siblings + 兩個省略號
  const maxSlots = siblings * 2 + 5
  if (totalPages <= maxSlots) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const page = clampPage(current, totalPages)
  // 靠近頭尾時把中段窗格往內推，讓總格數維持 maxSlots
  const start = Math.max(Math.min(page - siblings, totalPages - siblings * 2 - 2), 3)
  const end = Math.min(Math.max(page + siblings, siblings * 2 + 3), totalPages - 2)
  const items: PageItem[] = [1, start > 3 ? 'ellipsis' : 2]
  for (let p = start; p <= end; p++) items.push(p)
  items.push(end < totalPages - 2 ? 'ellipsis' : totalPages - 1, totalPages)
  return items
}

export function usePagination<T>(
  items: MaybeRefOrGetter<readonly T[]>,
  page: MaybeRefOrGetter<number>,
  pageSize: MaybeRefOrGetter<number>,
) {
  const total = computed(() => toValue(items).length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / toValue(pageSize))))
  // 資料量變少（例如套用篩選）時，頁碼自動收回到有效範圍
  const currentPage = computed(() => clampPage(toValue(page), totalPages.value))
  const startIndex = computed(() => (currentPage.value - 1) * toValue(pageSize))
  const endIndex = computed(() => Math.min(startIndex.value + toValue(pageSize), total.value))
  const pageItems = computed(() => toValue(items).slice(startIndex.value, endIndex.value))

  return { total, totalPages, currentPage, startIndex, endIndex, pageItems }
}
