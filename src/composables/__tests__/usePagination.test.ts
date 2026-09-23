import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { clampPage, isPageSize, pageRange, usePagination } from '../usePagination'

describe('pageRange', () => {
  it('lists every page when they fit', () => {
    expect(pageRange(1, 0)).toEqual([])
    expect(pageRange(1, 1)).toEqual([1])
    expect(pageRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('keeps a fixed number of slots near the start, middle and end', () => {
    expect(pageRange(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20])
    expect(pageRange(4, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 20])
    expect(pageRange(10, 20)).toEqual([1, 'ellipsis', 9, 10, 11, 'ellipsis', 20])
    expect(pageRange(17, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20])
    expect(pageRange(20, 20)).toEqual([1, 'ellipsis', 16, 17, 18, 19, 20])
  })

  it('clamps an out-of-range current page', () => {
    expect(pageRange(99, 10)).toEqual(pageRange(10, 10))
  })
})

describe('clampPage / isPageSize', () => {
  it('clamps into [1, totalPages]', () => {
    expect(clampPage(0, 5)).toBe(1)
    expect(clampPage(9, 5)).toBe(5)
    expect(clampPage(NaN, 5)).toBe(1)
    expect(clampPage(3, 0)).toBe(1)
  })

  it('only accepts the supported sizes', () => {
    expect([10, 20, 30, 40, 50].every(isPageSize)).toBe(true)
    expect(isPageSize(15)).toBe(false)
  })
})

describe('usePagination', () => {
  it('slices items and reacts to page, size and data changes', () => {
    const items = ref(Array.from({ length: 23 }, (_, i) => i))
    const page = ref(3)
    const size = ref(10)
    const p = usePagination(items, page, size)

    expect(p.totalPages.value).toBe(3)
    expect(p.pageItems.value).toEqual([20, 21, 22])
    expect([p.startIndex.value, p.endIndex.value]).toEqual([20, 23])

    size.value = 20
    expect(p.currentPage.value).toBe(2)
    expect(p.pageItems.value).toEqual([20, 21, 22])

    items.value = items.value.slice(0, 5)
    expect(p.currentPage.value).toBe(1)
    expect(p.pageItems.value).toEqual([0, 1, 2, 3, 4])
  })
})
