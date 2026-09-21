import type { Minutes, PlainDate, YearMonth } from '../types'
import { firstOfMonth, toUtcMs } from './plainDate'

const pad = (value: number) => String(value).padStart(2, '0')

export function formatMinutes(minutes: Minutes): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

// PlainDate 以 UTC 午夜表示，格式化時固定用 UTC，不受執行環境時區影響
const monthFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'UTC', year: 'numeric', month: 'long' })
const dayFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'long' })
const shortDayFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'UTC',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
})
const fullDayFormat = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})
const currency = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 })

/** 2026年10月 */
export const formatMonth = (month: YearMonth) => monthFormat.format(toUtcMs(firstOfMonth(month)))
/** 9月23日 星期三 */
export const formatDay = (date: PlainDate) => dayFormat.format(toUtcMs(date))
/** 9/23（週三） */
export const formatShortDay = (date: PlainDate) => shortDayFormat.format(toUtcMs(date))
/** 2026年9月23日 週三 */
export const formatFullDay = (date: PlainDate) => fullDayFormat.format(toUtcMs(date))
export const formatPrice = (price: number) => currency.format(price)

export function formatDuration(minutes: Minutes): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} 分鐘`
  return rest ? `${hours} 小時 ${rest} 分` : `${hours} 小時`
}
