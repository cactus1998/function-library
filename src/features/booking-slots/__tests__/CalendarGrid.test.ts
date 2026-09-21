import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import CalendarGrid from '../components/CalendarGrid.vue'
import type { DayInfo, PlainDate } from '../types'
import { addDays } from '../utils/plainDate'

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/** min 到 max 之間都有 3 個空檔，overrides 可指定個別日期 */
function infosFor(min: PlainDate, max: PlainDate, overrides: Record<PlainDate, DayInfo | null> = {}) {
  const infos = new Map<PlainDate, DayInfo | null>()
  for (let date = addDays(min, -45); date <= addDays(max, 45); date = addDays(date, 1)) {
    const inside = date >= min && date <= max
    infos.set(date, inside ? { status: 'available', count: 3 } : { status: 'past', count: 0 })
  }
  for (const [date, info] of Object.entries(overrides)) infos.set(date, info)
  return infos
}

function mountGrid(options: {
  focused: PlainDate
  min?: PlainDate
  max?: PlainDate
  overrides?: Record<PlainDate, DayInfo | null>
  status?: 'loading' | 'ready' | 'error'
}) {
  const min = options.min ?? '2026-09-22'
  const max = options.max ?? '2026-10-21'
  const wrapper = mount(CalendarGrid, {
    attachTo: document.body,
    props: {
      focused: options.focused,
      'onUpdate:focused': (value: PlainDate) => wrapper.setProps({ focused: value }),
      min,
      max,
      today: min,
      selected: null,
      infos: infosFor(min, max, options.overrides),
      status: options.status ?? 'ready',
      error: options.status === 'error' ? '模擬伺服器錯誤（503）' : null,
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

const cell = (wrapper: VueWrapper, date: PlainDate) => wrapper.get(`[data-date="${date}"]`)

async function press(wrapper: VueWrapper, key: string) {
  await wrapper.get('[tabindex="0"]').trigger('keydown', { key })
  await nextTick()
}

describe('CalendarGrid', () => {
  it('keeps exactly one cell in the tab order and moves focus with the keyboard (AC-05)', async () => {
    const wrapper = mountGrid({ focused: '2026-09-23' })
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    await press(wrapper, 'ArrowRight')
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-09-24')
    await press(wrapper, 'ArrowDown')
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-10-01')
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    expect(wrapper.get('h3').text()).toBe('2026年10月')
  })

  it('moves from Jan 31 to Feb 28 with PageDown and updates the month title (AC-04)', async () => {
    const wrapper = mountGrid({ focused: '2027-01-31', min: '2027-01-01', max: '2027-03-31' })
    await press(wrapper, 'PageDown')
    expect(document.activeElement?.getAttribute('data-date')).toBe('2027-02-28')
    expect(wrapper.get('h3').text()).toBe('2027年2月')
    expect(wrapper.get('h3').attributes('aria-live')).toBe('polite')
  })

  it('switches month when a padding day is clicked (EC-08)', async () => {
    const wrapper = mountGrid({ focused: '2026-09-23' })
    await cell(wrapper, '2026-10-02').trigger('click')
    expect(wrapper.get('h3').text()).toBe('2026年10月')
    expect(wrapper.emitted('select')).toEqual([['2026-10-02']])
  })

  it('describes unavailable days and never selects them (AC-03)', async () => {
    const wrapper = mountGrid({
      focused: '2026-09-23',
      overrides: {
        '2026-09-25': { status: 'closed', count: 0, note: '中秋節公休' },
        '2026-09-28': { status: 'closed', count: 0 },
        '2026-09-24': { status: 'full', count: 0 },
      },
    })
    expect(cell(wrapper, '2026-09-28').attributes('aria-label')).toBe('9月28日 星期一，公休')
    expect(cell(wrapper, '2026-09-25').attributes('aria-label')).toBe('9月25日 星期五，中秋節公休')
    expect(cell(wrapper, '2026-09-24').attributes('aria-label')).toContain('已約滿')
    expect(cell(wrapper, '2026-09-23').attributes('aria-label')).toBe('9月23日 星期三，剩 3 個時段')
    expect(cell(wrapper, '2026-09-22').attributes('aria-label')).toMatch(/^今天，/)
    expect(cell(wrapper, '2026-09-28').attributes('aria-disabled')).toBe('true')

    await cell(wrapper, '2026-09-28').trigger('click')
    // 可以聚焦不可選的日子，但不會送出選取
    await press(wrapper, 'Enter')
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.props('focused')).toBe('2026-09-28')
  })

  it('selects the focused day with Enter', async () => {
    const wrapper = mountGrid({ focused: '2026-09-23' })
    await press(wrapper, 'Enter')
    expect(wrapper.emitted('select')).toEqual([['2026-09-23']])
  })

  it('disables month navigation outside the booking window', async () => {
    const wrapper = mountGrid({ focused: '2026-09-23' })
    const [prev, next] = wrapper.findAll('button.nav')
    expect(prev!.attributes('disabled')).toBeDefined()
    expect(next!.attributes('disabled')).toBeUndefined()
    await next!.trigger('click')
    expect(wrapper.get('h3').text()).toBe('2026年10月')
    expect(next!.attributes('disabled')).toBeDefined()
  })

  it('renders loading cells without changing the grid size and offers retry on error (EC-11)', async () => {
    const loading = mountGrid({ focused: '2026-09-23', overrides: { '2026-09-23': null } })
    expect(loading.findAll('tbody td')).toHaveLength(42)
    expect(cell(loading, '2026-09-23').classes()).toContain('loading')
    expect(cell(loading, '2026-09-23').attributes('aria-label')).toContain('空檔載入中')

    const failed = mountGrid({ focused: '2026-09-23', status: 'error' })
    expect(failed.get('[role="alert"]').text()).toContain('503')
    await failed.get('[role="alert"] button').trigger('click')
    expect(failed.emitted('retry')).toHaveLength(1)
  })
})
