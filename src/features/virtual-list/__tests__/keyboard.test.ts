import { describe, expect, it } from 'vitest'
import { nextIndex } from '../utils/keyboard'

describe('nextIndex', () => {
  it('moves through ArrowDown, End and Home in order (AC-06)', () => {
    expect(nextIndex('ArrowDown', 0, 100, 10)).toBe(1)
    expect(nextIndex('End', 1, 100, 10)).toBe(99)
    expect(nextIndex('Home', 99, 100, 10)).toBe(0)
  })

  it('moves by one page with PageUp and PageDown', () => {
    expect(nextIndex('PageDown', 5, 100, 10)).toBe(15)
    expect(nextIndex('PageUp', 15, 100, 10)).toBe(5)
  })

  it('stops at the first and last row', () => {
    expect(nextIndex('ArrowUp', 0, 100, 10)).toBe(0)
    expect(nextIndex('ArrowDown', 99, 100, 10)).toBe(99)
    expect(nextIndex('PageDown', 95, 100, 10)).toBe(99)
    expect(nextIndex('PageUp', 3, 100, 10)).toBe(0)
  })

  it('starts from the first visible row when nothing is selected', () => {
    expect(nextIndex('ArrowDown', null, 100, 10, 40)).toBe(40)
    expect(nextIndex('PageUp', null, 100, 10, 40)).toBe(40)
    expect(nextIndex('ArrowDown', null, 100, 10, 500)).toBe(99)
  })

  it('treats a page size below 1 as 1', () => {
    expect(nextIndex('PageDown', 5, 100, 0)).toBe(6)
  })

  it('ignores other keys and empty lists', () => {
    expect(nextIndex('Enter', 3, 100, 10)).toBeNull()
    expect(nextIndex('ArrowDown', null, 0, 10)).toBeNull()
  })
})
