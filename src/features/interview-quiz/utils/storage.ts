import type { Question, QuizItem, SavedState, Session } from '../types'

export const STORAGE_KEY = 'interview-quiz:v1'
const VERSION = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** order 必須是 0..n-1 的排列 */
function isPermutation(value: unknown, length: number): value is number[] {
  if (!Array.isArray(value) || value.length !== length) return false
  const seen = new Set<number>()
  for (const n of value) {
    if (!Number.isInteger(n) || n < 0 || n >= length || seen.has(n)) return false
    seen.add(n)
  }
  return true
}

function parseSession(value: unknown, byId: ReadonlyMap<string, Question>): Session | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.answers)) return null
  if (typeof value.submitted !== 'boolean') return null

  const items: QuizItem[] = []
  const seen = new Set<string>()
  for (const raw of value.items) {
    if (!isRecord(raw) || typeof raw.questionId !== 'string' || seen.has(raw.questionId)) continue
    // 題庫更新後已刪除或選項數改變的題目直接略過
    const question = byId.get(raw.questionId)
    if (!question || !isPermutation(raw.order, question.options.length)) continue
    seen.add(raw.questionId)
    items.push({ questionId: raw.questionId, order: [...raw.order] })
  }
  if (items.length === 0) return null

  const answers: Record<string, number> = {}
  for (const [id, n] of Object.entries(value.answers)) {
    const question = byId.get(id)
    if (seen.has(id) && question && Number.isInteger(n) && (n as number) >= 0 && (n as number) < question.options.length) {
      answers[id] = n as number
    }
  }

  const current = Number.isInteger(value.current) ? Math.min(Math.max(value.current as number, 0), items.length - 1) : 0
  return { items, answers, current, submitted: value.submitted }
}

export function parseSaved(raw: string | null, byId: ReadonlyMap<string, Question>): SavedState | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed) || parsed.version !== VERSION || !isRecord(parsed.data)) return null
  const { session, mistakes } = parsed.data
  return {
    session: session === null ? null : parseSession(session, byId),
    mistakes: Array.isArray(mistakes)
      ? [...new Set(mistakes.filter((id): id is string => typeof id === 'string' && byId.has(id)))]
      : [],
  }
}

export function serialize(state: SavedState): string {
  return JSON.stringify({ version: VERSION, data: state })
}
