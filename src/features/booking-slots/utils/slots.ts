import type { Booking, DayInfo, Minutes, OpenRange, PlainDate, Schedule, Slot, ZonedTime } from '../types'
import { addDays, diffDays, weekday } from './plainDate'

export function openRangesFor(date: PlainDate, schedule: Schedule): OpenRange[] {
  return schedule.exceptions[date]?.ranges ?? schedule.weekly[weekday(date)] ?? []
}

/** 可預約範圍：今天起 bookingDays 天（含今天） */
export function bookingWindow(now: ZonedTime, schedule: Schedule): { min: PlainDate; max: PlainDate } {
  return { min: now.date, max: addDays(now.date, schedule.bookingDays - 1) }
}

/**
 * 某天最早可開始的分鐘數（依最短提前時間，無條件進位到時段粒度）。
 * 提前時間可能跨日：22:30 加 2 小時為隔天 00:30，因此以「與今天相差的天數」換算。
 */
export function earliestStart(date: PlainDate, now: ZonedTime, schedule: Schedule): Minutes {
  const threshold = now.minutes + schedule.leadTime - diffDays(now.date, date) * 1440
  if (threshold <= 0) return 0
  return Math.ceil(threshold / schedule.slotStep) * schedule.slotStep
}

/** 半開區間 [a, b) 與 [c, d) 相交；相鄰（b === c）不算重疊 */
export function overlaps(a: { start: Minutes; end: Minutes }, b: { start: Minutes; end: Minutes }): boolean {
  return a.start < b.end && b.start < a.end
}

export interface SlotQuery {
  date: PlainDate
  duration: Minutes
  schedule: Schedule
  bookings: readonly Booking[]
  now: ZonedTime
}

export function computeSlots({ date, duration, schedule, bookings, now }: SlotQuery): Slot[] {
  const { min, max } = bookingWindow(now, schedule)
  if (date < min || date > max) return []
  const earliest = earliestStart(date, now, schedule)
  const step = schedule.slotStep
  const slots: Slot[] = []
  for (const range of openRangesFor(date, schedule)) {
    // 服務必須完整落在同一段營業區間內：不跨午休、不超過打烊
    const first = Math.max(Math.ceil(range.start / step) * step, earliest)
    for (let start = first; start + duration <= range.end; start += step) {
      const slot = { date, start, end: start + duration }
      if (!bookings.some((booking) => booking.date === date && overlaps(slot, booking))) slots.push(slot)
    }
  }
  return slots
}

export function dayInfo(query: SlotQuery): DayInfo {
  const { date, schedule, now } = query
  const note = schedule.exceptions[date]?.note
  const { min, max } = bookingWindow(now, schedule)
  if (date < min || date > max) return { status: 'past', count: 0, note }
  if (openRangesFor(date, schedule).length === 0) return { status: 'closed', count: 0, note }
  const count = computeSlots(query).length
  return { status: count > 0 ? 'available' : 'full', count, note }
}

/**
 * 從 from 的隔天開始找第一個有空的日期。
 * getBookings 回傳 undefined 代表該月還沒載入：先當作可能有空，使用者跳過去時再載入確認。
 */
export function nextAvailableDate(
  from: PlainDate,
  query: Omit<SlotQuery, 'date' | 'bookings'>,
  getBookings: (date: PlainDate) => readonly Booking[] | undefined,
): PlainDate | null {
  const { max } = bookingWindow(query.now, query.schedule)
  for (let date = addDays(from, 1); date <= max; date = addDays(date, 1)) {
    if (openRangesFor(date, query.schedule).length === 0) continue
    const bookings = getBookings(date)
    if (!bookings || computeSlots({ ...query, date, bookings }).length > 0) return date
  }
  return null
}

export type DayPart = 'morning' | 'afternoon' | 'evening'

export function dayPartOf(start: Minutes): DayPart {
  if (start < 12 * 60) return 'morning'
  if (start < 18 * 60) return 'afternoon'
  return 'evening'
}

export function groupSlots<T extends { start: Minutes }>(slots: readonly T[]): Record<DayPart, T[]> {
  const groups: Record<DayPart, T[]> = { morning: [], afternoon: [], evening: [] }
  for (const slot of slots) groups[dayPartOf(slot.start)].push(slot)
  return groups
}
