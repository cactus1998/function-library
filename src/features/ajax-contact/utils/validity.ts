export type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export function isFormControl(el: Element | null): el is FormControl {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

/**
 * 把 Constraint Validation API 的 ValidityState 轉成一致的中文訊息。
 * 瀏覽器預設訊息（validationMessage）會隨語系與瀏覽器不同，不適合直接顯示。
 */
export function validityMessage(el: FormControl): string {
  const v = el.validity
  if (v.valid) return trimmedMessage(el)
  if (v.valueMissing) return el instanceof HTMLSelectElement ? '請選擇一個選項' : '此欄位必填'
  if (v.typeMismatch) return el.type === 'email' ? 'Email 格式不正確，例如 name@example.com' : '格式不正確'
  if (v.tooShort && !(el instanceof HTMLSelectElement)) return `至少 ${el.minLength} 個字（目前 ${el.value.length} 字）`
  if (v.tooLong && !(el instanceof HTMLSelectElement)) return `最多 ${el.maxLength} 個字`
  if (v.patternMismatch) return el.dataset.patternMessage ?? '格式不正確'
  if (v.customError) return el.validationMessage
  return '格式不正確'
}

/**
 * required 與 minlength 以原始值判斷，前後空白也算字數；伺服器會先 trim 再驗證。
 * 這裡以 trim 後的值補驗一次，避免「 王 」通過前端卻被伺服器回 422。
 */
function trimmedMessage(el: FormControl): string {
  if (el instanceof HTMLSelectElement || el.value === '') return ''
  const length = el.value.trim().length
  if (el.required && length === 0) return '此欄位必填'
  if (el.minLength > 0 && length < el.minLength) return `至少 ${el.minLength} 個字（目前 ${length} 字）`
  return ''
}
