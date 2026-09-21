<script setup lang="ts">
import { computed } from 'vue'
import type { Difficulty } from '../features/types'

const LEVELS: Record<Difficulty, { label: string; value: number }> = {
  basic: { label: '基礎', value: 1 },
  intermediate: { label: '中階', value: 2 },
  advanced: { label: '進階', value: 3 },
}

const { level } = defineProps<{ level: Difficulty }>()

const info = computed(() => LEVELS[level])
</script>

<template>
  <span class="difficulty">
    <span class="bars" aria-hidden="true">
      <span v-for="n in 3" :key="n" class="bar" :class="{ on: n <= info.value }" />
    </span>
    {{ info.label }}
  </span>
</template>

<style scoped>
.difficulty {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  white-space: nowrap;
}

.bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 0.75rem;
}

.bar {
  width: 3px;
  border-radius: 1px;
  background: var(--border-strong);
}

.bar:nth-child(1) {
  height: 40%;
}

.bar:nth-child(2) {
  height: 70%;
}

.bar:nth-child(3) {
  height: 100%;
}

.bar.on {
  background: var(--accent);
}
</style>
