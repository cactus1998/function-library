/**
 * 最大餘數法（Hamilton）：依權重把整數 total 分成整數份額，加總永遠等於 total。
 * 先各自無條件捨去，剩下的單位依小數部分由大到小分配；小數相同時給順序在前者，結果可重現。
 * 權重全為 0 時回傳全 0（呼叫端需先驗證）。
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0)
  if (sum <= 0) return weights.map(() => 0)
  const quotas = weights.map((w) => (total * w) / sum)
  const result = quotas.map(Math.floor)
  let remainder = total - result.reduce((acc, n) => acc + n, 0)
  const order = quotas
    .map((quota, index) => ({ index, fraction: quota - Math.floor(quota) }))
    .filter((item) => weights[item.index]! > 0)
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (let i = 0; remainder > 0 && order.length > 0; i = (i + 1) % order.length) {
    result[order[i]!.index]! += 1
    remainder -= 1
  }
  return result
}

const twd = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 })

/** NT$1,234；負數顯示為 -NT$1,234 */
export function formatTwd(amount: number): string {
  const text = `NT$${twd.format(Math.abs(amount))}`
  return amount < 0 ? `-${text}` : text
}

/** 10% 服務費，四捨五入到整數元 */
export function serviceChargeOf(amount: number): number {
  return Math.round(amount * 0.1)
}
