import { describe, expect, it } from 'vitest'
import { SCHEDULE } from '../data/schedule'
import type { Booking, ConfirmedBooking, Schedule, ZonedTime } from '../types'
import { formatDay, formatFullDay, formatMinutes, formatMonth } from '../utils/format'
import { buildIcs, escapeIcsText, formatIcsUtc } from '../utils/ics'
import { normalizePhone, validateName, validatePhone } from '../utils/phone'
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  endOfWeek,
  isPlainDate,
  monthGrid,
  startOfWeek,
  weekday,
} from '../utils/plainDate'
import { computeSlots, dayInfo, earliestStart, groupSlots, nextAvailableDate, overlaps } from '../utils/slots'
import { offsetMinutes, zonedTime, zonedToEpoch } from '../utils/timeZone'
import { booking, h, taipei } from './helpers'

const MORNING: ZonedTime = { date: '2026-09-23', minutes: h(8) }
const starts = (list: { start: number }[]) => list.map((slot) => formatMinutes(slot.start))

function slotsOn(date: string, duration: number, now: ZonedTime = MORNING, bookings: Booking[] = []) {
  return computeSlots({ date, duration, schedule: SCHEDULE, bookings, now })
}

describe('plainDate', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-09-23', '2026-10-01')).toBe(8)
  })

  it('clamps to the end of month when adding months (EC-07)', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
  })

  it('computes weekday, week bounds and month length', () => {
    expect(weekday('2026-09-23')).toBe(3)
    expect(startOfWeek('2026-09-23')).toBe('2026-09-20')
    expect(endOfWeek('2026-09-23')).toBe('2026-09-26')
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
  })

  it('builds a fixed 6-week grid starting on Sunday with padding days', () => {
    const grid = monthGrid('2026-09')
    expect(grid).toHaveLength(6)
    expect(grid.every((week) => week.length === 7)).toBe(true)
    expect(grid[0]![0]).toBe('2026-08-30')
    expect(grid[5]![6]).toBe('2026-10-10')
  })

  it('rejects malformed or impossible dates', () => {
    expect(isPlainDate('2026-09-23')).toBe(true)
    expect(isPlainDate('2026-02-30')).toBe(false)
    expect(isPlainDate('2026-9-3')).toBe(false)
    expect(isPlainDate(20260923)).toBe(false)
  })
})

describe('timeZone', () => {
  it('converts Taipei wall time to UTC and back (AC-09)', () => {
    const epoch = taipei('2026-09-23', h(14))
    expect(new Date(epoch).toISOString()).toBe('2026-09-23T06:00:00.000Z')
    expect(zonedTime(epoch, 'Asia/Taipei')).toEqual({ date: '2026-09-23', minutes: h(14) })
    expect(offsetMinutes(epoch, 'Asia/Taipei')).toBe(480)
  })

  it('shows the previous day in Los Angeles for a Taipei afternoon (EC-18)', () => {
    expect(zonedTime(taipei('2026-09-23', h(14)), 'America/Los_Angeles')).toEqual({ date: '2026-09-22', minutes: h(23) })
  })

  it('returns null for a wall time skipped by DST and one instant for a repeated one (EC-21)', () => {
    expect(zonedToEpoch('2026-03-08', h(2, 30), 'America/New_York')).toBeNull()
    const repeated = zonedToEpoch('2026-11-01', h(1, 30), 'America/New_York')
    expect(repeated).not.toBeNull()
    expect(zonedTime(repeated!, 'America/New_York')).toEqual({ date: '2026-11-01', minutes: h(1, 30) })
    // 正常時間在 DST 前後都能來回轉換
    expect(new Date(zonedToEpoch('2026-11-01', h(12), 'America/New_York')!).toISOString()).toBe('2026-11-01T17:00:00.000Z')
    expect(new Date(zonedToEpoch('2026-10-31', h(12), 'America/New_York')!).toISOString()).toBe('2026-10-31T16:00:00.000Z')
  })
})

describe('computeSlots', () => {
  it('only offers afternoon slots for a 150-minute perm on a weekday (AC-01)', () => {
    expect(starts(slotsOn('2026-09-23', 150))).toEqual(['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'])
  })

  it('never lets a service overlap the lunch break (EC-01)', () => {
    const list = starts(slotsOn('2026-09-23', 60))
    expect(list).toContain('12:00')
    expect(list).not.toContain('12:30')
    expect(list).not.toContain('13:00')
    expect(list).not.toContain('13:30')
    expect(list).toContain('14:00')
  })

  it('ends the last slot exactly at closing time (EC-02)', () => {
    const weekday = slotsOn('2026-09-23', 120)
    expect(weekday.at(-1)).toMatchObject({ start: h(18), end: h(20) })
    const weekend = slotsOn('2026-09-26', 120)
    expect(weekend.at(-1)).toMatchObject({ start: h(17), end: h(19) })
  })

  it('rounds the 2-hour lead time up to the next 30-minute step (AC-02, EC-03)', () => {
    const now = { date: '2026-09-23', minutes: h(15, 10) }
    expect(earliestStart('2026-09-23', now, SCHEDULE)).toBe(h(17, 30))
    expect(slotsOn('2026-09-23', 30, now)[0]).toMatchObject({ start: h(17, 30) })
  })

  it('carries a lead time that crosses midnight into the next day (EC-04)', () => {
    const now = { date: '2026-09-22', minutes: h(22, 30) }
    expect(slotsOn('2026-09-22', 30, now)).toEqual([])
    expect(dayInfo({ date: '2026-09-22', duration: 30, schedule: SCHEDULE, bookings: [], now }).status).toBe('full')
    expect(earliestStart('2026-09-23', now, SCHEDULE)).toBe(30)
    expect(slotsOn('2026-09-23', 30, now)[0]).toMatchObject({ start: h(11) })
  })

  it('applies date exceptions over the weekly rules (EC-05)', () => {
    expect(dayInfo({ date: '2026-09-25', duration: 30, schedule: SCHEDULE, bookings: [], now: MORNING })).toEqual({
      status: 'closed',
      count: 0,
      note: '中秋節公休',
    })
    // 10/9 週五提早到 16:00 打烊
    expect(slotsOn('2026-10-09', 60).at(-1)).toMatchObject({ start: h(15), end: h(16) })
  })

  it('treats partial overlaps as taken but adjacent bookings as free (EC-06)', () => {
    expect(overlaps({ start: h(14, 30), end: h(15, 30) }, { start: h(15), end: h(16) })).toBe(true)
    expect(overlaps({ start: h(14), end: h(15) }, { start: h(15), end: h(16) })).toBe(false)
    const list = starts(slotsOn('2026-09-23', 60, MORNING, [booking('2026-09-23', h(15), h(16))]))
    expect(list).toContain('14:00')
    expect(list).not.toContain('14:30')
    expect(list).not.toContain('15:00')
    expect(list).not.toContain('15:30')
    expect(list).toContain('16:00')
  })

  it('returns nothing outside the booking window', () => {
    expect(slotsOn('2026-09-22', 30)).toEqual([])
    expect(slotsOn('2026-10-23', 30)).toEqual([])
    expect(slotsOn('2026-10-22', 30).length).toBeGreaterThan(0)
  })

  it('reports day status for closed, past, full and available days (AC-03)', () => {
    const query = { duration: 60, schedule: SCHEDULE, now: MORNING }
    expect(dayInfo({ ...query, date: '2026-09-28', bookings: [] })).toMatchObject({ status: 'closed', count: 0 })
    expect(dayInfo({ ...query, date: '2026-09-22', bookings: [] })).toMatchObject({ status: 'past' })
    const fullDay = [booking('2026-09-24', h(11), h(13)), booking('2026-09-24', h(14), h(20))]
    expect(dayInfo({ ...query, date: '2026-09-24', bookings: fullDay })).toMatchObject({ status: 'full', count: 0 })
    expect(dayInfo({ ...query, date: '2026-09-23', bookings: [] })).toMatchObject({ status: 'available', count: 14 })
  })

  it('groups slots into morning, afternoon and evening', () => {
    const groups = groupSlots(slotsOn('2026-09-23', 120))
    expect(starts(groups.morning)).toEqual(['11:00'])
    expect(starts(groups.afternoon)[0]).toBe('14:00')
    expect(starts(groups.evening)).toEqual(['18:00'])
  })
})

describe('nextAvailableDate', () => {
  const query = { duration: 60, schedule: SCHEDULE, now: MORNING }

  it('skips closed and fully booked days (EC-15)', () => {
    const full = [booking('2026-09-24', h(11), h(13)), booking('2026-09-24', h(14), h(20))]
    // 9/25 中秋節公休，9/24 約滿
    expect(nextAvailableDate('2026-09-23', query, () => full)).toBe('2026-09-26')
  })

  it('treats days in unloaded months as candidates', () => {
    const everythingFull = (date: string) => (date.startsWith('2026-09') ? [booking(date, 0, 1440)] : undefined)
    expect(nextAvailableDate('2026-09-23', query, everythingFull)).toBe('2026-10-01')
  })

  it('returns null when every day in the window is full (EC-15)', () => {
    expect(nextAvailableDate('2026-09-23', query, (date) => [booking(date, 0, 1440)])).toBeNull()
  })
})

describe('phone and name validation', () => {
  it('normalizes Taiwanese mobile numbers (EC-16)', () => {
    expect(normalizePhone('0912-345-678')).toBe('0912345678')
    expect(normalizePhone(' 0912 345 678 ')).toBe('0912345678')
    expect(normalizePhone('+886912345678')).toBe('0912345678')
    expect(normalizePhone('+886-912-345-678')).toBe('0912345678')
    expect(normalizePhone('0212345678')).toBeNull()
    expect(normalizePhone('091234567')).toBeNull()
    expect(validatePhone('')).toBe('請輸入手機號碼')
    expect(validatePhone('0212345678')).toMatch(/09 開頭/)
  })

  it('rejects blank names and names longer than 20 characters (EC-17)', () => {
    expect(validateName('   ')).toBe('請輸入姓名')
    expect(validateName('王'.repeat(21))).toMatch(/最多 20/)
    expect(validateName(` ${'王'.repeat(20)} `)).toBeNull()
    // emoji 算一個字
    expect(validateName('😀'.repeat(20))).toBeNull()
  })
})

describe('ics', () => {
  const confirmed: ConfirmedBooking = {
    id: 'bk-1',
    date: '2026-09-23',
    start: h(14),
    end: h(16),
    serviceId: 'color',
    name: '王小明',
    phone: '0912345678',
    code: 'A10010923',
  }

  it('writes start and end in UTC (AC-09)', () => {
    const ics = buildIcs(confirmed, SCHEDULE, { summary: '髮廊預約：染髮', location: '店', stamp: Date.UTC(2026, 8, 21) })
    expect(ics).toContain('DTSTART:20260923T060000Z')
    expect(ics).toContain('DTEND:20260923T080000Z')
    expect(ics).toContain('DTSTAMP:20260921T000000Z')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  it('escapes special characters in text fields', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    expect(formatIcsUtc(Date.UTC(2026, 0, 2, 3, 4, 5))).toBe('20260102T030405Z')
  })

  it('refuses a booking time that does not exist in the shop time zone', () => {
    const schedule: Schedule = { ...SCHEDULE, timeZone: 'America/New_York' }
    const gap = { ...confirmed, date: '2026-03-08', start: h(2, 30), end: h(3, 30) }
    expect(() => buildIcs(gap, schedule, { summary: '', location: '', stamp: 0 })).toThrow()
  })
})

describe('format', () => {
  it('formats dates in zh-TW regardless of the runtime time zone', () => {
    expect(formatDay('2026-09-23')).toBe('9月23日 星期三')
    expect(formatFullDay('2026-09-23')).toBe('2026年9月23日 週三')
    expect(formatMonth('2026-10')).toBe('2026年10月')
    expect(formatMinutes(h(9, 5))).toBe('09:05')
  })
})
