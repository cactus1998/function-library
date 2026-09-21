import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEDULE } from '../data/schedule'
import { createMockBookingApi, seedBookings, type BookingApiSettings } from '../services/mockBookingApi'
import { BookingConflictError, type BookingInput } from '../types'
import { h } from './helpers'

function setup(settings: Partial<BookingApiSettings> = {}) {
  const state: BookingApiSettings = { failureRate: 0, forceConflict: false, ...settings }
  const api = createMockBookingApi({ schedule: SCHEDULE, settings: state, fetchLatency: [100, 100], createLatency: [100, 100] })
  return { api, state }
}

const input = (start: number, date = '2026-09-23'): BookingInput => ({
  serviceId: 'wash-cut',
  date,
  start,
  name: '王小明',
  phone: '0912345678',
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('seedBookings', () => {
  it('is deterministic and stays inside opening hours', () => {
    const first = seedBookings('2026-09-23', SCHEDULE)
    expect(seedBookings('2026-09-23', SCHEDULE)).toEqual(first)
    for (const booking of first) {
      const inside =
        (booking.start >= h(11) && booking.end <= h(13)) || (booking.start >= h(14) && booking.end <= h(20))
      expect(inside).toBe(true)
    }
  })

  it('creates nothing on closed days', () => {
    expect(seedBookings('2026-09-28', SCHEDULE)).toEqual([])
    expect(seedBookings('2026-09-25', SCHEDULE)).toEqual([])
  })
})

describe('createMockBookingApi', () => {
  it('returns only bookings of the requested month after the latency', async () => {
    const { api } = setup()
    const promise = api.fetchBookings('2026-09', new AbortController().signal)
    await vi.advanceTimersByTimeAsync(100)
    const bookings = await promise
    expect(bookings.length).toBeGreaterThan(0)
    expect(bookings.every((booking) => booking.date.startsWith('2026-09'))).toBe(true)
  })

  it('rejects with AbortError when the request is aborted', async () => {
    const { api } = setup()
    const controller = new AbortController()
    const promise = api.fetchBookings('2026-09', controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fails according to the failure rate', async () => {
    const { api } = setup({ failureRate: 1 })
    const promise = api.fetchBookings('2026-09', new AbortController().signal)
    const assertion = expect(promise).rejects.toThrow('503')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })

  it('rejects an overlapping booking with 409 and accepts an adjacent one', async () => {
    const { api } = setup()
    const signal = new AbortController().signal
    // 找一天 14:00–16:00 沒有種子預約的營業日，結果才不受種子資料影響
    const start = h(14)
    const date = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-26', '2026-09-27', '2026-09-29', '2026-09-30'].find(
      (d) => !seedBookings(d, SCHEDULE).some((b) => b.start < start + 120 && start < b.end),
    )!
    expect(date).toBeDefined()

    const first = api.createBooking(input(start, date), signal)
    await vi.advanceTimersByTimeAsync(100)
    expect(await first).toMatchObject({ date, start, end: start + 60, phone: '0912345678' })

    const overlapping = api.createBooking(input(start + 30, date), signal)
    const assertion = expect(overlapping).rejects.toBeInstanceOf(BookingConflictError)
    await vi.advanceTimersByTimeAsync(100)
    await assertion

    const adjacent = api.createBooking(input(start + 60, date), signal)
    await vi.advanceTimersByTimeAsync(100)
    await expect(adjacent).resolves.toMatchObject({ start: start + 60 })
  })

  it('simulates someone else taking the slot once when forceConflict is on', async () => {
    const { api, state } = setup({ forceConflict: true })
    const promise = api.createBooking(input(h(19)), new AbortController().signal)
    const assertion = expect(promise).rejects.toMatchObject({ status: 409 })
    await vi.advanceTimersByTimeAsync(100)
    await assertion
    expect(state.forceConflict).toBe(false)
    const month = api.fetchBookings('2026-09', new AbortController().signal)
    await vi.advanceTimersByTimeAsync(100)
    expect((await month).some((b) => b.date === '2026-09-23' && b.start === h(19))).toBe(true)
  })
})
