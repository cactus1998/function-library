import type { OpenRange, Schedule } from '../types'

const h = (hours: number, minutes = 0) => hours * 60 + minutes

/** 午休 13:00–14:00，以兩段區間表示，服務自然不會跨越午休 */
const weekday: OpenRange[] = [
  { start: h(11), end: h(13) },
  { start: h(14), end: h(20) },
]
const weekend: OpenRange[] = [
  { start: h(10), end: h(13) },
  { start: h(14), end: h(19) },
]

export const SCHEDULE: Schedule = {
  timeZone: 'Asia/Taipei',
  slotStep: 30,
  leadTime: 120,
  bookingDays: 30,
  // 週日、週一（公休）、週二 … 週六
  weekly: [weekend, [], weekday, weekday, weekday, weekday, weekend],
  exceptions: {
    '2026-09-25': { ranges: [], note: '中秋節公休' },
    '2026-10-09': {
      ranges: [
        { start: h(11), end: h(13) },
        { start: h(14), end: h(16) },
      ],
      note: '連假前提早打烊',
    },
    '2026-10-10': { ranges: [], note: '國慶日公休' },
  },
}
