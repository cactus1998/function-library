<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useQuiz, type QuizOptions } from '../composables/useQuiz'
import type { QuizConfig } from '../types'
import QuestionCard from './QuestionCard.vue'
import QuizResult from './QuizResult.vue'
import QuizSetup from './QuizSetup.vue'

const props = defineProps<{
  /** 測試時注入題庫、storage 與亂數 */
  options?: QuizOptions
}>()

const quiz = useQuiz(props.options)
const { bank, session, mistakes, phase, currentItem, currentQuestion, unanswered, report } = quiz

const card = ref<InstanceType<typeof QuestionCard> | null>(null)
const confirming = ref(false)

const announcement = ref('')
function announce(text: string) {
  announcement.value = ''
  void nextTick(() => (announcement.value = text))
}

async function focusQuestion() {
  await nextTick()
  card.value?.focus()
}

function onStart(config: QuizConfig) {
  if (!quiz.start(config)) {
    announce('沒有符合條件的題目')
    return
  }
  confirming.value = false
  announce(`開始作答，共 ${session.value?.items.length ?? 0} 題`)
  void focusQuestion()
}

function onGo(index: number) {
  quiz.goTo(index)
  confirming.value = false
  void focusQuestion()
}

function onSubmit() {
  if (unanswered.value > 0 && !confirming.value) {
    confirming.value = true
    return
  }
  confirming.value = false
  quiz.submit()
  if (report.value) announce(`已交卷，答對 ${report.value.correct} / ${report.value.total} 題`)
}

function onRetryWrong() {
  if (quiz.retryWrong()) {
    announce(`重做 ${session.value?.items.length ?? 0} 題`)
    void focusQuestion()
  }
}

function onClearMistakes() {
  quiz.clearMistakes()
  announce('已清空錯題本')
}

const isAnswered = (questionId: string) => session.value !== null && questionId in session.value.answers
</script>

<template>
  <div class="quiz">
    <QuizSetup
      v-if="phase === 'setup'"
      :bank="bank"
      :mistakes="mistakes"
      @start="onStart"
      @clear-mistakes="onClearMistakes"
    />

    <div v-else-if="phase === 'answering' && session && currentItem && currentQuestion" class="answering">
      <nav class="nav" aria-label="題目導覽">
        <ol>
          <li v-for="(item, i) in session.items" :key="item.questionId">
            <button
              type="button"
              :class="{ answered: isAnswered(item.questionId) }"
              :aria-current="i === session.current ? 'step' : undefined"
              :aria-label="`第 ${i + 1} 題${isAnswered(item.questionId) ? '，已作答' : '，未作答'}`"
              @click="onGo(i)"
            >
              {{ i + 1 }}
            </button>
          </li>
        </ol>
        <p class="count">已作答 {{ session.items.length - unanswered }} / {{ session.items.length }}</p>
      </nav>

      <div class="panel">
        <QuestionCard
          :key="currentQuestion.id"
          ref="card"
          :question="currentQuestion"
          :order="currentItem.order"
          :chosen="session.answers[currentQuestion.id] ?? null"
          :index="session.current"
          :total="session.items.length"
          @choose="quiz.choose(currentQuestion.id, $event)"
        />

        <div class="controls">
          <button type="button" class="secondary" :disabled="session.current === 0" @click="onGo(session.current - 1)">
            上一題
          </button>
          <button
            v-if="session.current < session.items.length - 1"
            type="button"
            class="secondary"
            @click="onGo(session.current + 1)"
          >
            下一題
          </button>
          <button type="button" class="primary" @click="onSubmit">交卷對答案</button>
        </div>

        <div v-if="confirming" class="confirm" role="alert">
          <p>還有 {{ unanswered }} 題未作答，未作答會計為答錯。確定要交卷嗎？</p>
          <div class="controls">
            <button type="button" class="primary" @click="onSubmit">確定交卷</button>
            <button type="button" class="secondary" @click="confirming = false">繼續作答</button>
          </div>
        </div>

        <button type="button" class="quit" @click="quiz.quit()">放棄本回合，回到設定</button>
      </div>
    </div>

    <QuizResult
      v-else-if="phase === 'result' && report"
      :report="report"
      :mistakes-count="mistakes.length"
      @retry-wrong="onRetryWrong"
      @restart="quiz.quit()"
    />

    <div class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<style scoped>
.answering {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .answering {
    grid-template-columns: 12rem minmax(0, 1fr);
    align-items: start;
  }

  .nav {
    position: sticky;
    top: calc(var(--nav-height) + 1rem);
  }
}

.nav ol {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav button {
  width: 100%;
  min-height: 2.75rem;
  font-variant-numeric: tabular-nums;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.nav button.answered {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.nav button[aria-current='step'] {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.count {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.panel {
  display: grid;
  gap: 1rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.primary,
.secondary {
  min-height: 2.75rem;
  padding: 0 1.25rem;
  border-radius: var(--radius);
  cursor: pointer;
}

.primary {
  color: var(--on-accent);
  border: 0;
  background: var(--accent-solid);
}

.primary:hover {
  background: var(--accent-solid-hover);
}

.secondary {
  border: 1px solid var(--border-strong);
  background: var(--bg);
}

.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.controls .primary {
  margin-left: auto;
}

.confirm {
  padding: 0.75rem 1rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  background: var(--danger-bg);
}

.confirm p {
  margin: 0 0 0.5rem;
}

.confirm .primary {
  margin-left: 0;
}

.quit {
  justify-self: start;
  padding: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  border: 0;
  background: none;
  text-decoration: underline;
  cursor: pointer;
}
</style>
