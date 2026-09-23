const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** 文字與屬性值都適用：五個字元都跳脫，屬性一律用雙引號包住 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch]!)
}

export type UrlKind = 'link' | 'image'

/**
 * 只允許站內相對路徑與 http(s)；圖片另外允許 data:image/。
 * javascript:、vbscript: 等協定一律擋下，跳脫字元無法防住這類攻擊。
 */
export function isSafeUrl(url: string, kind: UrlKind): boolean {
  const value = url.trim()
  if (value === '') return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  if (value.startsWith('#')) return kind === 'link'
  if (kind === 'image' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(value)) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function isPlainDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

/** 日期字串視為 UTC 午夜並以 UTC 格式化，避免時區讓日期差一天 */
const dateFormat = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
})

export function formatDate(value: string): string {
  return dateFormat.format(new Date(`${value}T00:00:00Z`))
}
