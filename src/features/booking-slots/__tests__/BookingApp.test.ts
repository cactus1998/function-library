import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BookingApp from '../components/BookingApp.vue'
import { BookingConflictError, type Booking, type PlainDate } from '../types'
import { booking, confirmedFrom, createFakeApi, h, taipei } from './helpers'

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
})

/** 現在是 2026-09-22（週二）台北 10:00，可預約到 10/21 */
async function mountApp(options: { bookings?: Booking[]; userTimeZone?: string; manual?: boolean } = {}) {
  const fake = createFakeApi({ bookings: options.bookings, manual: options.manual })
  const wrapper = mount(BookingApp, {
    attachTo: document.body,
    props: {
      api: fake.api,
      initialNow: taipei('2026-09-22', h(10)),
      userTimeZone: options.userTimeZone ?? 'Asia/Taipei',
    },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, ...fake }
}

async function selectDay(wrapper: VueWrapper, date: PlainDate) {
  await wrapper.get(`[data-date="${date}"]`).trigger('click')
  await flushPromises()
}

function chip(wrapper: VueWrapper, label: string) {
  const found = wrapper.findAll('label.chip').find((node) => node.get('.time').text() === label)
  if (!found) throw new Error(`No slot ${label}`)
  return found
}

async function chooseSlot(wrapper: VueWrapper, label: string) {
  await chip(wrapper, label).get('input').setValue(true)
}

async function chooseService(wrapper: VueWrapper, id: string) {
  await wrapper.get(`input[name="service"][value="${id}"]`).setValue(true)
  await flushPromises()
}

async function fillContact(wrapper: VueWrapper, name = '王小明', phone = '0912-345-678') {
  await wrapper.get('#booking-name').setValue(name)
  await wrapper.get('#booking-phone').setValue(phone)
}

const status = (wrapper: VueWrapper) => wrapper.get('[role="status"]').text()
const checkedSlots = (wrapper: VueWrapper) =>
  wrapper.findAll('input[name="slot"]').filter((node) => (node.element as HTMLInputElement).checked)

describe('BookingApp', () => {
  it('marks Mondays and holidays as closed in the calendar (AC-03, EC-05)', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.get('[data-date="2026-09-28"]').attributes('aria-label')).toBe('9月28日 星期一，公休')
    expect(wrapper.get('[data-date="2026-09-25"]').attributes('aria-label')).toContain('中秋節公休')
    expect(wrapper.get('[data-date="2026-09-23"]').attributes('aria-label')).toContain('剩 14 個時段')
  })

  it('applies the 2-hour lead time to today', async () => {
    const { wrapper } = await mountApp()
    await selectDay(wrapper, '2026-09-22')
    expect(wrapper.findAll('label.chip .time')[0]!.text()).toBe('12:00–13:00')
  })

  it('clears the chosen time when a longer service no longer fits (AC-11, EC-14)', async () => {
    const { wrapper } = await mountApp({ bookings: [booking('2026-09-23', h(15), h(16))] })
    await selectDay(wrapper, '2026-09-23')
    await chooseSlot(wrapper, '14:00–15:00')
    expect(wrapper.get('.summary').text()).toContain('洗剪')

    await chooseService(wrapper, 'color')
    expect(checkedSlots(wrapper)).toHaveLength(0)
    expect(status(wrapper)).toBe('原本的 14:00 放不下染髮，請重新選擇')
    expect(wrapper.get('#slots-title').text()).toContain('9月23日')
    expect(wrapper.get('.summary').text()).toBe('尚未選擇時段')
  })

  it('offers the next available date when the selected day is full for the service (EC-15)', async () => {
    const { wrapper } = await mountApp({
      bookings: [booking('2026-09-23', h(16), h(16, 30)), booking('2026-09-23', h(18, 30), h(19))],
    })
    await selectDay(wrapper, '2026-09-23')
    await chooseService(wrapper, 'perm')
    expect(wrapper.text()).toContain('這天的燙髮已約滿')
    const jump = wrapper.get('button.jump')
    expect(jump.text()).toContain('9/24')
    await jump.trigger('click')
    await flushPromises()
    expect(wrapper.get('#slots-title').text()).toContain('9月24日')
    expect(wrapper.findAll('label.chip').length).toBeGreaterThan(0)
  })

  it('annotates each slot with the local time of a user in Los Angeles (AC-10, EC-18)', async () => {
    const { wrapper } = await mountApp({ userTimeZone: 'America/Los_Angeles' })
    await selectDay(wrapper, '2026-09-23')
    expect(chip(wrapper, '14:00–15:00').get('.local').text()).toBe('你的時間 前一天 23:00')
    expect(chip(wrapper, '16:00–17:00').get('.local').text()).toBe('你的時間 01:00')
    expect(wrapper.get('.tz-note').text()).toContain('America/Los_Angeles')
  })

  it('does not annotate slots when the user is in the shop time zone', async () => {
    const { wrapper } = await mountApp()
    await selectDay(wrapper, '2026-09-23')
    expect(wrapper.find('.local').exists()).toBe(false)
    expect(wrapper.find('.tz-note').exists()).toBe(false)
  })

  it('shows validation errors instead of submitting invalid contact data (EC-16, EC-17)', async () => {
    const { wrapper, api } = await mountApp()
    await selectDay(wrapper, '2026-09-23')
    await chooseSlot(wrapper, '14:00–15:00')
    await fillContact(wrapper, '  ', '0212345678')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(api.createBooking).not.toHaveBeenCalled()
    expect(wrapper.get('#booking-name').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#booking-phone').attributes('aria-describedby')).toBe('booking-phone-error')
    expect(wrapper.get('#booking-phone-error').text()).toContain('09 開頭')
  })

  it('submits only once while a request is in flight (AC-08, EC-13)', async () => {
    const { wrapper, api } = await mountApp()
    await selectDay(wrapper, '2026-09-23')
    await chooseSlot(wrapper, '14:00–15:00')
    await fillContact(wrapper)
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(api.createBooking).toHaveBeenCalledTimes(1)
    const button = wrapper.get('button[type="submit"]')
    expect(button.text()).toBe('預約中…')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('keeps contact details, clears the slot and reloads the month on 409 (AC-07, EC-12)', async () => {
    const { wrapper, api, createCalls } = await mountApp()
    await selectDay(wrapper, '2026-09-23')
    await chooseSlot(wrapper, '14:00–15:00')
    await fillContact(wrapper)
    await wrapper.get('form').trigger('submit')
    expect(api.fetchBookings).toHaveBeenCalledTimes(1)

    createCalls[0]!.request.reject(new BookingConflictError())
    await flushPromises()
    expect(wrapper.get('.submit-error').text()).toBe('這個時段剛被預約走了')
    expect(checkedSlots(wrapper)).toHaveLength(0)
    expect((wrapper.get('#booking-name').element as HTMLInputElement).value).toBe('王小明')
    expect((wrapper.get('#booking-phone').element as HTMLInputElement).value).toBe('0912-345-678')
    expect(api.fetchBookings).toHaveBeenCalledTimes(2)
    expect(vi.mocked(api.fetchBookings).mock.calls[1]![0]).toBe('2026-09')
    expect(status(wrapper)).toBe('14:00 剛被預約走了，已重新載入空檔')
  })

  it('shows a confirmation card and lets the user book again (AC-09)', async () => {
    const { wrapper, createCalls } = await mountApp()
    await selectDay(wrapper, '2026-09-23')
    await chooseSlot(wrapper, '14:00–15:00')
    await fillContact(wrapper)
    await wrapper.get('form').trigger('submit')
    createCalls[0]!.request.resolve(confirmedFrom(createCalls[0]!.input, 60))
    await flushPromises()

    const card = wrapper.get('.card')
    expect(card.text()).toContain('A10010923')
    expect(card.text()).toContain('2026年9月23日 週三')
    expect(card.text()).toContain('14:00–15:00')
    expect(document.activeElement?.id).toBe('confirm-title')

    await card.findAll('button')[1]!.trigger('click')
    expect(wrapper.find('.card').exists()).toBe(false)
    expect((wrapper.get('#booking-name').element as HTMLInputElement).value).toBe('王小明')
    expect(wrapper.get('.summary').text()).toBe('尚未選擇時段')
  })

  it('drops a chosen slot once the current time makes it unbookable (EC-19)', async () => {
    const { wrapper } = await mountApp()
    await selectDay(wrapper, '2026-09-22')
    await chooseSlot(wrapper, '12:00–13:00')
    await wrapper.get('#demo-now').setValue('2026-09-22T10:30')
    await wrapper.get('#demo-now').trigger('change')
    await flushPromises()
    expect(checkedSlots(wrapper)).toHaveLength(0)
    expect(status(wrapper)).toBe('12:00 已無法預約，請重新選擇')
    expect(wrapper.findAll('label.chip .time')[0]!.text()).toBe('14:00–15:00')
  })

  it('aborts pending requests and clears timers on unmount (AC-12, EC-20)', async () => {
    vi.useFakeTimers()
    const { wrapper, fetchCalls } = await mountApp({ manual: true })
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(fetchCalls[0]!.signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
