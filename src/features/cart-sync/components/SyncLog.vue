<script setup lang="ts">
import { LOG_LIMIT, type SyncLogEntry } from '../plugins/syncPlugin'
import { formatTime } from '../utils/format'
import { tabLabel } from '../utils/tab'

const { entries } = defineProps<{ entries: readonly SyncLogEntry[] }>()

const KIND_LABELS: Record<SyncLogEntry['kind'], string> = {
  patch: 'patch',
  'sync-request': 'sync-request',
  storage: 'storage',
}
</script>

<template>
  <details class="sync-log">
    <summary>同步紀錄（最近 {{ entries.length }} / {{ LOG_LIMIT }} 則）</summary>
    <p v-if="entries.length === 0" class="empty">尚無訊息。</p>
    <ol v-else>
      <li v-for="entry in entries" :key="entry.id">
        <time class="time">{{ formatTime(entry.time) }}</time>
        <span class="direction" :class="entry.direction">{{ entry.direction === 'out' ? '送出' : '收到' }}</span>
        <code>{{ KIND_LABELS[entry.kind] }}</code>
        <span v-if="entry.direction === 'in' && entry.from" class="from">來自 {{ tabLabel(entry.from) }}</span>
        <span v-if="entry.detail" class="detail">{{ entry.detail }}</span>
      </li>
    </ol>
  </details>
</template>

<style scoped>
.sync-log {
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

summary {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  cursor: pointer;
}

.empty {
  margin: 0;
  padding: 0 0.75rem 0.75rem;
  color: var(--text-muted);
}

ol {
  display: grid;
  gap: 0.25rem;
  max-height: 16rem;
  margin: 0;
  padding: 0 0.75rem 0.75rem;
  overflow-y: auto;
  list-style: none;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.125rem 0.5rem;
}

.time {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.direction.out {
  color: var(--accent);
}

.direction.in {
  color: var(--info);
}

.from {
  color: var(--text-muted);
}

.detail {
  flex-basis: 100%;
  color: var(--text);
}
</style>
