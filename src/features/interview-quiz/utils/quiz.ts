import type { Question, QuestionResult, QuizConfig, Report, Session, Topic } from '../types'

export type Random = () => number

/** mulberry32：可重現的 PRNG，測試時用固定 seed 取得穩定的出題順序 */
export function createRandom(seed: number): Random {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates，回傳新陣列、不修改輸入 */
export function shuffle<T>(list: readonly T[], random: Random): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** 依設定篩出候選題目（尚未抽題與洗牌） */
export function candidates(
  bank: readonly Question[],
  config: Pick<QuizConfig, 'topics' | 'levels' | 'mistakesOnly'>,
  mistakes: readonly string[],
): Question[] {
  const topics = new Set(config.topics)
  const levels = new Set(config.levels)
  const wrong = new Set(mistakes)
  return bank.filter(
    (q) => topics.has(q.topic) && levels.has(q.level) && (!config.mistakesOnly || wrong.has(q.id)),
  )
}

/** 建立新的作答回合；沒有候選題目時回傳 null */
export function createSession(
  bank: readonly Question[],
  config: QuizConfig,
  mistakes: readonly string[],
  random: Random,
): Session | null {
  const pool = candidates(bank, config, mistakes)
  if (pool.length === 0) return null
  const count = Math.max(1, Math.min(Math.floor(config.count), pool.length))
  const picked = shuffle(pool, random).slice(0, count)
  return {
    items: picked.map((q) => {
      const indexes = q.options.map((_, i) => i)
      return { questionId: q.id, order: config.shuffleOptions ? shuffle(indexes, random) : indexes }
    }),
    answers: {},
    current: 0,
    submitted: false,
  }
}

/** 以錯題重新出題，保留原本的題目順序與選項順序 */
export function retrySession(session: Session, wrongIds: readonly string[]): Session | null {
  const wrong = new Set(wrongIds)
  const items = session.items.filter((item) => wrong.has(item.questionId))
  if (items.length === 0) return null
  return { items: items.map((item) => ({ ...item, order: [...item.order] })), answers: {}, current: 0, submitted: false }
}

export function unansweredCount(session: Session): number {
  return session.items.filter((item) => !(item.questionId in session.answers)).length
}

export function grade(session: Session, byId: ReadonlyMap<string, Question>): Report {
  const results: QuestionResult[] = []
  const byTopic: Partial<Record<Topic, { correct: number; total: number }>> = {}

  for (const item of session.items) {
    const question = byId.get(item.questionId)
    if (!question) continue
    const chosen = item.questionId in session.answers ? session.answers[item.questionId] : null
    const correct = chosen === question.answer
    results.push({ question, order: item.order, chosen, correct })
    const score = (byTopic[question.topic] ??= { correct: 0, total: 0 })
    score.total++
    if (correct) score.correct++
  }

  return {
    correct: results.filter((r) => r.correct).length,
    total: results.length,
    unanswered: results.filter((r) => r.chosen === null).length,
    byTopic,
    results,
  }
}

/**
 * 更新錯題本：答錯或未作答的題目加到最後（已存在則不重複），
 * 答對的題目移除。
 */
export function updateMistakes(mistakes: readonly string[], results: readonly QuestionResult[]): string[] {
  const right = new Set(results.filter((r) => r.correct).map((r) => r.question.id))
  const next = mistakes.filter((id) => !right.has(id))
  const seen = new Set(next)
  for (const r of results) {
    if (!r.correct && !seen.has(r.question.id)) {
      seen.add(r.question.id)
      next.push(r.question.id)
    }
  }
  return next
}

export function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}
