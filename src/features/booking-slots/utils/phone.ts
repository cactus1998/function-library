/** 台灣手機：09 開頭 10 碼；允許空白、-、括號與 +886 國碼，回傳正規化後的號碼或 null */
export function normalizePhone(text: string): string | null {
  let digits = text.trim().replace(/[\s\-()]/g, '')
  if (digits.startsWith('+886')) digits = `0${digits.slice(4)}`
  return /^09\d{8}$/.test(digits) ? digits : null
}

export const NAME_MAX = 20

export function validateName(text: string): string | null {
  const name = text.trim()
  if (!name) return '請輸入姓名'
  // 以 code point 計算，emoji 或罕用字不會被算成兩個字
  if ([...name].length > NAME_MAX) return `姓名最多 ${NAME_MAX} 個字`
  return null
}

export function validatePhone(text: string): string | null {
  if (!text.trim()) return '請輸入手機號碼'
  return normalizePhone(text) ? null : '請輸入 09 開頭的 10 碼手機號碼'
}
