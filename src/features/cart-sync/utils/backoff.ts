/**
 * 指數退避加 ±20% jitter：attempt 0、1、2 約為 base、2×base、4×base。
 * jitter 讓多個客戶端不會在同一時間一起重試。
 */
export function backoffDelay(attempt: number, base: number, random: () => number = Math.random): number {
  return Math.round(base * 2 ** attempt * (0.8 + 0.4 * random()))
}
