import { describe, expect, it } from 'vitest'
import {
  EMPTY_RANGE,
  computeRange,
  createDynamicLayout,
  createFixedLayout,
  isSameRange,
  scrollOffsetFor,
} from '../utils/layout'

describe('createFixedLayout', () => {
  it('computes offsets and indexes with multiplication only', () => {
    const layout = createFixedLayout(100_000, 48)
    expect(layout.totalHeight).toBe(4_800_000)
    expect(layout.offsetOf(1000)).toBe(48_000)
    expect(layout.indexAt(48_000)).toBe(1000)
    expect(layout.indexAt(48_047)).toBe(1000)
  })

  it('clamps out-of-range offsets to the first and last item', () => {
    const layout = createFixedLayout(10, 48)
    expect(layout.indexAt(-100)).toBe(0)
    expect(layout.indexAt(1_000_000)).toBe(9)
  })

  it('ignores measurements because every row has the same height', () => {
    const layout = createFixedLayout(10, 48)
    expect(layout.measure(3, 100)).toBe(0)
    expect(layout.offsetOf(4)).toBe(192)
  })
})

describe('createDynamicLayout', () => {
  it('uses the estimated height before any measurement', () => {
    const layout = createDynamicLayout(1000, 50)
    expect(layout.totalHeight).toBe(50_000)
    expect(layout.offsetOf(10)).toBe(500)
  })

  it('shifts only the rows after a measured row (AC-03)', () => {
    const layout = createDynamicLayout(100, 50)
    const before = layout.offsetOf(4)

    expect(layout.measure(5, 80)).toBe(30)

    expect(layout.offsetOf(4)).toBe(before)
    expect(layout.offsetOf(5)).toBe(250)
    expect(layout.offsetOf(6)).toBe(330)
    expect(layout.offsetOf(99)).toBe(99 * 50 + 30)
    expect(layout.totalHeight).toBe(100 * 50 + 30)
  })

  it('finds the row that contains an offset with binary search', () => {
    const layout = createDynamicLayout(100, 50)
    layout.measure(5, 80)
    expect(layout.indexAt(0)).toBe(0)
    expect(layout.indexAt(249)).toBe(4)
    expect(layout.indexAt(250)).toBe(5)
    expect(layout.indexAt(329)).toBe(5)
    expect(layout.indexAt(330)).toBe(6)
    expect(layout.indexAt(layout.totalHeight)).toBe(99)
  })

  it('stays consistent after measuring rows far apart in any order', () => {
    const layout = createDynamicLayout(100_000, 50)
    layout.measure(90_000, 10)
    layout.measure(10, 200)
    layout.measure(50_000, 120)

    // 只有第 10 列在第 50,000 列之前；第 90,000 列在後面，不影響位置
    const expected = 50_000 * 50 + (200 - 50)
    expect(layout.offsetOf(50_000)).toBe(expected)
    expect(layout.indexAt(expected)).toBe(50_000)
    expect(layout.indexAt(expected - 1)).toBe(49_999)
    expect(layout.totalHeight).toBe(100_000 * 50 + 150 - 40 + 70)
  })

  it('returns 0 for repeated or invalid measurements', () => {
    const layout = createDynamicLayout(10, 50)
    expect(layout.measure(2, 50)).toBe(0)
    expect(layout.measure(-1, 80)).toBe(0)
    expect(layout.measure(10, 80)).toBe(0)
    expect(layout.measure(1.5, 80)).toBe(0)
    expect(layout.measure(2, Number.NaN)).toBe(0)
    expect(layout.measure(2, -5)).toBe(0)
    expect(layout.totalHeight).toBe(500)
  })

  it('handles an empty list', () => {
    const layout = createDynamicLayout(0, 50)
    expect(layout.totalHeight).toBe(0)
    expect(layout.indexAt(100)).toBe(0)
    expect(layout.sizeOf(0)).toBe(0)
  })
})

describe('computeRange', () => {
  it('starts at row 1000 when scrolled to 48 * 1000 with fixed 48px rows (AC-01)', () => {
    const range = computeRange(createFixedLayout(100_000, 48), 48_000, 480, 5)
    expect(range).toEqual({ start: 1000, end: 1009, renderStart: 995, renderEnd: 1014 })
  })

  it('renders at most the visible rows plus 2 * overscan (AC-02)', () => {
    const layout = createFixedLayout(100_000, 48)
    for (const top of [0, 1234, 480_000, 4_799_520]) {
      const range = computeRange(layout, top, 480, 5)
      const visible = range.end - range.start + 1
      expect(range.renderEnd - range.renderStart + 1).toBeLessThanOrEqual(visible + 10)
    }
  })

  it('does not count a row whose top sits exactly on the bottom edge as visible', () => {
    const range = computeRange(createFixedLayout(100, 48), 0, 480, 0)
    expect(range.end).toBe(9)
  })

  it('returns an empty range for an empty list (EC-01)', () => {
    expect(computeRange(createFixedLayout(0, 48), 0, 480, 5)).toBe(EMPTY_RANGE)
  })

  it('covers every row when the list is shorter than the viewport (EC-02)', () => {
    const range = computeRange(createFixedLayout(3, 48), 0, 480, 5)
    expect(range).toEqual({ start: 0, end: 2, renderStart: 0, renderEnd: 2 })
  })

  it('keeps the last row visible when scrolled past the end (EC-06)', () => {
    const range = computeRange(createFixedLayout(100, 48), 1_000_000, 480, 5)
    expect(range.end).toBe(99)
    expect(range.renderEnd).toBe(99)
  })
})

describe('scrollOffsetFor', () => {
  const layout = createFixedLayout(100, 48)

  it('aligns the target row to the start, center or end (AC-05)', () => {
    expect(scrollOffsetFor(layout, 50, 'start', 480, 0)).toBe(2400)
    expect(scrollOffsetFor(layout, 50, 'center', 480, 0)).toBe(2400 + 24 - 240)
    expect(scrollOffsetFor(layout, 50, 'end', 480, 0)).toBe(2400 + 48 - 480)
  })

  it('only scrolls as much as needed with auto alignment', () => {
    expect(scrollOffsetFor(layout, 5, 'auto', 480, 0)).toBe(0)
    expect(scrollOffsetFor(layout, 20, 'auto', 480, 0)).toBe(20 * 48 + 48 - 480)
    expect(scrollOffsetFor(layout, 2, 'auto', 480, 1000)).toBe(96)
  })

  it('clamps negative and too-large indexes into the list (EC-03)', () => {
    expect(scrollOffsetFor(layout, -5, 'start', 480, 300)).toBe(0)
    expect(scrollOffsetFor(layout, 1_000, 'start', 480, 0)).toBe(4800 - 480)
  })

  it('never returns a position beyond the scrollable area', () => {
    expect(scrollOffsetFor(layout, 99, 'start', 480, 0)).toBe(4800 - 480)
    expect(scrollOffsetFor(createFixedLayout(3, 48), 2, 'end', 480, 0)).toBe(0)
  })
})

describe('isSameRange', () => {
  it('compares every boundary', () => {
    const a = { start: 1, end: 5, renderStart: 0, renderEnd: 10 }
    expect(isSameRange(a, { ...a })).toBe(true)
    expect(isSameRange(a, { ...a, renderEnd: 11 })).toBe(false)
  })
})
