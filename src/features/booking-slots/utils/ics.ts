import type { ConfirmedBooking, Schedule } from '../types'
import { zonedToEpoch } from './timeZone'

/** 20260923T060000Z */
export function formatIcsUtc(epochMs: number): string {
  return new Date(epochMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** RFC 5545：反斜線、分號、逗號與換行需跳脫 */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export interface IcsOptions {
  summary: string
  location: string
  stamp: number
}

/** 時間一律以 UTC（Z）輸出，匯入任何時區的行事曆都會顯示正確的當地時間 */
export function buildIcs(booking: ConfirmedBooking, schedule: Schedule, options: IcsOptions): string {
  const start = zonedToEpoch(booking.date, booking.start, schedule.timeZone)
  const end = zonedToEpoch(booking.date, booking.end, schedule.timeZone)
  if (start === null || end === null) throw new Error('預約時間不存在於店家時區')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Function Library//Booking Slots//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@function-library.local`,
    `DTSTAMP:${formatIcsUtc(options.stamp)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(options.summary)}`,
    `LOCATION:${escapeIcsText(options.location)}`,
    `DESCRIPTION:${escapeIcsText(`預約編號 ${booking.code}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

/** 以 Blob 下載 .ics；object URL 用完立即釋放 */
export function downloadIcs(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
