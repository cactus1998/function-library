<script setup lang="ts">
import { computed } from 'vue'
import type { Command, MatchRange } from '../types'
import { formatShortcut, toAriaKeyShortcuts } from '../utils/shortcut'
import HighlightText from './HighlightText.vue'

const {
  id,
  command,
  matches = [],
  active = false,
  loading = false,
  isMac = false,
} = defineProps<{
  id: string
  command: Command
  matches?: readonly MatchRange[]
  active?: boolean
  loading?: boolean
  isMac?: boolean
}>()

const emit = defineEmits<{
  select: []
  hover: []
}>()

const keys = computed(() => (command.shortcut ? formatShortcut(command.shortcut, isMac) : []))
const ariaKeyShortcuts = computed(() =>
  command.shortcut ? toAriaKeyShortcuts(command.shortcut, isMac) : undefined,
)

function onClick() {
  if (!command.disabled) emit('select')
}
</script>

<template>
  <div
    :id="id"
    class="command-item"
    :class="{ active, disabled: command.disabled, loading }"
    role="option"
    :aria-selected="active"
    :aria-disabled="command.disabled || undefined"
    :aria-busy="loading || undefined"
    :aria-keyshortcuts="ariaKeyShortcuts"
    @click="onClick"
    @pointermove="emit('hover')"
  >
    <span class="title">
      <HighlightText :text="command.title" :ranges="matches" />
      <span v-if="command.children" class="visually-hidden">，開啟子選單</span>
    </span>

    <span v-if="loading" class="spinner" aria-hidden="true" />
    <span v-else-if="keys.length" class="shortcut">
      <template v-for="(step, i) in keys" :key="i">
        <span v-if="i > 0" class="then">然後</span>
        <kbd v-for="key in step" :key="key">{{ key }}</kbd>
      </template>
    </span>
    <svg v-if="command.children" class="chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  </div>
</template>

<style scoped>
.command-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.4;
  border-radius: var(--radius);
  color: var(--text);
  cursor: pointer;
  user-select: none;
}

.command-item.active {
  color: var(--text-h);
  background: var(--accent-bg);
  box-shadow: inset 2px 0 0 var(--accent);
}

.command-item.disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shortcut {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
}

.shortcut kbd {
  font-size: 0.75rem;
}

.then {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chevron {
  flex-shrink: 0;
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
}

.spinner {
  flex-shrink: 0;
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
