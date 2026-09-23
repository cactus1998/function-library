<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { TOPIC_LABELS } from '../data/questions'
import type { QuestionResult, Report, Topic } from '../types'
import { percent } from '../utils/quiz'

const props = defineProps<{
  report: Report
  mistakesCount: number
}>()

const emit = defineEmits<{
  retryWrong: []
  restart: []
}>()

type Filter = 'all' | 'wrong'
const filter = ref<Filter>(props.report.correct === props.report.total ? 'all' : 'wrong')
const heading = ref<HTMLElement | null>(null)

const score = computed(() => percent(props.report.correct, props.report.total))
const wrongCount = computed(() => props.report.total - props.report.correct)
const topics = computed(() =>
  (Object.keys(TOPIC_LABELS) as Topic[]).flatMap((topic) => {
    const s = props.report.byTopic[topic]
    return s ? [{ topic, ...s, percent: percent(s.correct, s.total) }] : []
  }),
)
const shown = computed(() =>
  props.report.results
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => filter.value === 'all' || !result.correct),
)

const letter = (position: number) => String.fromCharCode(65 + position)

/** 以畫面上的字母描述選項，與作答時看到的一致 */
function describe(result: QuestionResult, optionIndex: number | null): string {
  if (optionIndex === null) return '未作答'
  const position = result.order.indexOf(optionIndex)
  return `${letter(position)}. ${result.question.options[optionIndex]}`
}

onMounted(() => heading.value?.focus())
</script>

<template>
  <section class="result" aria-labelledby="quiz-result-title">
    <div class="score-card">
      <h3 id="quiz-result-title" ref="heading" tabindex="-1">
        答對 {{ report.correct }} / {{ report.total }} 題
      </h3>
      <p class="score" :class="{ pass: score >= 60 }">{{ score }}<small>%</small></p>
      <p v-if="report.unanswered > 0" class="note">{{ report.unanswered }} 題未作答，已計為答錯。</p>
      <p class="note">錯題本目前 {{ mistakesCount }} 題；答對的錯題會自動移出。</p>

      <ul class="topics" aria-label="各主題正確率">
        <li v-for="t in topics" :key="t.topic">
          <span class="topic-name">{{ TOPIC_LABELS[t.topic] }}</span>
          <span class="bar" aria-hidden="true"><span :style="{ width: `${t.percent}%` }" /></span>
          <span class="topic-score">{{ t.correct }} / {{ t.total }}</span>
        </li>
      </ul>

      <div class="actions">
        <button v-if="wrongCount > 0" type="button" class="primary" @click="emit('retryWrong')">
          重做錯的 {{ wrongCount }} 題
        </button>
        <button type="button" class="secondary" @click="emit('restart')">重新出題</button>
      </div>
    </div>

    <div class="review">
      <div class="filter" role="group" aria-label="篩選題目">
        <button type="button" :aria-pressed="filter === 'wrong'" @click="filter = 'wrong'">
          只看答錯（{{ wrongCount }}）
        </button>
        <button type="button" :aria-pressed="filter === 'all'" @click="filter = 'all'">
          全部（{{ report.total }}）
        </button>
      </div>

      <p v-if="shown.length === 0" class="empty">全部答對，沒有錯題。</p>

      <ol v-else class="items">
        <li v-for="{ result, index } in shown" :key="result.question.id" class="item" :class="result.correct ? 'ok' : 'ng'">
          <p class="item-head">
            <span class="mark">{{ result.correct ? '答對' : '答錯' }}</span>
            <span class="num">第 {{ index + 1 }} 題</span>
            <span class="badge">{{ TOPIC_LABELS[result.question.topic] }}</span>
          </p>
          <p class="item-prompt">{{ result.question.prompt }}</p>
          <pre v-if="result.question.code" class="code"><code>{{ result.question.code }}</code></pre>
          <dl class="answers">
            <template v-if="!result.correct">
              <dt>你的答案</dt>
              <dd class="yours">{{ describe(result, result.chosen) }}</dd>
            </template>
            <dt>正確答案</dt>
            <dd class="right">{{ describe(result, result.question.answer) }}</dd>
          </dl>
          <p class="explanation">{{ result.question.explanation }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.result {
  --ok: #16a34a;
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .result {
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: start;
  }

  .score-card {
    position: sticky;
    top: calc(var(--nav-height) + 1rem);
  }
}

.score-card,
.item {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

.score-card h3 {
  margin: 0;
}

.score-card h3:focus {
  outline: none;
}

.score {
  margin: 0.25rem 0;
  font: 600 2.75rem/1.2 var(--display);
  color: var(--danger);
  font-variant-numeric: tabular-nums;
}

.score.pass {
  color: var(--ok);
}

.score small {
  font-size: 1.25rem;
}

.note {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.topics {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
  padding: 0;
  list-style: none;
}

.topics li {
  display: grid;
  grid-template-columns: 6rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.bar {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface);
}

.bar span {
  display: block;
  height: 100%;
  background: var(--accent-solid);
}

.topic-score {
  font-variant-numeric: tabular-nums;
}

.actions,
.filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.primary,
.secondary,
.filter button {
  min-height: 2.75rem;
  padding: 0 1rem;
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

.secondary,
.filter button {
  border: 1px solid var(--border-strong);
  background: var(--bg);
}

.filter button[aria-pressed='true'] {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.review {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  color: var(--text-muted);
}

.items {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  gap: 0.5rem;
  border-left-width: 4px;
}

.item.ok {
  border-left-color: var(--ok);
}

.item.ng {
  border-left-color: var(--danger);
}

.item p {
  margin: 0;
}

.item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.mark {
  font-weight: 600;
}

.ok .mark {
  color: var(--ok);
}

.ng .mark {
  color: var(--danger);
}

.num {
  color: var(--text-muted);
}

.item-prompt {
  font-weight: 600;
  color: var(--text-h);
}

.code {
  margin: 0;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font: 0.8125rem/1.6 var(--mono);
  border-radius: var(--radius);
  background: var(--code-bg);
}

.code code {
  padding: 0;
  background: none;
}

.answers {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
  font-size: 0.9375rem;
}

.answers dt {
  color: var(--text-muted);
}

.answers dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.yours {
  color: var(--danger);
}

.right {
  color: var(--ok);
  font-weight: 600;
}

.explanation {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: var(--radius);
  background: var(--info-bg);
}
</style>
