<script setup lang="ts">
import { computed } from 'vue'
import type { MatchRange } from '../types'
import { toSegments } from '../utils/highlight'

const { text, ranges = [] } = defineProps<{
  text: string
  ranges?: readonly MatchRange[]
}>()

const segments = computed(() => toSegments(text, ranges))
</script>

<template>
  <span class="highlight-text">
    <template v-for="(segment, i) in segments" :key="i">
      <mark v-if="segment.hit">{{ segment.text }}</mark>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>

<style scoped>
mark {
  padding: 0;
  font-weight: 600;
  color: var(--accent);
  background: none;
}
</style>
