import { computed, shallowRef, watch } from 'vue'
import { questions as defaultBank } from '../data/questions'
import type { Question, QuizConfig, Report, SavedState, Session } from '../types'
import { createSession, grade, retrySession, unansweredCount, updateMistakes, type Random } from '../utils/quiz'
import { parseSaved, serialize, STORAGE_KEY } from '../utils/storage'

export type Phase = 'setup' | 'answering' | 'result'

export interface QuizOptions {
  bank?: readonly Question[]
  storage?: Storage | null
  key?: string
  random?: Random
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useQuiz(options: QuizOptions = {}) {
  const bank = options.bank ?? defaultBank
  const storage = options.storage === undefined ? defaultStorage() : options.storage
  const key = options.key ?? STORAGE_KEY
  const random = options.random ?? Math.random
  const byId = new Map(bank.map((q) => [q.id, q]))

  let saved: SavedState | null = null
  try {
    saved = parseSaved(storage?.getItem(key) ?? null, byId)
  } catch {
    // storage 不可用：從頭開始
  }

  // session 每次變更都整份替換，不需要深層響應
  const session = shallowRef<Session | null>(saved?.session ?? null)
  const mistakes = shallowRef<string[]>(saved?.mistakes ?? [])

  const phase = computed<Phase>(() => {
    if (!session.value) return 'setup'
    return session.value.submitted ? 'result' : 'answering'
  })

  const currentItem = computed(() => session.value?.items[session.value.current] ?? null)
  const currentQuestion = computed(() => (currentItem.value ? (byId.get(currentItem.value.questionId) ?? null) : null))
  const unanswered = computed(() => (session.value ? unansweredCount(session.value) : 0))
  const report = computed<Report | null>(() => (session.value?.submitted ? grade(session.value, byId) : null))

  watch([session, mistakes], () => {
    try {
      storage?.setItem(key, serialize({ session: session.value, mistakes: mistakes.value }))
    } catch {
      // 容量不足或隱私模式：忽略，不影響作答
    }
  })

  /** 回傳是否成功開始；沒有符合條件的題目時回傳 false */
  function start(config: QuizConfig): boolean {
    const next = createSession(bank, config, mistakes.value, random)
    if (!next) return false
    session.value = next
    return true
  }

  function choose(questionId: string, optionIndex: number) {
    const s = session.value
    if (!s || s.submitted || !s.items.some((item) => item.questionId === questionId)) return
    const question = byId.get(questionId)
    if (!question || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) return
    session.value = { ...s, answers: { ...s.answers, [questionId]: optionIndex } }
  }

  function goTo(index: number) {
    const s = session.value
    if (!s || s.submitted) return
    const clamped = Math.min(Math.max(index, 0), s.items.length - 1)
    if (clamped !== s.current) session.value = { ...s, current: clamped }
  }

  const next = () => goTo((session.value?.current ?? 0) + 1)
  const prev = () => goTo((session.value?.current ?? 0) - 1)

  function submit() {
    const s = session.value
    if (!s || s.submitted) return
    const submitted = { ...s, submitted: true }
    session.value = submitted
    mistakes.value = updateMistakes(mistakes.value, grade(submitted, byId).results)
  }

  /** 只重做本回合答錯與未作答的題目；全對時回傳 false */
  function retryWrong(): boolean {
    const s = session.value
    if (!s || !report.value) return false
    const wrongIds = report.value.results.filter((r) => !r.correct).map((r) => r.question.id)
    const retry = retrySession(s, wrongIds)
    if (!retry) return false
    session.value = retry
    return true
  }

  /** 放棄目前回合，回到設定畫面 */
  function quit() {
    session.value = null
  }

  function clearMistakes() {
    mistakes.value = []
  }

  return {
    bank,
    session,
    mistakes,
    phase,
    currentItem,
    currentQuestion,
    unanswered,
    report,
    start,
    choose,
    goTo,
    next,
    prev,
    submit,
    retryWrong,
    quit,
    clearMistakes,
  }
}
