<script setup lang="ts">
import { computed, ref } from 'vue'
import { LEVEL_LABELS, TOPIC_LABELS } from '../data/questions'
import type { Level, Question, QuizConfig, Topic } from '../types'
import { candidates } from '../utils/quiz'

const props = defineProps<{
  bank: readonly Question[]
  mistakes: readonly string[]
}>()

const emit = defineEmits<{
  start: [config: QuizConfig]
  clearMistakes: []
}>()

const TOPICS = Object.keys(TOPIC_LABELS) as Topic[]
const LEVELS = Object.keys(LEVEL_LABELS) as Level[]
const COUNTS = [5, 10, 20, 30] as const

const topics = ref<Topic[]>([...TOPICS])
const levels = ref<Level[]>([...LEVELS])
/** 0 代表全部 */
const count = ref<number>(10)
const shuffleOptions = ref(true)
const mistakesOnly = ref(false)

// 各選項旁的題數依另一組已勾選的條件計算，勾選前就知道會多幾題
const topicCount = (topic: Topic) =>
  props.bank.filter((q) => q.topic === topic && levels.value.includes(q.level)).length
const levelCount = (level: Level) =>
  props.bank.filter((q) => q.level === level && topics.value.includes(q.topic)).length
const available = computed(
  () =>
    candidates(
      props.bank,
      { topics: topics.value, levels: levels.value, mistakesOnly: mistakesOnly.value },
      props.mistakes,
    ).length,
)

const error = computed(() => {
  if (topics.value.length === 0) return '請至少選擇一個主題'
  if (levels.value.length === 0) return '請至少選擇一個難度'
  if (available.value === 0) return mistakesOnly.value ? '所選條件沒有錯題' : '所選條件沒有題目'
  return null
})

function onSubmit() {
  if (error.value) return
  emit('start', {
    topics: [...topics.value],
    levels: [...levels.value],
    count: count.value === 0 ? available.value : count.value,
    shuffleOptions: shuffleOptions.value,
    mistakesOnly: mistakesOnly.value,
  })
}
</script>

<template>
  <form class="setup" @submit.prevent="onSubmit">
    <fieldset>
      <legend>主題</legend>
      <div class="chips">
        <label v-for="topic in TOPICS" :key="topic" class="chip">
          <input v-model="topics" type="checkbox" :value="topic" />
          <span>{{ TOPIC_LABELS[topic] }}</span>
          <small>{{ topicCount(topic) }} 題</small>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>難度</legend>
      <div class="chips">
        <label v-for="level in LEVELS" :key="level" class="chip">
          <input v-model="levels" type="checkbox" :value="level" />
          <span>{{ LEVEL_LABELS[level] }}</span>
          <small>{{ levelCount(level) }} 題</small>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>題數</legend>
      <div class="chips">
        <label v-for="n in COUNTS" :key="n" class="chip">
          <input v-model="count" type="radio" name="quiz-count" :value="n" />
          <span>{{ n }} 題</span>
        </label>
        <label class="chip">
          <input v-model="count" type="radio" name="quiz-count" :value="0" />
          <span>全部</span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>選項</legend>
      <label class="toggle">
        <input v-model="shuffleOptions" type="checkbox" />
        打亂選項順序（避免背答案位置）
      </label>
      <label class="toggle">
        <input v-model="mistakesOnly" type="checkbox" :disabled="mistakes.length === 0" />
        只練錯題本（{{ mistakes.length }} 題）
      </label>
      <button
        v-if="mistakes.length > 0"
        type="button"
        class="link"
        @click="mistakesOnly = false; emit('clearMistakes')"
      >
        清空錯題本
      </button>
    </fieldset>

    <p class="summary" aria-live="polite">
      <template v-if="error"><span class="error">{{ error }}</span></template>
      <template v-else>
        可出 {{ available }} 題，本次作答 {{ count === 0 ? available : Math.min(count, available) }} 題
      </template>
    </p>

    <button type="submit" class="primary" :disabled="error !== null">開始作答</button>
  </form>
</template>

<style scoped>
.setup {
  display: grid;
  gap: 1rem;
  max-width: 640px;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

fieldset {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.375rem;
  font-weight: 600;
  color: var(--text-h);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0 0.875rem;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  cursor: pointer;
}

.chip:has(input:checked) {
  color: var(--accent);
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.chip:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chip small {
  color: var(--text-muted);
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  cursor: pointer;
}

.toggle:has(input:disabled) {
  color: var(--text-muted);
  cursor: not-allowed;
}

.link {
  justify-self: start;
  padding: 0;
  color: var(--danger);
  border: 0;
  background: none;
  text-decoration: underline;
  cursor: pointer;
}

.summary {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.error {
  color: var(--danger);
}

.primary {
  justify-self: start;
  min-height: 2.75rem;
  padding: 0 1.5rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  cursor: pointer;
}

.primary:hover:not(:disabled) {
  background: var(--accent-solid-hover);
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
