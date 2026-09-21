import { describe, expect, it } from 'vitest'
import { MAX_BODY_LENGTH, createRandom, generateItems } from '../utils/generateItems'

describe('generateItems', () => {
  it('produces the same data for the same seed', () => {
    expect(generateItems(50, 7)).toEqual(generateItems(50, 7))
    expect(generateItems(50, 7)).not.toEqual(generateItems(50, 8))
  })

  it('uses the index as a unique id', () => {
    const items = generateItems(1000)
    expect(items.map((item) => item.id)).toEqual(items.map((_, index) => index))
  })

  it('keeps body text within the maximum length, including empty bodies', () => {
    const lengths = generateItems(5000).map((item) => item.body.length)
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_BODY_LENGTH)
    expect(lengths.some((length) => length === 0)).toBe(true)
  })

  it('returns an empty array for zero items', () => {
    expect(generateItems(0)).toEqual([])
  })
})

describe('createRandom', () => {
  it('returns numbers in [0, 1)', () => {
    const random = createRandom(1)
    for (let i = 0; i < 1000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
