import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { NOTICE_LIMIT, useCartAnnouncer } from '../composables/useCartAnnouncer'
import { useCartStore } from '../stores/cart'
import { line, withScope } from './helpers'

function setup() {
  const store = useCartStore()
  const { result } = withScope(() => useCartAnnouncer(store))
  return { store, ...result }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useCartAnnouncer', () => {
  it('announces changes made in another tab', async () => {
    const { store, message } = setup()
    store.mergeRemote([line('keyboard', 2, 5, 'bc90ffff')])
    await nextTick()
    expect(message.value).toBe('分頁 BC9 將『機械鍵盤』改為 2 件')
    store.mergeRemote([line('keyboard', 2, 6, 'bc90ffff', { deleted: true })])
    await nextTick()
    expect(message.value).toBe('分頁 BC9 移除了『機械鍵盤』')
  })

  it('stays silent for the user own changes', async () => {
    const { store, message, notices } = setup()
    store.add('keyboard')
    store.setQty('keyboard', 4)
    await nextTick()
    expect(message.value).toBe('')
    expect(notices.value).toEqual([])
  })

  it('shows a notice for stock corrections, local or remote (EC-12)', async () => {
    const { store, message, notices } = setup()
    store.add('hub')
    store.setQty('hub', 3)
    store.correct('hub', 1, store.lines.hub)
    await nextTick()
    expect(message.value).toBe('『USB-C 集線器』庫存不足，已調整為 1 件')

    store.mergeRemote([line('stand', 0, 99, 'leader', { deleted: true, corrected: true })])
    await nextTick()
    expect(notices.value.map((n) => n.text)).toEqual([
      '『筆電支架』已無庫存，已從購物車移除',
      '『USB-C 集線器』庫存不足，已調整為 1 件',
    ])
  })

  it('summarises a large batch of remote changes in one announcement', async () => {
    const { store, message } = setup()
    store.mergeRemote(['keyboard', 'mouse', 'hub', 'stand'].map((id, i) => line(id, 1, i + 1, 'other')))
    await nextTick()
    expect(message.value).toBe('已從其他分頁同步 4 項變更')
  })

  it('keeps the latest notices and lets the user dismiss them', async () => {
    const { store, notices, dismiss } = setup()
    const ids = ['keyboard', 'mouse', 'hub', 'stand']
    for (const [i, id] of ids.entries()) {
      store.mergeRemote([line(id, 1, i + 1, 'leader', { corrected: true })])
      await nextTick()
    }
    expect(notices.value).toHaveLength(NOTICE_LIMIT)
    expect(notices.value[0].text).toContain('筆電支架')
    dismiss(notices.value[0].id)
    expect(notices.value.map((n) => n.text).join()).not.toContain('筆電支架')
  })
})
