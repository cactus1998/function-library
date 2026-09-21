import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '../stores/cart'
import { line } from './helpers'

// 這裡的 pinia 沒有安裝 sync plugin，只測 store 本身的 LWW 行為
beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useCartStore', () => {
  it('adds a product with a fresh stamp and increments on repeat', () => {
    const store = useCartStore()
    expect(store.add('keyboard')).toEqual([line('keyboard', 1, 1, store.tabId)])
    store.add('keyboard')
    expect(store.lines.keyboard).toMatchObject({ qty: 2, clock: 2 })
    expect(store.totalCount).toBe(2)
    expect(store.totalPrice).toBe(2 * 3290)
  })

  it('ignores unknown products and stops at 99', () => {
    const store = useCartStore()
    expect(store.add('nope')).toBeNull()
    store.add('keyboard')
    store.setQty('keyboard', 99)
    expect(store.add('keyboard')).toBeNull()
    expect(store.lines.keyboard.qty).toBe(99)
  })

  it('lists items in catalog order', () => {
    const store = useCartStore()
    store.add('microphone')
    store.add('keyboard')
    expect(store.items.map((item) => item.product.id)).toEqual(['keyboard', 'microphone'])
  })

  it('clamps setQty and skips no-op writes (EC-16)', () => {
    const store = useCartStore()
    store.add('mouse')
    expect(store.setQty('mouse', 1)).toBeNull()
    expect(store.setQty('mouse', Number.NaN)).toBeNull()
    store.setQty('mouse', 250)
    expect(store.lines.mouse.qty).toBe(99)
    expect(store.setQty('keyboard', 3)).toBeNull()
  })

  it('removes by writing a tombstone that keeps a newer stamp', () => {
    const store = useCartStore()
    store.add('mouse')
    const [removed] = store.remove('mouse')!
    expect(removed).toMatchObject({ deleted: true, clock: 2 })
    expect(store.items).toEqual([])
    expect(store.remove('mouse')).toBeNull()
  })

  it('clears every visible item and returns the tombstones', () => {
    const store = useCartStore()
    expect(store.clear()).toBeNull()
    store.add('mouse')
    store.add('hub')
    expect(store.clear()?.map((l) => l.deleted)).toEqual([true, true])
    expect(store.totalCount).toBe(0)
  })

  it('advances the Lamport clock past remote writes (AC-03)', () => {
    const store = useCartStore()
    store.add('keyboard')
    store.add('keyboard')
    store.add('keyboard')
    expect(store.clock).toBe(3)
    store.mergeRemote([line('mouse', 1, 10, 'zzzz')])
    expect(store.add('hub')?.[0].clock).toBe(11)
  })

  it('advances the clock even when the remote line loses', () => {
    const store = useCartStore()
    store.add('keyboard')
    store.mergeRemote([line('keyboard', 5, 1, '0000')])
    expect(store.clock).toBe(1)
    store.mergeRemote([line('mouse', 5, 7, '0000'), line('mouse', 1, 3, '0000')])
    expect(store.clock).toBe(7)
  })

  it('corrects a quantity to the available stock with a new stamp (EC-12)', () => {
    const store = useCartStore()
    const [added] = store.add('hub')!
    store.setQty('hub', 3)
    const [corrected] = store.correct('hub', 1, store.lines.hub)!
    expect(corrected).toMatchObject({ qty: 1, corrected: true, deleted: false })
    expect(corrected.clock).toBeGreaterThan(added.clock)
  })

  it('removes the item when stock is zero', () => {
    const store = useCartStore()
    store.add('hub')
    store.correct('hub', 0, store.lines.hub)
    expect(store.lines.hub).toMatchObject({ deleted: true, corrected: true, qty: 0 })
  })

  it('skips the correction when the item changed after the request was sent (EC-14)', () => {
    const store = useCartStore()
    store.add('hub')
    const sent = { ...store.lines.hub }
    store.setQty('hub', 5)
    expect(store.correct('hub', 1, sent)).toBeNull()
    expect(store.lines.hub.qty).toBe(5)
  })

  it('skips the correction when stock is enough', () => {
    const store = useCartStore()
    store.add('hub')
    expect(store.correct('hub', 1, store.lines.hub)).toBeNull()
  })

  it('counts user changes but not stock corrections', () => {
    const store = useCartStore()
    store.add('hub')
    store.setQty('hub', 3)
    expect([store.userRevision, store.localRevision]).toEqual([2, 2])
    store.correct('hub', 1, store.lines.hub)
    expect([store.userRevision, store.localRevision]).toEqual([2, 2])
    store.mergeRemote([line('mouse', 1, 50, 'zzzz')])
    expect([store.userRevision, store.localRevision]).toEqual([3, 2])
    store.mergeRemote([line('mouse', 1, 60, 'zzzz', { corrected: true })])
    expect(store.userRevision).toBe(3)
  })
})
