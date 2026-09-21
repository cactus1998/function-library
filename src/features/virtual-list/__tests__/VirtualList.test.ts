import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import VirtualList from '../components/VirtualList.vue'
import type { PublicScrollAlign, VirtualRange } from '../utils/layout'
import {
  MockResizeObserver,
  findItemObserver,
  installDomMocks,
  restoreDomMocks,
} from './domMocks'

interface Row {
  id: number
  label: string
}

interface ListHandle {
  scrollToIndex: (index: number, align?: PublicScrollAlign) => void
}

const VIEWPORT = 480

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: index, label: `Row ${index}` }))
}

let wrapper: VueWrapper | null = null

function mountList(options: {
  count: number
  itemHeight?: number
  estimatedHeight?: number
  selected?: number | null
}) {
  const mounted = mount(VirtualList, {
    props: {
      items: createRows(options.count),
      // 泛型元件掛載時 T 推論為 unknown，這裡明確轉回 Row
      itemKey: (item: unknown) => (item as Row).id,
      label: '測試列表',
      itemHeight: options.itemHeight,
      estimatedHeight: options.estimatedHeight,
      selected: options.selected ?? null,
      'onUpdate:selected': (value: number | null) => mounted.setProps({ selected: value }),
    },
    slots: {
      default: ({ item }: { item: unknown }) => h('span', (item as Row).label),
    },
    attachTo: document.body,
  })
  wrapper = mounted
  return mounted
}

function listbox(target: VueWrapper) {
  return target.get<HTMLElement>('[role="listbox"]')
}

function renderedIndexes(target: VueWrapper): number[] {
  return target
    .findAll('[role="option"]')
    .map((option) => Number(option.attributes('data-virtual-index')))
}

async function scrollTo(target: VueWrapper, top: number) {
  const el = listbox(target).element
  el.scrollTop = top
  el.dispatchEvent(new Event('scroll'))
  await nextTick()
}

function lastRange(target: VueWrapper): VirtualRange | undefined {
  const events = target.emitted<[VirtualRange]>('rangeChange') ?? []
  return events.at(-1)?.[0]
}

function handle(target: VueWrapper): ListHandle {
  return target.vm as unknown as ListHandle
}

beforeEach(() => {
  installDomMocks(VIEWPORT)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  restoreDomMocks()
})

describe('VirtualList - fixed height', () => {
  it('renders only the visible rows plus overscan for 100,000 items (AC-02)', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48 })
    await nextTick()

    // 480 / 48 = 10 列可視，下方再多 5 列 overscan
    expect(renderedIndexes(list)).toEqual(Array.from({ length: 15 }, (_, i) => i))
    expect(list.get('.spacer').attributes('style')).toContain('height: 4800000px')
  })

  it('starts the visible range at row 1000 after scrolling to 48 * 1000 (AC-01)', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48 })
    await nextTick()

    await scrollTo(list, 48 * 1000)

    expect(lastRange(list)).toEqual({ start: 1000, end: 1009, renderStart: 995, renderEnd: 1014 })
    expect(renderedIndexes(list)[0]).toBe(995)
    expect(list.get('.window').attributes('style')).toContain('translateY(47760px)')
  })

  it('exposes list semantics for assistive technology', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48 })
    await nextTick()

    expect(listbox(list).attributes('aria-label')).toBe('測試列表')
    const first = list.get('[role="option"]')
    expect(first.attributes('aria-setsize')).toBe('100000')
    expect(first.attributes('aria-posinset')).toBe('1')
    expect(first.attributes('aria-selected')).toBe('false')
  })

  it('shows an empty message and no options for an empty list (EC-01)', async () => {
    const list = mountList({ count: 0, itemHeight: 48 })
    await nextTick()

    expect(list.text()).toContain('沒有資料')
    expect(list.findAll('[role="option"]')).toHaveLength(0)
  })

  it('renders every row when the list is shorter than the viewport (EC-02)', async () => {
    const list = mountList({ count: 3, itemHeight: 48 })
    await nextTick()

    expect(renderedIndexes(list)).toEqual([0, 1, 2])
  })

  it('scrolls a row to the start, center or end (AC-05)', async () => {
    const list = mountList({ count: 100, itemHeight: 48 })
    await nextTick()
    const el = listbox(list).element

    handle(list).scrollToIndex(50, 'start')
    expect(el.scrollTop).toBe(2400)

    handle(list).scrollToIndex(50, 'center')
    expect(el.scrollTop).toBe(2400 + 24 - VIEWPORT / 2)

    handle(list).scrollToIndex(50, 'end')
    expect(el.scrollTop).toBe(2400 + 48 - VIEWPORT)
  })

  it('clamps out-of-range indexes instead of throwing (EC-03)', async () => {
    const list = mountList({ count: 100, itemHeight: 48 })
    await nextTick()
    const el = listbox(list).element

    handle(list).scrollToIndex(1_000_000)
    expect(el.scrollTop).toBe(4800 - VIEWPORT)

    handle(list).scrollToIndex(-5)
    expect(el.scrollTop).toBe(0)

    expect(() => handle(list).scrollToIndex(Number.NaN)).not.toThrow()
  })
})

describe('VirtualList - keyboard', () => {
  it('moves the selection with ArrowDown, End and Home (AC-06)', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48, selected: 0 })
    await nextTick()
    const box = listbox(list)

    await box.trigger('keydown', { key: 'ArrowDown' })
    expect(list.props('selected')).toBe(1)
    expect(box.attributes('aria-activedescendant')).toMatch(/-option-1$/)

    await box.trigger('keydown', { key: 'End' })
    await nextTick()
    expect(list.props('selected')).toBe(99_999)
    expect(box.attributes('aria-activedescendant')).toMatch(/-option-99999$/)

    await box.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(list.props('selected')).toBe(0)
    expect(box.attributes('aria-activedescendant')).toMatch(/-option-0$/)
  })

  it('scrolls the selected row into the DOM when it moves off screen (EC-10)', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48, selected: 0 })
    await nextTick()
    const box = listbox(list)

    await box.trigger('keydown', { key: 'End' })
    await nextTick()

    expect(box.element.scrollTop).toBe(100_000 * 48 - VIEWPORT)
    const activeId = box.attributes('aria-activedescendant')
    expect(activeId).toBeDefined()
    const active = document.getElementById(activeId!)
    expect(active).not.toBeNull()
    expect(active!.getAttribute('aria-selected')).toBe('true')
  })

  it('does not point aria-activedescendant at a row that is not rendered', async () => {
    const list = mountList({ count: 100_000, itemHeight: 48, selected: 0 })
    await nextTick()

    await scrollTo(list, 48 * 5000)

    expect(listbox(list).attributes('aria-activedescendant')).toBeUndefined()
  })

  it('ignores keys it does not handle and leaves default behaviour alone', async () => {
    const list = mountList({ count: 100, itemHeight: 48, selected: 3 })
    await nextTick()
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })

    listbox(list).element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(list.props('selected')).toBe(3)
  })

  it('selects a row on click', async () => {
    const list = mountList({ count: 100, itemHeight: 48 })
    await nextTick()

    await list.findAll('[role="option"]')[2].trigger('click')

    expect(list.props('selected')).toBe(2)
  })
})

describe('VirtualList - dynamic height', () => {
  it('observes only the rendered rows and follows the range while scrolling', async () => {
    const list = mountList({ count: 1000, estimatedHeight: 50 })
    await nextTick()
    const observer = findItemObserver()
    const indexesOf = () =>
      [...observer.observed].map((el) => Number(el.getAttribute('data-virtual-index')))

    expect(indexesOf().sort((a, b) => a - b)).toEqual(renderedIndexes(list))

    await scrollTo(list, 50 * 500)
    await nextTick()

    expect(indexesOf().sort((a, b) => a - b)).toEqual(renderedIndexes(list))
    expect(indexesOf()).not.toContain(0)
  })

  it('updates the total height after rows are measured (AC-03)', async () => {
    const list = mountList({ count: 1000, estimatedHeight: 50 })
    await nextTick()
    const observer = findItemObserver()
    const rows = list.findAll('[role="option"]')

    observer.resize([
      [rows[0].element, 80],
      [rows[1].element, 20],
    ])
    await nextTick()

    expect(list.get('.spacer').attributes('style')).toContain(`height: ${1000 * 50 + 30 - 30}px`)

    observer.resize([[rows[0].element, 100]])
    await nextTick()

    expect(list.get('.spacer').attributes('style')).toContain(`height: ${1000 * 50 + 50 - 30}px`)
  })

  it('keeps the content still when a row above the viewport changes height (EC-05)', async () => {
    const list = mountList({ count: 1000, estimatedHeight: 50 })
    await nextTick()
    await scrollTo(list, 1000)
    const el = listbox(list).element
    const observer = findItemObserver()
    const rowAt = (index: number) => list.get(`[data-virtual-index="${index}"]`).element

    // 第 16 列頂端在 800px，位於可視區（1000px 起）上方
    observer.resize([[rowAt(16), 100]])
    expect(el.scrollTop).toBe(1050)

    // 第 25 列在可視區內，高度改變不需要補償
    observer.resize([[rowAt(25), 90]])
    expect(el.scrollTop).toBe(1050)
  })

  it('lands on a far row even when heights differ from the estimate (AC-04, EC-04)', async () => {
    vi.useFakeTimers()
    const list = mountList({ count: 1000, estimatedHeight: 50 })
    await nextTick()
    const el = listbox(list).element

    handle(list).scrollToIndex(500, 'start')
    expect(el.scrollTop).toBe(500 * 50)
    await nextTick()

    // 目標附近的列實際較高；上方尚未量測的列維持預估值
    const observer = findItemObserver()
    const measured = [...observer.observed].map((row): [Element, number] => [row, 70])
    observer.resize(measured)
    await nextTick()
    vi.advanceTimersToNextFrame()
    await nextTick()

    expect(list.find('[data-virtual-index="500"]').exists()).toBe(true)
    // 第 500 列之前的已量測列（overscan 495–499）各多 20px
    expect(el.scrollTop).toBe(500 * 50 + 5 * 20)
    vi.useRealTimers()
  })
})

describe('VirtualList - cleanup', () => {
  it('disconnects observers and removes listeners on unmount (EC-11)', async () => {
    const list = mountList({ count: 1000, estimatedHeight: 50 })
    await nextTick()
    const el = listbox(list).element
    const removeListener = vi.spyOn(el, 'removeEventListener')
    const observers = [...MockResizeObserver.instances]

    list.unmount()
    wrapper = null

    expect(observers.length).toBeGreaterThanOrEqual(2)
    for (const observer of observers) expect(observer.disconnected).toBe(true)
    const removed = removeListener.mock.calls.map(([type]) => type)
    expect(removed).toEqual(expect.arrayContaining(['scroll', 'wheel', 'touchstart']))
  })
})
