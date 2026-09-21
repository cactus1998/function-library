<script setup lang="ts">
import { computed } from 'vue'
import type { Point } from '../types'

const { title, width, height, pointer, grab } = defineProps<{
  title: string
  width: number
  height: number
  pointer: Point
  grab: Point
}>()

// 只更新 transform，不動 top / left，避免觸發 layout
const style = computed(() => ({
  width: `${width}px`,
  height: `${height}px`,
  transform: `translate3d(${pointer.x - grab.x}px, ${pointer.y - grab.y}px, 0) rotate(2deg)`,
}))
</script>

<template>
  <Teleport to="body">
    <div class="drag-ghost" aria-hidden="true" :style="style">{{ title }}</div>
  </Teleport>
</template>

<style scoped>
.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  padding: 0.5rem 0.625rem;
  overflow: hidden;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  color: var(--text-h);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  will-change: transform;
  cursor: grabbing;
}
</style>
