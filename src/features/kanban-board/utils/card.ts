export const TITLE_MAX_LENGTH = 100

export type TitleResult = { ok: true; title: string } | { ok: false; error: string }

export function validateTitle(raw: string): TitleResult {
  const title = raw.trim()
  if (!title) return { ok: false, error: '標題不能空白' }
  if (title.length > TITLE_MAX_LENGTH) return { ok: false, error: `標題最多 ${TITLE_MAX_LENGTH} 字` }
  return { ok: true, title }
}

let fallbackCounter = 0

export function createId(): string {
  // randomUUID 只在安全環境（https / localhost）提供
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `card-${Date.now().toString(36)}-${(fallbackCounter++).toString(36)}`
}
