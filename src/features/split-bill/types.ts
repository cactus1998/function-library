export interface Member {
  id: string
  name: string
}

export type SplitMode = 'equal' | 'exact' | 'shares'

export type Split =
  | { mode: 'equal'; participants: string[] }
  | { mode: 'exact'; amounts: Record<string, number> }
  | { mode: 'shares'; shares: Record<string, number> }

export interface Expense {
  id: string
  title: string
  payerId: string
  /** 新台幣整數元，不含服務費 */
  amount: number
  serviceCharge: boolean
  split: Split
}

export interface Balance {
  memberId: string
  paid: number
  owed: number
  /** paid − owed；正數為應收，負數為應付 */
  net: number
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

export interface SavedState {
  members: Member[]
  expenses: Expense[]
}
