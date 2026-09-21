import { vi } from 'vitest'
import { effectScope } from 'vue'
import type { Booking, BookingApi, BookingInput, ConfirmedBooking, Minutes, PlainDate, YearMonth } from '../types'
import { zonedToEpoch } from '../utils/timeZone'

/** 在 effect scope 中執行 composable，回傳結果與 stop（模擬元件 unmount） */
export function withScope<T>(factory: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)!
  return { result, stop: () => scope.stop() }
}

export const h = (hours: number, minutes = 0): Minutes => hours * 60 + minutes

/** 台北時間的某一刻（epoch ms） */
export function taipei(date: PlainDate, minutes: Minutes): number {
  return zonedToEpoch(date, minutes, 'Asia/Taipei')!
}

export function booking(date: PlainDate, start: Minutes, end: Minutes): Booking {
  return { id: `b-${date}-${start}`, date, start, end }
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export interface FetchCall {
  month: YearMonth
  signal: AbortSignal
  request: Deferred<Booking[]>
}

export interface CreateCall {
  input: BookingInput
  signal: AbortSignal
  request: Deferred<ConfirmedBooking>
}

/**
 * 可控的假 API：預設立即回傳 bookings 中屬於該月的預約；
 * manual 為 true 時請求停在 pending，由測試決定何時、以什麼順序回應。
 */
export function createFakeApi(options: { bookings?: Booking[]; manual?: boolean } = {}) {
  const bookings = options.bookings ?? []
  const fetchCalls: FetchCall[] = []
  const createCalls: CreateCall[] = []

  const api: BookingApi = {
    fetchBookings: vi.fn((month: YearMonth, signal: AbortSignal) => {
      const request = deferred<Booking[]>()
      fetchCalls.push({ month, signal, request })
      if (!options.manual) request.resolve(bookings.filter((b) => b.date.startsWith(month)).map((b) => ({ ...b })))
      return request.promise
    }),
    createBooking: vi.fn((input: BookingInput, signal: AbortSignal) => {
      const request = deferred<ConfirmedBooking>()
      createCalls.push({ input, signal, request })
      return request.promise
    }),
  }

  return { api, fetchCalls, createCalls }
}

export function confirmedFrom(input: BookingInput, duration: Minutes): ConfirmedBooking {
  return {
    id: 'bk-1',
    date: input.date,
    start: input.start,
    end: input.start + duration,
    serviceId: input.serviceId,
    name: input.name,
    phone: input.phone,
    code: 'A10010923',
  }
}
