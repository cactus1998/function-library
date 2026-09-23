import type { Level, Question, Topic } from '../types'
import { jsQuestions } from './js'
import { tsQuestions } from './ts'
import { vueQuestions } from './vue'

export const TOPIC_LABELS: Record<Topic, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  vue: 'Vue 3',
}

export const LEVEL_LABELS: Record<Level, string> = {
  basic: '基礎',
  intermediate: '進階',
  advanced: '深入',
}

export const questions: Question[] = [...jsQuestions, ...tsQuestions, ...vueQuestions]
