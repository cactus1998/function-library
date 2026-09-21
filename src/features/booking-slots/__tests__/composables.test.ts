import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useBookingForm } from '../composables/useBookingForm'
import { useCalendarNav } from '../composables/useCalendarNav'
import { useMonthBookings } from '../composables/useMonthBookings'
import { useNow } from '../composables/useNow'
import { BookingConflictError, type Slot } from '../types'
import { booking, confirmedFrom, createFakeApi, h, withScope } from './helpers'

function key(name: string) {
  return new KeyboardEvent('keydown', { key: name, cancelable: true })
}

describe('useCalendarNav', () => {
  function setup(start: string, min = '2026-01-01', max = '2028-12-31') {
    const focused = ref(start)
    const nav = useCalendarNav(focused, ref(min), ref(max))
    const press = (name: string) => nav.onKeydown(key(name))
    return { focused, nav, press }
  }

  it('moves by day, week and within the week (AC-05)', () => {
    const { focused, press } = setup('2026-09-23')
    press('ArrowRight')
    expect(focused.value).toBe('2026-09-24')
    press('ArrowDown')
    expect(focused.value).toBe('2026-10-01')
    press('Home')
    expect(focused.value).toBe('2026-09-27')
    press('End')
    expect(focused.value).toBe('2026-10-03')
    press('ArrowUp')
    press('ArrowLeft')
    expect(focused.value).toBe('2026-09-25')
  })

  it('moves a month with PageUp / PageDown and clamps to the month end (AC-04, EC-07)', () => {
    const { focused, nav, press } = setup('2027-01-31')
    press('PageDown')
    expect(focused.value).toBe('2027-02-28')
    expect(nav.visibleMonth.value).toBe('2027-02')
    press('PageUp')
    expect(focused.value).toBe('2027-01-28')
  })

  it('switches the visible month when focus reaches a padding day (EC-08)', () => {
    const { nav, press } = setup('2026-09-30')
    press('ArrowRight')
    expect(nav.visibleMonth.value).toBe('2026-10')
  })

  it('stops at the booking window boundaries', () => {
    const { focused, nav, press } = setup('2026-09-23', '2026-09-22', '2026-10-21')
    press('ArrowUp')
    expect(focused.value).toBe('2026-09-22')
    expect(nav.canPrev.value).toBe(false)
    press('PageDown')
    expect(focused.value).toBe('2026-10-21')
    expect(nav.canNext.value).toBe(false)
  })

  it('reports select for Enter and Space and prevents page scrolling', () => {
    const { nav } = setup('2026-09-23')
    const enter = key('Enter')
    expect(nav.onKeydown(enter)).toBe('select')
    expect(enter.defaultPrevented).toBe(true)
    expect(nav.onKeydown(key(' '))).toBe('select')
    const down = key('PageDown')
    nav.onKeydown(down)
    expect(down.defaultPrevented).toBe(true)
    expect(nav.onKeydown(key('a'))).toBe('ignored')
  })
})

describe('useMonthBookings', () => {
  let clock = 0
  beforeEach(() => {
    clock = 0
  })

  it('aborts stale requests so only the last month is applied (AC-06, EC-09)', async () => {
    const { api, fetchCalls } = createFakeApi({ manual: true })
    const month = ref('2026-09')
    const { result, stop } = withScope(() => useMonthBookings(month, api, { clock: () => clock }))

    month.value = '2026-10'
    await nextTick()
    month.value = '2026-11'
    await nextTick()
    expect(fetchCalls.map((call) => call.month)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(fetchCalls[0]!.signal.aborted).toBe(true)
    expect(fetchCalls[1]!.signal.aborted).toBe(true)

    // 舊回應晚到也不會被套用
    fetchCalls[2]!.request.resolve([booking('2026-11-04', h(14), h(15))])
    fetchCalls[1]!.request.resolve([booking('2026-10-07', h(14), h(15))])
    await flushPromises()
    expect(result.status.value).toBe('ready')
    expect(result.bookings.value).toEqual([booking('2026-11-04', h(14), h(15))])
    expect(result.bookingsFor('2026-10-07')).toBeUndefined()
    stop()
  })

  it('serves a month from cache within the TTL and refetches after it (AC-06, EC-10)', async () => {
    const { api } = createFakeApi()
    const month = ref('2026-09')
    const { result, stop } = withScope(() => useMonthBookings(month, api, { ttl: 60_000, clock: () => clock }))
    await flushPromises()
    month.value = '2026-10'
    await flushPromises()
    clock = 59_000
    month.value = '2026-09'
    await flushPromises()
    expect(api.fetchBookings).toHaveBeenCalledTimes(2)
    expect(result.status.value).toBe('ready')

    clock = 61_000
    month.value = '2026-10'
    await flushPromises()
    month.value = '2026-09'
    await flushPromises()
    expect(api.fetchBookings).toHaveBeenCalledTimes(4)
    stop()
  })

  it('shows an error, keeps cached months and recovers on retry (EC-11)', async () => {
    const { api, fetchCalls } = createFakeApi({ manual: true })
    const month = ref('2026-09')
    const { result, stop } = withScope(() => useMonthBookings(month, api, { clock: () => clock }))
    fetchCalls[0]!.request.resolve([])
    await flushPromises()

    month.value = '2026-10'
    await nextTick()
    fetchCalls[1]!.request.reject(new Error('模擬伺服器錯誤（503）'))
    await flushPromises()
    expect(result.status.value).toBe('error')
    expect(result.error.value).toContain('503')
    expect(result.bookingsFor('2026-09-23')).toEqual([])

    void result.retry()
    fetchCalls[2]!.request.resolve([])
    await flushPromises()
    expect(result.status.value).toBe('ready')
    stop()
  })

  it('refetches the visible month when invalidated', async () => {
    const { api } = createFakeApi()
    const month = ref('2026-09')
    const { result, stop } = withScope(() => useMonthBookings(month, api, { clock: () => clock }))
    await flushPromises()
    result.invalidate('2026-09')
    await flushPromises()
    expect(api.fetchBookings).toHaveBeenCalledTimes(2)
    stop()
  })

  it('aborts the pending request on dispose (EC-20)', () => {
    const { api, fetchCalls } = createFakeApi({ manual: true })
    const { stop } = withScope(() => useMonthBookings(ref('2026-09'), api))
    stop()
    expect(fetchCalls[0]!.signal.aborted).toBe(true)
  })
})

describe('useBookingForm', () => {
  const slot: Slot = { date: '2026-09-23', start: h(14), end: h(15) }

  function setup() {
    const fake = createFakeApi()
    const { result, stop } = withScope(() => useBookingForm(fake.api))
    result.name.value = ' 王小明 '
    result.phone.value = '0912-345-678'
    return { ...fake, form: result, stop }
  }

  it('sends trimmed and normalized values', async () => {
    const { form, createCalls, stop } = setup()
    const pending = form.submit(slot, 'wash-cut')
    expect(form.state.value).toBe('submitting')
    expect(createCalls[0]!.input).toEqual({
      serviceId: 'wash-cut',
      date: '2026-09-23',
      start: h(14),
      name: '王小明',
      phone: '0912345678',
    })
    createCalls[0]!.request.resolve(confirmedFrom(createCalls[0]!.input, 60))
    expect(await pending).toBe('ok')
    expect(form.state.value).toBe('confirmed')
    stop()
  })

  it('only submits once when clicked repeatedly (AC-08, EC-13)', async () => {
    const { form, api, stop } = setup()
    void form.submit(slot, 'wash-cut')
    expect(await form.submit(slot, 'wash-cut')).toBe('busy')
    expect(api.createBooking).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not submit invalid input and shows errors only after an attempt (EC-17)', async () => {
    const { form, api, stop } = setup()
    form.name.value = '   '
    expect(form.errors.value.name).toBeNull()
    expect(await form.submit(slot, 'wash-cut')).toBe('invalid')
    expect(form.errors.value.name).toBe('請輸入姓名')
    expect(await form.submit(null, 'wash-cut')).toBe('invalid')
    expect(api.createBooking).not.toHaveBeenCalled()
    stop()
  })

  it('returns conflict on 409 and keeps the contact fields (EC-12)', async () => {
    const { form, createCalls, stop } = setup()
    const pending = form.submit(slot, 'wash-cut')
    createCalls[0]!.request.reject(new BookingConflictError())
    expect(await pending).toBe('conflict')
    expect(form.state.value).toBe('editing')
    expect(form.submitError.value).toBe('這個時段剛被預約走了')
    expect(form.name.value).toBe(' 王小明 ')
    stop()
  })

  it('returns to editing with a message on other errors', async () => {
    const { form, createCalls, stop } = setup()
    const pending = form.submit(slot, 'wash-cut')
    createCalls[0]!.request.reject(new Error('模擬伺服器錯誤（503）'))
    expect(await pending).toBe('error')
    expect(form.submitError.value).toContain('503')
    stop()
  })

  it('aborts an in-flight submission on dispose (EC-20)', () => {
    const { form, createCalls, stop } = setup()
    void form.submit(slot, 'wash-cut')
    stop()
    expect(createCalls[0]!.signal.aborted).toBe(true)
  })
})

describe('useNow', () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.UTC(2026, 8, 23, 2, 0, 30) }))
  afterEach(() => vi.useRealTimers())

  it('updates on the next minute boundary and every minute after (EC-19)', () => {
    const { result, stop } = withScope(() => useNow(ref(null)))
    const start = result.value
    vi.advanceTimersByTime(29_000)
    expect(result.value).toBe(start)
    vi.advanceTimersByTime(1_000)
    expect(result.value).toBe(Date.UTC(2026, 8, 23, 2, 1, 0))
    vi.advanceTimersByTime(60_000)
    expect(result.value).toBe(Date.UTC(2026, 8, 23, 2, 2, 0))
    stop()
  })

  it('uses the override when set and clears its timer on dispose (EC-20)', () => {
    const override = ref<number | null>(123)
    const { result, stop } = withScope(() => useNow(override))
    expect(result.value).toBe(123)
    override.value = null
    expect(result.value).toBe(Date.now())
    stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
