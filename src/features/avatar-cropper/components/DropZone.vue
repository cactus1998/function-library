<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { ACCEPTED_TYPES } from '../utils/file'

defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ files: [files: File[]] }>()

const input = useTemplateRef<HTMLInputElement>('input')
/** dragenter / dragleave 會在子元素間反覆觸發，用計數判斷是否真的離開 */
const depth = ref(0)

function open() {
  input.value?.click()
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('files', Array.from(target.files ?? []))
  // 清空才能重複選同一個檔案
  target.value = ''
}

function onDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  depth.value += 1
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  // 必須 preventDefault 才能成為 drop 目標
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  depth.value = Math.max(0, depth.value - 1)
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  depth.value = 0
  emit('files', Array.from(event.dataTransfer?.files ?? []))
}

defineExpose({ open })
</script>

<template>
  <div
    class="drop-zone"
    :class="{ over: depth > 0, compact }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <button type="button" class="pick" @click="open">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      <span>{{ compact ? '換一張照片' : '選擇照片' }}</span>
    </button>
    <p v-if="!compact" class="hint">或把照片拖到這裡、按 Ctrl+V 貼上・JPEG / PNG / WebP，10 MB 以內</p>
    <input
      ref="input"
      class="visually-hidden"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      :accept="ACCEPTED_TYPES.join(',')"
      @change="onChange"
    />
  </div>
</template>

<style scoped>
.drop-zone {
  display: grid;
  place-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  transition: border-color 0.15s, background-color 0.15s;
}

.drop-zone.compact {
  padding: 0;
  border: 0;
  background: none;
}

.drop-zone.over {
  border-color: var(--accent-solid);
  background: var(--accent-bg);
}

@media (prefers-reduced-motion: reduce) {
  .drop-zone {
    transition: none;
  }
}

.pick {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.25rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.compact .pick {
  color: var(--text);
  border: 1px solid var(--border-strong);
  background: var(--bg);
  font-weight: 400;
}

.pick svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}
</style>
