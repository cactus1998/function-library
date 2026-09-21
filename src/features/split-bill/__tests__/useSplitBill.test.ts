import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { UNDO_MS, useSplitBill, type SplitBillOptions } from '../composables/useSplitBill'
import type { Expense } from '../types'
import { serialize, STORAGE_KEY } from '../utils/storage'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  } satisfies Storage
}

function setup(options: SplitBillOptions = {}) {
  let n = 0
  const storage = options.storage ?? memoryStorage()
  const scope = effectScope()
  const bill = scope.run(() => useSplitBill({ storage, createId: () => `id${++n}`, ...options }))!
  return { bill, storage, stop: () => scope.stop() }
}

const dinner = (overrides: Partial<Expense> = {}): Omit<Expense, 'id'> & { id?: string } => ({
  title: '晚餐',
  payerId: 'm-me',
  amount: 1000,
  serviceCharge: false,
  split: { mode: 'equal', participants: ['m-me', 'm-ming', 'm-hua'] },
  ...overrides,
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useSplitBill', () => {
  it('starts with three default members and settles a dinner (AC-01)', () => {
    const { bill, stop } = setup()
    expect(bill.members.value.map((m) => m.name)).toEqual(['我', '小明', '小華'])
    bill.saveExpense(dinner())
    expect(bill.balances.value.map((b) => b.owed)).toEqual([334, 333, 333])
    expect(bill.transfers.value).toEqual([
      { from: 'm-ming', to: 'm-me', amount: 333 },
      { from: 'm-hua', to: 'm-me', amount: 333 },
    ])
    stop()
  })

  it('updates an existing expense in place', () => {
    const { bill, stop } = setup()
    const saved = bill.saveExpense(dinner())
    bill.saveExpense(dinner({ title: '宵夜' }))
    bill.saveExpense({ ...saved, amount: 900 })
    expect(bill.expenses.value.map((e) => [e.title, e.amount])).toEqual([
      ['晚餐', 900],
      ['宵夜', 1000],
    ])
    stop()
  })

  it('rejects duplicate names ignoring case and whitespace (EC-08)', () => {
    const { bill, stop } = setup()
    expect(bill.addMember(' Amy ')).toBeNull()
    expect(bill.addMember('amy')).toBe('已有同名成員')
    expect(bill.addMember(' 小明')).toBe('已有同名成員')
    expect(bill.addMember('')).toBe('請輸入名稱')
    expect(bill.addMember('字'.repeat(13))).toBe('名稱最多 12 個字')
    expect(bill.renameMember('m-ming', '小華')).toBe('已有同名成員')
    expect(bill.renameMember('m-ming', ' 阿明 ')).toBeNull()
    expect(bill.members.value[1]!.name).toBe('阿明')
    stop()
  })

  it('enforces the 2–20 member range', () => {
    const { bill, stop } = setup()
    for (let i = 0; i < 17; i++) expect(bill.addMember(`成員${i}`)).toBeNull()
    expect(bill.addMember('第21人')).toBe('最多 20 人')
    stop()

    const small = setup()
    expect(small.bill.removeMember('m-hua')).toBeNull()
    expect(small.bill.removeMember('m-ming')).toBe('至少要有 2 人')
    small.stop()
  })

  it('refuses to remove a member who appears in an expense (EC-09)', () => {
    const { bill, stop } = setup()
    bill.saveExpense(dinner({ split: { mode: 'equal', participants: ['m-me', 'm-ming'] } }))
    expect(bill.removeMember('m-ming')).toBe('小明 有相關帳目，請先修改帳目')
    expect(bill.removeMember('m-hua')).toBeNull()
    stop()
  })

  it('also protects members referenced by an expense waiting for undo', () => {
    const { bill, stop } = setup()
    const saved = bill.saveExpense(dinner())
    bill.removeExpense(saved.id)
    expect(bill.removeMember('m-hua')).toMatch(/有相關帳目/)
    stop()
  })

  it('restores a removed expense to its position within 5 seconds (AC-05, EC-10)', () => {
    const { bill, stop } = setup()
    bill.saveExpense(dinner({ title: 'A' }))
    const b = bill.saveExpense(dinner({ title: 'B' }))
    bill.saveExpense(dinner({ title: 'C' }))
    bill.removeExpense(b.id)
    expect(bill.expenses.value.map((e) => e.title)).toEqual(['A', 'C'])
    vi.advanceTimersByTime(UNDO_MS - 1)
    expect(bill.undoRemove()).toBe(true)
    expect(bill.expenses.value.map((e) => e.title)).toEqual(['A', 'B', 'C'])
    expect(bill.pendingUndo.value).toBeNull()
    stop()
  })

  it('expires the undo after 5 seconds (AC-05)', () => {
    const { bill, stop } = setup()
    const saved = bill.saveExpense(dinner())
    bill.removeExpense(saved.id)
    vi.advanceTimersByTime(UNDO_MS)
    expect(bill.pendingUndo.value).toBeNull()
    expect(bill.undoRemove()).toBe(false)
    expect(bill.expenses.value).toEqual([])
    stop()
  })

  it('only undoes the most recent removal (EC-11)', () => {
    const { bill, stop } = setup()
    const a = bill.saveExpense(dinner({ title: 'A' }))
    const b = bill.saveExpense(dinner({ title: 'B' }))
    bill.removeExpense(a.id)
    bill.removeExpense(b.id)
    bill.undoRemove()
    expect(bill.expenses.value.map((e) => e.title)).toEqual(['B'])
    expect(bill.undoRemove()).toBe(false)
    stop()
  })

  it('debounces writes and restores them on the next load (AC-06, EC-15)', async () => {
    const { bill, storage, stop } = setup()
    bill.saveExpense(dinner({ title: 'A' }))
    await nextTick()
    bill.saveExpense(dinner({ title: 'B' }))
    await nextTick()
    bill.addMember('阿姨')
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(storage.setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    stop()

    const reloaded = setup({ storage })
    expect(reloaded.bill.expenses.value.map((e) => e.title)).toEqual(['A', 'B'])
    expect(reloaded.bill.members.value.map((m) => m.name)).toContain('阿姨')
    reloaded.stop()
  })

  it('flushes pending writes on pagehide and on dispose (EC-15, EC-18)', async () => {
    const { bill, storage, stop } = setup()
    bill.saveExpense(dinner())
    await nextTick()
    window.dispatchEvent(new Event('pagehide'))
    expect(storage.setItem).toHaveBeenCalledTimes(1)

    bill.addMember('阿姨')
    await nextTick()
    stop()
    expect(storage.setItem).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    // listener 已移除
    window.dispatchEvent(new Event('pagehide'))
    expect(storage.setItem).toHaveBeenCalledTimes(2)
  })

  it('falls back to defaults when storage is corrupted or throws (AC-06, EC-14)', () => {
    const corrupted = setup({ storage: memoryStorage({ [STORAGE_KEY]: '{oops' }) })
    expect(corrupted.bill.members.value).toHaveLength(3)
    corrupted.stop()

    const throwing = memoryStorage()
    throwing.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    throwing.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const broken = setup({ storage: throwing })
    broken.bill.saveExpense(dinner())
    expect(() => broken.stop()).not.toThrow()
  })

  it('loads valid saved data', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: serialize({
        members: [
          { id: 'x', name: '甲' },
          { id: 'y', name: '乙' },
        ],
        expenses: [],
      }),
    })
    const { bill, stop } = setup({ storage })
    expect(bill.members.value.map((m) => m.name)).toEqual(['甲', '乙'])
    stop()
  })

  it('resets to the default members', () => {
    const { bill, stop } = setup()
    bill.saveExpense(dinner())
    bill.addMember('阿姨')
    bill.reset()
    expect(bill.members.value).toHaveLength(3)
    expect(bill.expenses.value).toEqual([])
    stop()
  })
})

describe('useClipboard', () => {
  it('uses the Clipboard API when available (AC-07)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await useClipboard({ writeText }).copy('hi')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('hi')
  })

  it('falls back to execCommand when the API is missing or rejected (EC-16)', async () => {
    const exec = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()

    expect(await useClipboard(undefined).copy('a')).toBe(true)
    expect(await useClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) }).copy('b')).toBe(true)
    expect(exec).toHaveBeenCalledTimes(2)
    expect(document.querySelector('textarea')).toBeNull()
    expect(document.activeElement).toBe(button)

    exec.mockReturnValue(false)
    expect(await useClipboard(undefined).copy('c')).toBe(false)
    button.remove()
  })
})
