import type { DataIssue, NewsItem } from '../types'
import { isPlainDate, isSafeUrl } from './html'

export const TITLE_MAX = 60
export const SUMMARY_MAX = 120

/** 依交接文件檢查資料；error 代表會被替換成預設值，warning 代表畫面會截斷 */
export function validateNews(items: readonly NewsItem[]): DataIssue[] {
  const issues: DataIssue[] = []
  const push = (item: NewsItem, field: keyof NewsItem, level: DataIssue['level'], message: string) =>
    issues.push({ itemId: item.id, field, level, message })

  for (const item of items) {
    if (item.title.trim() === '') push(item, 'title', 'error', '標題為空，顯示「（未命名）」')
    else if (item.title.length > TITLE_MAX) push(item, 'title', 'warning', `標題 ${item.title.length} 字，超過 ${TITLE_MAX} 字，畫面只顯示兩行`)
    if (/[<>]/.test(item.title)) push(item, 'title', 'warning', '標題含有 HTML 字元，已跳脫為純文字')

    if (!isSafeUrl(item.url, 'link')) push(item, 'url', 'error', `網址「${item.url}」不是 http(s) 或站內路徑，已改為 #`)
    if (!isPlainDate(item.publishedAt)) push(item, 'publishedAt', 'error', `日期「${item.publishedAt}」不是 YYYY-MM-DD，不顯示日期`)

    if (item.summary && item.summary.length > SUMMARY_MAX) {
      push(item, 'summary', 'warning', `摘要 ${item.summary.length} 字，超過 ${SUMMARY_MAX} 字，畫面只顯示三行`)
    }
    if (item.imageUrl !== undefined && !isSafeUrl(item.imageUrl, 'image')) {
      push(item, 'imageUrl', 'error', '圖片網址格式不正確，改用預設底圖')
    }
  }
  return issues
}
