<script setup lang="ts">
import { ref } from 'vue'
import { LEVEL_LABELS, TOPIC_LABELS } from '../data/questions'
import type { Question } from '../types'

const props = defineProps<{
  question: Question
  order: number[]
  /** 已選的原始選項索引 */
  chosen: number | null
  index: number
  total: number
}>()

const emit = defineEmits<{
  choose: [optionIndex: number]
}>()

const heading = ref<HTMLElement | null>(null)

const promptId = `quiz-prompt-${props.question.id}`
const letter = (position: number) => String.fromCharCode(65 + position)

defineExpose({
  /** 換題後讓焦點回到題目，螢幕報讀器會從題目開始念 */
  focus: () => heading.value?.focus(),
})

function onChange(optionIndex: number) {
  if (optionIndex !== props.chosen) emit('choose', optionIndex)
}
</script>

<template>
  <section class="question" :aria-label="`第 ${index + 1} 題`">
    <p class="meta">
      <span class="badge">{{ TOPIC_LABELS[question.topic] }}</span>
      <span class="badge">{{ LEVEL_LABELS[question.level] }}</span>
      <span class="progress">第 {{ index + 1 }} / {{ total }} 題</span>
    </p>

    <h3 :id="promptId" ref="heading" class="prompt" tabindex="-1">{{ question.prompt }}</h3>
    <pre v-if="question.code" class="code"><code>{{ question.code }}</code></pre>

    <div class="options" role="radiogroup" :aria-labelledby="promptId">
      <label
        v-for="(optionIndex, position) in order"
        :key="`${question.id}-${optionIndex}`"
        class="option"
      >
        <input
          type="radio"
          :name="`quiz-${question.id}`"
          :value="optionIndex"
          :checked="chosen === optionIndex"
          @change="onChange(optionIndex)"
        />
        <span class="letter" aria-hidden="true">{{ letter(position) }}</span>
        <span class="text">{{ question.options[optionIndex] }}</span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.question {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.progress {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.prompt {
  margin: 0;
  font-size: 1.0625rem;
  line-height: 1.6;
}

.prompt:focus {
  outline: none;
}

.code {
  margin: 0;
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font: 0.875rem/1.6 var(--mono);
  border-radius: var(--radius);
  background: var(--code-bg);
}

.code code {
  padding: 0;
  background: none;
}

.options {
  display: grid;
  gap: 0.5rem;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  cursor: pointer;
}

.option:hover {
  background: var(--bg-subtle);
}

.option:has(input:checked) {
  border-color: var(--accent);
  background: var(--accent-bg);
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.letter {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
}

.option:has(input:checked) .letter {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.text {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
