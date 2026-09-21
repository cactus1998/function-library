import { describe, expect, it } from 'vitest'
import { backoffDelay } from '../utils/backoff'
import { clampQty, compareStamp, mergeLines, parseCartLines, parseQtyInput } from '../utils/lww'
import { line } from './helpers'

describe('compareStamp', () => {
  it('orders by clock first', () => {
    expect(compareStamp({ clock: 2, tabId: 'a' }, { clock: 1, tabId: 'z' })).toBe(1)
    expect(compareStamp({ clock: 1, tabId: 'z' }, { clock: 2, tabId: 'a' })).toBe(-1)
  })

  it('breaks clock ties by tabId so every pair has a winner', () => {
    expect(compareStamp({ clock: 5, tabId: 'b' }, { clock: 5, tabId: 'a' })).toBe(1)
    expect(compareStamp({ clock: 5, tabId: 'a' }, { clock: 5, tabId: 'b' })).toBe(-1)
    expect(compareStamp({ clock: 5, tabId: 'a' }, { clock: 5, tabId: 'a' })).toBe(0)
  })
})

describe('mergeLines', () => {
  it('lets the larger tabId win on equal clocks regardless of merge order (AC-02)', () => {
    const a = line('keyboard', 2, 5, 'a')
    const b = line('keyboard', 4, 5, 'b')
    const ab = mergeLines(mergeLines({}, [a]).lines, [b]).lines
    const ba = mergeLines(mergeLines({}, [b]).lines, [a]).lines
    expect(ab.keyboard.qty).toBe(4)
    expect(ba).toEqual(ab)
  })

  it('keeps the newer write when two tabs change the same item (EC-01)', () => {
    const local = { keyboard: line('keyboard', 3, 8, 'a') }
    const result = mergeLines(local, [line('keyboard', 7, 6, 'b')])
    expect(result.lines.keyboard.qty).toBe(3)
    expect(result.changed).toEqual([])
  })

  it('compares a tombstone against a concurrent increment like any other write (EC-02)', () => {
    const removed = line('mouse', 1, 4, 'a', { deleted: true })
    const bumped = line('mouse', 2, 5, 'b')
    expect(mergeLines({ mouse: removed }, [bumped]).lines.mouse.deleted).toBe(false)
    expect(mergeLines({ mouse: bumped }, [line('mouse', 2, 6, 'a', { deleted: true })]).lines.mouse.deleted).toBe(true)
  })

  it('is idempotent and tolerates duplicated or reordered messages (EC-04)', () => {
    const batch = [line('keyboard', 1, 1, 'a'), line('keyboard', 3, 3, 'a'), line('mouse', 2, 2, 'b')]
    const once = mergeLines({}, batch).lines
    const twice = mergeLines(once, batch)
    const reversed = mergeLines({}, [...batch].reverse()).lines
    expect(twice.changed).toEqual([])
    expect(twice.lines).toBe(once)
    expect(reversed).toEqual(once)
    expect(once.keyboard.qty).toBe(3)
  })

  it('returns the same object when nothing changes and never mutates the input', () => {
    const local = Object.freeze({ keyboard: line('keyboard', 1, 9, 'a') })
    const result = mergeLines(local, [line('keyboard', 5, 1, 'b'), line('mouse', 1, 2, 'b')])
    expect(result.lines).not.toBe(local)
    expect(local).toEqual({ keyboard: line('keyboard', 1, 9, 'a') })
    expect(result.changed.map((l) => l.productId)).toEqual(['mouse'])
  })

  it('reports the largest clock seen even when the line loses', () => {
    expect(mergeLines({ keyboard: line('keyboard', 1, 20, 'z') }, [line('keyboard', 2, 12, 'a')]).maxClock).toBe(12)
    expect(mergeLines({}, []).maxClock).toBe(0)
  })
})

describe('parseCartLines', () => {
  it('accepts valid lines and filters unknown products', () => {
    const raw = [line('keyboard', 2, 1, 'a'), line('unknown', 1, 2, 'a')]
    expect(parseCartLines(raw, (id) => id === 'keyboard')).toEqual([raw[0]])
  })

  it('allows a zero quantity only on tombstones', () => {
    expect(parseCartLines([line('keyboard', 0, 1, 'a', { deleted: true })])).toHaveLength(1)
    expect(parseCartLines([line('keyboard', 0, 1, 'a')])).toBeNull()
  })

  it.each([
    ['not an array', { keyboard: 1 }],
    ['missing field', [{ productId: 'keyboard', qty: 1, clock: 1, tabId: 'a', deleted: false }]],
    ['fractional qty', [line('keyboard', 1.5, 1, 'a')]],
    ['qty above 99', [line('keyboard', 100, 1, 'a')]],
    ['negative clock', [line('keyboard', 1, -1, 'a')]],
    ['empty tabId', [line('keyboard', 1, 1, '')]],
    ['string qty', [{ ...line('keyboard', 1, 1, 'a'), qty: '2' }]],
  ])('rejects the whole batch when it has a malformed entry: %s (EC-09)', (_, raw) => {
    expect(parseCartLines(raw)).toBeNull()
  })
})

describe('quantity input', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['abc', null],
    ['3', 3],
    ['3.9', 3],
    ['0', 1],
    ['-4', 1],
    ['150', 99],
    [' 12 ', 12],
  ])('parses %j as %j (EC-16)', (text, expected) => {
    expect(parseQtyInput(text)).toBe(expected)
  })

  it('clamps to 1–99 and truncates decimals', () => {
    expect(clampQty(0)).toBe(1)
    expect(clampQty(99.9)).toBe(99)
    expect(clampQty(1000)).toBe(99)
  })
})

describe('backoffDelay', () => {
  it('doubles the delay per attempt (AC-09)', () => {
    const middle = () => 0.5
    expect([0, 1, 2].map((n) => backoffDelay(n, 500, middle))).toEqual([500, 1000, 2000])
  })

  it('adds at most ±20% jitter', () => {
    expect(backoffDelay(1, 500, () => 0)).toBe(800)
    expect(backoffDelay(1, 500, () => 1)).toBe(1200)
  })
})
