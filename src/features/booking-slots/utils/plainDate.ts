import type { PlainDate, YearMonth } from '../types'

const DAY_MS = 86_400_000
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

/** 以 UTC 午夜作為計算基準，所有日期運算都不受執行環境時區影響 */
export function toUtcMs(date: PlainDate): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y!, m! - 1, d!)
}

export function fromUtcMs(ms: number): PlainDate {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function isPlainDate(value: unknown): value is PlainDate {
  if (typeof value !== 'string' || !PLAIN_DATE.test(value)) return false
  // 2026-02-30 會被 Date.UTC 進位成 3/2，來回轉換不一致即為非法
  return fromUtcMs(toUtcMs(value)) === value
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS)
}

export function diffDays(from: PlainDate, to: PlainDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS)
}

/** 0 = 週日 */
export function weekday(date: PlainDate): number {
  return new Date(toUtcMs(date)).getUTCDay()
}

export function monthOf(date: PlainDate): YearMonth {
  return date.slice(0, 7)
}

export function firstOfMonth(month: YearMonth): PlainDate {
  return `${month}-01`
}

export function daysInMonth(month: YearMonth): number {
  const [y, m] = month.split('-').map(Number)
  // 下個月第 0 天 = 本月最後一天
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate()
}

export function addMonthsToMonth(month: YearMonth, months: number): YearMonth {
  const [y, m] = month.split('-').map(Number)
  const index = y! * 12 + (m! - 1) + months
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`
}

/** 1/31 加一個月為 2/28（閏年 2/29），日期夾到目標月的月底 */
export function addMonths(date: PlainDate, months: number): PlainDate {
  const month = addMonthsToMonth(monthOf(date), months)
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(month))
  return `${month}-${pad(day)}`
}

export function startOfWeek(date: PlainDate): PlainDate {
  return addDays(date, -weekday(date))
}

export function endOfWeek(date: PlainDate): PlainDate {
  return addDays(date, 6 - weekday(date))
}

/** 固定 6 週 × 7 天，週日開頭，含前後月補位；高度固定，切換月份不跳版 */
export function monthGrid(month: YearMonth): PlainDate[][] {
  const start = startOfWeek(firstOfMonth(month))
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)))
}

export function clampDate(date: PlainDate, min: PlainDate, max: PlainDate): PlainDate {
  if (date < min) return min
  if (date > max) return max
  return date
}
