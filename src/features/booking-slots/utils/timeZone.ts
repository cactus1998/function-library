import type { Minutes, PlainDate, ZonedTime } from '../types'
import { fromUtcMs, toUtcMs } from './plainDate'

const MINUTE_MS = 60_000
const formatters = new Map<string, Intl.DateTimeFormat>()

/** Intl.DateTimeFormat 建立成本高，每個時區只建一次 */
function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })
    formatters.set(timeZone, format)
  }
  return format
}

/** 某個時間點在指定時區的日期與當日分鐘數 */
export function zonedTime(epochMs: number, timeZone: string): ZonedTime {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {}
  for (const part of formatter(timeZone).formatToParts(epochMs)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  const date = fromUtcMs(Date.UTC(values.year ?? 1970, (values.month ?? 1) - 1, values.day ?? 1))
  // 部分引擎在午夜輸出 24
  const hour = (values.hour ?? 0) % 24
  return { date, minutes: hour * 60 + (values.minute ?? 0) }
}

/** 指定時區相對 UTC 的偏移（分鐘），台北為 +480 */
export function offsetMinutes(epochMs: number, timeZone: string): number {
  const { date, minutes } = zonedTime(epochMs, timeZone)
  const wallAsUtc = toUtcMs(date) + minutes * MINUTE_MS
  return Math.round((wallAsUtc - Math.floor(epochMs / MINUTE_MS) * MINUTE_MS) / MINUTE_MS)
}

/**
 * 把「某時區的牆上時間」轉成 epoch ms。
 * 先用「把牆上時間當成 UTC」那一刻的偏移推算，再以推算出的時間點的偏移修正一次，處理 DST 前後偏移不同的情況。
 * - DST 缺口（例如紐約 3 月的 02:30 不存在）：來回轉換對不上，回傳 null。
 * - DST 重疊（例如紐約 11 月的 01:30 出現兩次）：只回傳其中一個時間點，不會重複產生。
 */
export function zonedToEpoch(date: PlainDate, minutes: Minutes, timeZone: string): number | null {
  const wall = toUtcMs(date) + minutes * MINUTE_MS
  const first = offsetMinutes(wall, timeZone)
  let epoch = wall - first * MINUTE_MS
  const second = offsetMinutes(epoch, timeZone)
  if (second !== first) epoch = wall - second * MINUTE_MS
  const back = zonedTime(epoch, timeZone)
  const expected = zonedTime(wall, 'UTC')
  if (back.date !== expected.date || back.minutes !== expected.minutes) return null
  return epoch
}

export function localTimeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone
}
