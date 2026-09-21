import { describe, expect, it } from 'vitest'
import type { Balance, Expense, Member } from '../types'
import { evaluate, normalizeExpression, parseAmount } from '../utils/expression'
import { allocate, formatTwd, serviceChargeOf } from '../utils/money'
import {
  computeBalances,
  exactRemaining,
  expenseTotal,
  owedBy,
  settle,
  splitSummary,
  summaryText,
  validateExpense,
  type ExpenseDraft,
} from '../utils/split'
import { defaultState, parseSaved, serialize } from '../utils/storage'

const MEMBERS: Member[] = [
  { id: 'a', name: '我' },
  { id: 'b', name: '小明' },
  { id: 'c', name: '小華' },
]

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    title: '晚餐',
    payerId: 'a',
    amount: 1000,
    serviceCharge: false,
    split: { mode: 'equal', participants: ['a', 'b', 'c'] },
    ...overrides,
  }
}

/** 決定性的亂數，讓性質測試可重現 */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('allocate', () => {
  it('gives the leftover unit to the earliest member on ties (EC-01)', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333])
    expect(allocate(1001, [1, 1, 1])).toEqual([334, 334, 333])
  })

  it('distributes by largest remainder for weighted shares (EC-02)', () => {
    expect(allocate(1001, [2, 1, 1])).toEqual([501, 250, 250])
    expect(allocate(100, [1, 0, 2])).toEqual([33, 0, 67])
  })

  it('always sums to the total and never gives to zero weights', () => {
    const random = seeded(42)
    for (let run = 0; run < 200; run++) {
      const weights = Array.from({ length: 1 + Math.floor(random() * 8) }, () => Math.floor(random() * 4))
      if (!weights.some((w) => w > 0)) weights[0] = 1
      const total = Math.floor(random() * 100_000)
      const result = allocate(total, weights)
      expect(result.reduce((a, b) => a + b, 0)).toBe(total)
      weights.forEach((w, i) => w === 0 && expect(result[i]).toBe(0))
    }
  })

  it('returns zeros when every weight is zero', () => {
    expect(allocate(100, [0, 0])).toEqual([0, 0])
  })
})

describe('money formatting', () => {
  it('formats TWD with thousands separators and a sign', () => {
    expect(formatTwd(1234567)).toBe('NT$1,234,567')
    expect(formatTwd(-30)).toBe('-NT$30')
    expect(formatTwd(0)).toBe('NT$0')
  })

  it('rounds the 10% service charge (EC-04)', () => {
    expect(serviceChargeOf(1234)).toBe(123)
    expect(serviceChargeOf(1235)).toBe(124)
    expect(expenseTotal({ amount: 1234, serviceCharge: true })).toBe(1357)
    expect(expenseTotal({ amount: 1234, serviceCharge: false })).toBe(1234)
  })
})

describe('evaluate', () => {
  it('respects operator precedence, parentheses and unary minus (AC-02)', () => {
    expect(evaluate('1280+350')).toEqual({ ok: true, value: 1630 })
    expect(evaluate('120+85*2')).toEqual({ ok: true, value: 290 })
    expect(evaluate('(100+50)*2')).toEqual({ ok: true, value: 300 })
    expect(evaluate('100 - -20')).toEqual({ ok: true, value: 120 })
    expect(evaluate('10/4')).toEqual({ ok: true, value: 2.5 })
    expect(evaluate('.5*4')).toEqual({ ok: true, value: 2 })
  })

  it('accepts full-width characters, × ÷ and thousands separators (EC-05)', () => {
    expect(normalizeExpression('１２０＋８０')).toBe('120+80')
    expect(evaluate('１２０＋８０')).toEqual({ ok: true, value: 200 })
    expect(evaluate('1,200+300')).toEqual({ ok: true, value: 1500 })
    expect(evaluate('100×3÷2')).toEqual({ ok: true, value: 150 })
    expect(evaluate('（１００）')).toEqual({ ok: true, value: 100 })
  })

  it('reports errors instead of throwing (EC-06)', () => {
    expect(evaluate('100/0')).toEqual({ ok: false, error: '不能除以 0' })
    expect(evaluate('1++')).toEqual({ ok: false, error: '算式不完整' })
    expect(evaluate('(1+2')).toEqual({ ok: false, error: '括號沒有成對' })
    expect(evaluate('1 2')).toMatchObject({ ok: false })
    expect(evaluate('abc')).toMatchObject({ ok: false })
    expect(evaluate('alert(1)')).toMatchObject({ ok: false })
    expect(evaluate('   ')).toEqual({ ok: false, error: '請輸入金額' })
    expect(evaluate('1+'.repeat(60))).toEqual({ ok: false, error: '算式太長' })
  })

  it('rounds amounts to whole dollars and enforces the range (EC-06, EC-07)', () => {
    expect(parseAmount('100/3')).toEqual({ ok: true, value: 33 })
    expect(parseAmount('0.4')).toEqual({ ok: false, error: '金額至少 NT$1' })
    expect(parseAmount('100-200')).toMatchObject({ ok: false })
    expect(parseAmount('1000001')).toMatchObject({ ok: false })
  })
})

describe('owedBy', () => {
  it('splits equally among selected participants only', () => {
    const owed = owedBy(expense({ split: { mode: 'equal', participants: ['b', 'c'] } }), MEMBERS)
    expect([...owed]).toEqual([
      ['b', 500],
      ['c', 500],
    ])
  })

  it('adds the service charge before splitting (EC-04)', () => {
    const owed = owedBy(expense({ amount: 1234, serviceCharge: true }), MEMBERS)
    expect([...owed.values()]).toEqual([453, 452, 452])
  })

  it('uses exact amounts as entered', () => {
    const owed = owedBy(expense({ split: { mode: 'exact', amounts: { a: 0, b: 400, c: 600 } } }), MEMBERS)
    expect(Object.fromEntries(owed)).toEqual({ b: 400, c: 600 })
  })
})

describe('validateExpense', () => {
  const draft = (overrides: Partial<ExpenseDraft> = {}): ExpenseDraft => ({
    title: '晚餐',
    payerId: 'a',
    amount: 1000,
    serviceCharge: false,
    split: { mode: 'equal', participants: ['a'] },
    ...overrides,
  })

  it('accepts a valid draft', () => {
    expect(validateExpense(draft(), MEMBERS)).toEqual([])
  })

  it('shows how much is missing or exceeded for exact amounts (AC-03, EC-03)', () => {
    expect(validateExpense(draft({ split: { mode: 'exact', amounts: { a: 400, b: 500 } } }), MEMBERS)).toEqual([
      '還差 NT$100',
    ])
    expect(validateExpense(draft({ split: { mode: 'exact', amounts: { a: 400, b: 630 } } }), MEMBERS)).toEqual([
      '超過 NT$30',
    ])
    expect(exactRemaining(1100, { a: 1000 })).toBe(100)
  })

  it('rejects empty participants, zero shares and bad fields (EC-17)', () => {
    expect(validateExpense(draft({ split: { mode: 'equal', participants: [] } }), MEMBERS)).toEqual(['至少要有 1 位參與者'])
    expect(validateExpense(draft({ split: { mode: 'shares', shares: { a: 0 } } }), MEMBERS)).toEqual(['總份數至少 1'])
    expect(validateExpense(draft({ split: { mode: 'shares', shares: { a: 11 } } }), MEMBERS)).toEqual([
      '份數需為 0–10 的整數',
    ])
    expect(validateExpense(draft({ title: '  ', payerId: 'x' }), MEMBERS)).toEqual(['請輸入帳目名稱', '請選擇付款人'])
    expect(validateExpense(draft({ title: '字'.repeat(31) }), MEMBERS)).toEqual(['帳目名稱最多 30 個字'])
  })
})

describe('balances and settlement', () => {
  it('produces the expected transfers for a simple dinner (AC-01)', () => {
    const balances = computeBalances(MEMBERS, [expense()])
    expect(balances.map((b) => b.net)).toEqual([666, -333, -333])
    expect(settle(balances)).toEqual([
      { from: 'b', to: 'a', amount: 333 },
      { from: 'c', to: 'a', amount: 333 },
    ])
  })

  it('credits a payer who is not a participant (EC-13)', () => {
    const balances = computeBalances(MEMBERS, [expense({ split: { mode: 'equal', participants: ['b', 'c'] } })])
    expect(balances[0]).toEqual({ memberId: 'a', paid: 1000, owed: 0, net: 1000 })
  })

  it('has no transfers when there are no expenses or everyone is even (EC-12)', () => {
    expect(settle(computeBalances(MEMBERS, []))).toEqual([])
    const even = [
      expense({ id: '1', payerId: 'a', amount: 300 }),
      expense({ id: '2', payerId: 'b', amount: 300 }),
      expense({ id: '3', payerId: 'c', amount: 300 }),
    ]
    expect(settle(computeBalances(MEMBERS, even))).toEqual([])
  })

  it('always zeroes every balance with at most n − 1 transfers (AC-04)', () => {
    const random = seeded(7)
    for (let run = 0; run < 100; run++) {
      const members = Array.from({ length: 2 + Math.floor(random() * 10) }, (_, i) => ({ id: `m${i}`, name: `${i}` }))
      const pick = () => members[Math.floor(random() * members.length)]!.id
      const expenses = Array.from({ length: Math.floor(random() * 15) }, (_, i) =>
        expense({
          id: `e${i}`,
          payerId: pick(),
          amount: 1 + Math.floor(random() * 5000),
          serviceCharge: random() < 0.3,
          split:
            random() < 0.5
              ? { mode: 'equal', participants: [...new Set([pick(), pick(), pick()])] }
              : { mode: 'shares', shares: Object.fromEntries(members.map((m) => [m.id, Math.floor(random() * 3)])) },
        }),
      ).filter((e) => e.split.mode === 'equal' || Object.values(e.split.mode === 'shares' ? e.split.shares : {}).some((n) => n > 0))

      const balances = computeBalances(members, expenses)
      expect(balances.reduce((acc, b) => acc + b.net, 0)).toBe(0)
      const transfers = settle(balances)
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, members.length - 1))
      const net = new Map(balances.map((b) => [b.memberId, b.net]))
      for (const t of transfers) {
        expect(t.amount).toBeGreaterThan(0)
        net.set(t.from, net.get(t.from)! + t.amount)
        net.set(t.to, net.get(t.to)! - t.amount)
      }
      expect([...net.values()].every((n) => n === 0)).toBe(true)
    }
  })

  it('settles 20 people with 500 expenses within 5ms', () => {
    const members = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `${i}` }))
    const expenses = Array.from({ length: 500 }, (_, i) =>
      expense({ id: `e${i}`, payerId: `m${i % 20}`, amount: 100 + i, split: { mode: 'equal', participants: members.map((m) => m.id) } }),
    )
    computeBalances(members, expenses)
    const start = performance.now()
    settle(computeBalances(members, expenses))
    expect(performance.now() - start).toBeLessThan(5)
  })

  it('summarizes transfers as shareable text (AC-07)', () => {
    const balances: Balance[] = computeBalances(MEMBERS, [expense()])
    const text = summaryText(MEMBERS, [expense()], settle(balances))
    expect(text).toBe('聚餐分帳（1 筆，共 NT$1,000）\n小明 → 我 NT$333\n小華 → 我 NT$333')
    expect(summaryText(MEMBERS, [], [])).toContain('大家都結清了')
  })

  it('describes the split mode', () => {
    expect(splitSummary(expense(), MEMBERS)).toBe('3 人平分')
    expect(splitSummary(expense({ split: { mode: 'equal', participants: ['a'] } }), MEMBERS)).toBe('1 人平分（部分成員）')
    expect(splitSummary(expense({ split: { mode: 'shares', shares: { a: 2, b: 1, c: 0 } } }), MEMBERS)).toBe('按份數 2:1')
  })
})

describe('parseSaved', () => {
  const wrap = (data: unknown, version = 1) => JSON.stringify({ version, data })

  it('round-trips serialized state (AC-06)', () => {
    const state = { members: MEMBERS, expenses: [expense()] }
    expect(parseSaved(serialize(state))).toEqual(state)
  })

  it('rejects corrupted JSON, wrong versions and too few members (EC-14)', () => {
    expect(parseSaved(null)).toBeNull()
    expect(parseSaved('{oops')).toBeNull()
    expect(parseSaved(wrap(defaultState(), 0))).toBeNull()
    expect(parseSaved(wrap({ members: [{ id: 'a', name: '我' }], expenses: [] }))).toBeNull()
  })

  it('drops only the invalid expenses (EC-14)', () => {
    const saved = parseSaved(
      wrap({
        members: MEMBERS,
        expenses: [
          expense(),
          expense({ id: 'ghost', payerId: 'zzz' }),
          expense({ id: 'bad-split', split: { mode: 'equal', participants: ['a', 'zzz'] } }),
          expense({ id: 'float', amount: 10.5 }),
          { id: 'junk' },
        ],
      }),
    )
    expect(saved?.expenses.map((e) => e.id)).toEqual(['e1'])
  })
})
