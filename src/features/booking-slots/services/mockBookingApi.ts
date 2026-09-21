import { findService } from '../data/services'
import {
  BookingConflictError,
  type Booking,
  type BookingApi,
  type ConfirmedBooking,
  type PlainDate,
  type Schedule,
  type YearMonth,
} from '../types'
import { addDays, daysInMonth, firstOfMonth } from '../utils/plainDate'
import { openRangesFor, overlaps } from '../utils/slots'

export const FAILURE_RATE_MAX = 0.5
export const DEFAULT_FAILURE_RATE = 0.1

/** Demo 控制面板直接修改這個物件（呼叫端可傳入 reactive 物件） */
export interface BookingApiSettings {
  failureRate: number
  /** 下一次送出時，模擬「別人搶先一步」：先寫入一筆佔用該時段的預約，再回 409 */
  forceConflict: boolean
}

export interface MockBookingApiOptions {
  schedule: Schedule
  settings?: BookingApiSettings
  random?: () => number
  fetchLatency?: readonly [number, number]
  createLatency?: readonly [number, number]
}

/** FNV-1a：把日期字串雜湊成 32-bit 種子 */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32：同一個種子永遠產生同一串亂數，種子資料因此可重現 */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 依日期產生固定的既有預約：約 1/7 的營業日整天約滿，其他日子隨機佔用約 40% 的時段。
 * 與「現在時間」無關，切換模擬時間時資料不變。
 */
export function seedBookings(date: PlainDate, schedule: Schedule): Booking[] {
  const seed = hash(date)
  const random = seededRandom(seed)
  const fullDay = seed % 7 === 0
  const bookings: Booking[] = []
  for (const range of openRangesFor(date, schedule)) {
    if (fullDay) {
      bookings.push({ id: `seed-${date}-${range.start}`, date, start: range.start, end: range.end })
      continue
    }
    let start = range.start
    while (start + schedule.slotStep <= range.end) {
      if (random() < 0.3) {
        const duration = Math.min(range.end - start, [30, 60, 90][Math.floor(random() * 3)]!)
        bookings.push({ id: `seed-${date}-${start}`, date, start, end: start + duration })
        start += duration
      } else {
        start += schedule.slotStep
      }
    }
  }
  return bookings
}

function abortError(): DOMException {
  return new DOMException('The request was aborted', 'AbortError')
}

/** 模擬網路延遲；signal abort 時立即以 AbortError reject 並清掉計時器 */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError())
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function createMockBookingApi(options: MockBookingApiOptions): BookingApi {
  const { schedule } = options
  const settings = options.settings ?? { failureRate: DEFAULT_FAILURE_RATE, forceConflict: false }
  const random = options.random ?? Math.random
  const [fetchMin, fetchMax] = options.fetchLatency ?? [300, 800]
  const [createMin, createMax] = options.createLatency ?? [500, 1000]
  /** 伺服器端資料：種子預約在第一次讀到該日時產生，之後與新增的預約一起保存 */
  const byDate = new Map<PlainDate, Booking[]>()
  let sequence = 0

  function bookingsOn(date: PlainDate): Booking[] {
    let list = byDate.get(date)
    if (!list) {
      list = seedBookings(date, schedule)
      byDate.set(date, list)
    }
    return list
  }

  const latency = (min: number, max: number) => min + (max - min) * random()

  return {
    async fetchBookings(month: YearMonth, signal: AbortSignal) {
      await delay(latency(fetchMin, fetchMax), signal)
      if (random() < settings.failureRate) throw new Error('模擬伺服器錯誤（503）')
      const result: Booking[] = []
      const first = firstOfMonth(month)
      for (let i = 0; i < daysInMonth(month); i++) {
        // 回傳複本，避免呼叫端改到伺服器資料
        for (const booking of bookingsOn(addDays(first, i))) result.push({ ...booking })
      }
      return result
    },

    async createBooking(input, signal) {
      await delay(latency(createMin, createMax), signal)
      const service = findService(input.serviceId)
      const slot = { start: input.start, end: input.start + service.duration }
      const list = bookingsOn(input.date)
      if (settings.forceConflict) {
        settings.forceConflict = false
        list.push({ id: `other-${++sequence}`, date: input.date, ...slot })
      }
      // 伺服器才是「誰先訂到」的依據：送出當下再檢查一次重疊
      if (list.some((booking) => overlaps(slot, booking))) throw new BookingConflictError()
      if (random() < settings.failureRate) throw new Error('模擬伺服器錯誤（503）')
      sequence += 1
      const confirmed: ConfirmedBooking = {
        id: `bk-${Date.now().toString(36)}-${sequence}`,
        date: input.date,
        ...slot,
        serviceId: input.serviceId,
        name: input.name,
        phone: input.phone,
        code: `A${String(1000 + sequence).slice(-4)}${input.date.slice(5).replace('-', '')}`,
      }
      list.push({ id: confirmed.id, date: confirmed.date, start: confirmed.start, end: confirmed.end })
      return { ...confirmed }
    },
  }
}
