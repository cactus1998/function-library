export type Topic = 'js' | 'ts' | 'vue'

export type Level = 'basic' | 'intermediate' | 'advanced'

export interface Question {
  id: string
  topic: Topic
  level: Level
  prompt: string
  /** 題目附帶的程式碼片段（可選） */
  code?: string
  options: string[]
  /** 正確選項在 options 中的索引 */
  answer: number
  explanation: string
}

export interface QuizItem {
  questionId: string
  /** 畫面上第 i 個選項對應的原始 options 索引 */
  order: number[]
}

export interface Session {
  items: QuizItem[]
  /** questionId → 使用者選的原始 options 索引 */
  answers: Record<string, number>
  current: number
  submitted: boolean
}

export interface SavedState {
  session: Session | null
  /** 錯題本：依加入順序排列的 questionId */
  mistakes: string[]
}

export interface QuizConfig {
  topics: Topic[]
  levels: Level[]
  /** 題數；超過可用題數時取全部 */
  count: number
  shuffleOptions: boolean
  /** 只從錯題本出題 */
  mistakesOnly: boolean
}

export interface QuestionResult {
  question: Question
  order: number[]
  chosen: number | null
  correct: boolean
}

export interface TopicScore {
  correct: number
  total: number
}

export interface Report {
  correct: number
  total: number
  unanswered: number
  byTopic: Partial<Record<Topic, TopicScore>>
  results: QuestionResult[]
}
