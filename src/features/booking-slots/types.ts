/** 'YYYY-MM-DD'，不帶時區的日曆日期；避免 new Date('2026-09-21') 被當成 UTC 午夜 */
export type PlainDate = string
/** 'YYYY-MM' */
export type YearMonth = string
/** 當日經過的分鐘數，0–1440 */
export type Minutes = number

export type ServiceId = 'cut' | 'wash-cut' | 'color' | 'perm'

export interface Service {
  id: ServiceId
  name: string
  duration: Minutes
  price: number
}

/** 營業區間 [start, end)，午休以兩段區間表示 */
export interface OpenRange {
  start: Minutes
  end: Minutes
}

export interface DateException {
  /** 空陣列表示公休 */
  ranges: OpenRange[]
  note: string
}

export interface Schedule {
  timeZone: string
  slotStep: Minutes
  /** 最短提前預約時間 */
  leadTime: Minutes
  /** 可預約天數（含今天） */
  bookingDays: number
  /** 以 weekday（0 = 週日）為索引，空陣列表示公休 */
  weekly: OpenRange[][]
  /** 例外日覆蓋週規則 */
  exceptions: Record<PlainDate, DateException>
}

export interface Booking {
  id: string
  date: PlainDate
  start: Minutes
  end: Minutes
}

export interface Slot {
  date: PlainDate
  start: Minutes
  end: Minutes
}

export type DayStatus = 'closed' | 'past' | 'full' | 'available'

export interface DayInfo {
  status: DayStatus
  /** 可用時段數，只有 available 大於 0 */
  count: number
  note?: string
}

/** 以店家時區表示的某個時間點 */
export interface ZonedTime {
  date: PlainDate
  minutes: Minutes
}

export interface BookingInput {
  serviceId: ServiceId
  date: PlainDate
  start: Minutes
  name: string
  phone: string
}

export interface ConfirmedBooking extends Booking {
  serviceId: ServiceId
  name: string
  phone: string
  /** 給客人看的預約編號 */
  code: string
}

export interface BookingApi {
  fetchBookings(month: YearMonth, signal: AbortSignal): Promise<Booking[]>
  createBooking(input: BookingInput, signal: AbortSignal): Promise<ConfirmedBooking>
}

/** 時段在送出前已被其他人預約 */
export class BookingConflictError extends Error {
  readonly status = 409
  constructor(message = '這個時段剛被預約走了') {
    super(message)
    this.name = 'BookingConflictError'
  }
}
