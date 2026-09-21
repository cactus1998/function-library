import type { Balance, Expense, Member, Split, Transfer } from '../types'
import { allocate, formatTwd, serviceChargeOf } from './money'

export const SHARE_MAX = 10

/** 含服務費的總額 */
export function expenseTotal(expense: Pick<Expense, 'amount' | 'serviceCharge'>): number {
  return expense.amount + (expense.serviceCharge ? serviceChargeOf(expense.amount) : 0)
}

/** 依分法計算每位成員應付金額；members 決定順序（最大餘數法相同時給順序在前者） */
export function owedBy(expense: Expense, members: readonly Member[]): Map<string, number> {
  const total = expenseTotal(expense)
  const owed = new Map<string, number>()
  const { split } = expense
  if (split.mode === 'exact') {
    for (const member of members) {
      const amount = split.amounts[member.id] ?? 0
      if (amount > 0) owed.set(member.id, amount)
    }
    return owed
  }
  const weights = members.map((member) =>
    split.mode === 'equal' ? (split.participants.includes(member.id) ? 1 : 0) : (split.shares[member.id] ?? 0),
  )
  allocate(total, weights).forEach((amount, index) => {
    if (amount > 0) owed.set(members[index]!.id, amount)
  })
  return owed
}

/** 指定金額模式：加總與總額的差（正數為還差多少） */
export function exactRemaining(total: number, amounts: Record<string, number>): number {
  return total - Object.values(amounts).reduce((acc, n) => acc + n, 0)
}

export const TITLE_MAX = 30

export interface ExpenseDraft {
  title: string
  payerId: string
  amount: number | null
  serviceCharge: boolean
  split: Split
}

export function validateExpense(draft: ExpenseDraft, members: readonly Member[]): string[] {
  const errors: string[] = []
  const ids = new Set(members.map((m) => m.id))
  const title = draft.title.trim()
  if (!title) errors.push('請輸入帳目名稱')
  else if ([...title].length > TITLE_MAX) errors.push(`帳目名稱最多 ${TITLE_MAX} 個字`)
  if (!ids.has(draft.payerId)) errors.push('請選擇付款人')
  const { split } = draft
  if (split.mode === 'equal') {
    if (!split.participants.some((id) => ids.has(id))) errors.push('至少要有 1 位參與者')
  } else if (split.mode === 'shares') {
    const values = members.map((m) => split.shares[m.id] ?? 0)
    if (values.some((n) => !Number.isInteger(n) || n < 0 || n > SHARE_MAX)) errors.push(`份數需為 0–${SHARE_MAX} 的整數`)
    else if (values.every((n) => n === 0)) errors.push('總份數至少 1')
  } else {
    const values = members.map((m) => split.amounts[m.id] ?? 0)
    if (values.some((n) => !Number.isInteger(n) || n < 0)) errors.push('指定金額需為 0 以上的整數')
    // 金額還沒填好時無法比較加總，由金額欄位自己顯示錯誤
    else if (draft.amount !== null) {
      const total = expenseTotal({ amount: draft.amount, serviceCharge: draft.serviceCharge })
      const remaining = exactRemaining(total, split.amounts)
      if (remaining > 0) errors.push(`還差 ${formatTwd(remaining)}`)
      else if (remaining < 0) errors.push(`超過 ${formatTwd(-remaining)}`)
    }
  }
  return errors
}

export function computeBalances(members: readonly Member[], expenses: readonly Expense[]): Balance[] {
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()
  for (const expense of expenses) {
    paid.set(expense.payerId, (paid.get(expense.payerId) ?? 0) + expenseTotal(expense))
    for (const [id, amount] of owedBy(expense, members)) owed.set(id, (owed.get(id) ?? 0) + amount)
  }
  return members.map((member) => {
    const p = paid.get(member.id) ?? 0
    const o = owed.get(member.id) ?? 0
    return { memberId: member.id, paid: p, owed: o, net: p - o }
  })
}

/**
 * 貪婪結算：每次讓「最該收錢的人」與「最該付錢的人」配對，轉帳金額取兩者較小值。
 * 每一步至少讓一人歸零，因此轉帳數 ≤ 人數 − 1。
 * （真正的最少轉帳數等價於子集合劃分，是 NP-hard；聚餐人數少，貪婪結果已足夠直覺。）
 */
export function settle(balances: readonly Balance[]): Transfer[] {
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ id: b.memberId, amount: b.net }))
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ id: b.memberId, amount: -b.net }))
  const transfers: Transfer[] = []
  // 穩定排序：金額相同時維持成員順序，結果可重現
  const byAmount = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount
  while (creditors.length && debtors.length) {
    creditors.sort(byAmount)
    debtors.sort(byAmount)
    const creditor = creditors[0]!
    const debtor = debtors[0]!
    const amount = Math.min(creditor.amount, debtor.amount)
    transfers.push({ from: debtor.id, to: creditor.id, amount })
    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount === 0) creditors.shift()
    if (debtor.amount === 0) debtors.shift()
  }
  return transfers
}

export function splitSummary(expense: Expense, members: readonly Member[]): string {
  const { split } = expense
  if (split.mode === 'equal') {
    const count = members.filter((m) => split.participants.includes(m.id)).length
    return count === members.length ? `${count} 人平分` : `${count} 人平分（部分成員）`
  }
  if (split.mode === 'shares') {
    const shares = members.filter((m) => (split.shares[m.id] ?? 0) > 0)
    return `按份數 ${shares.map((m) => split.shares[m.id]).join(':')}`
  }
  return '指定金額'
}

export function summaryText(members: readonly Member[], expenses: readonly Expense[], transfers: readonly Transfer[]): string {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '?'
  const total = expenses.reduce((acc, e) => acc + expenseTotal(e), 0)
  const lines = [`聚餐分帳（${expenses.length} 筆，共 ${formatTwd(total)}）`]
  if (transfers.length === 0) lines.push('大家都結清了')
  for (const t of transfers) lines.push(`${name(t.from)} → ${name(t.to)} ${formatTwd(t.amount)}`)
  return lines.join('\n')
}
