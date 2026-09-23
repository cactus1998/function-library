<script setup lang="ts">
import type { RequestLogEntry, ServerMode, ServerSettings } from '../types'

const { settings, log } = defineProps<{
  settings: ServerSettings
  log: readonly RequestLogEntry[]
}>()

const emit = defineEmits<{ clear: [] }>()

const MODES: { value: ServerMode; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'slow-flaky', label: '不穩定（慢、50% 失敗）' },
  { value: 'error500', label: '500 伺服器錯誤' },
  { value: 'timeout', label: '沒有回應（逾時）' },
  { value: 'offline', label: '斷線' },
  { value: 'validation', label: '送出時回 422' },
]

function statusClass(entry: RequestLogEntry) {
  if (entry.status === null) return 'fail'
  return entry.status >= 400 ? 'fail' : 'ok'
}

function onMode(event: Event) {
  settings.mode = (event.target as HTMLSelectElement).value as ServerMode
}

function onLatency(event: Event) {
  settings.latency = Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="network" aria-labelledby="network-title">
    <h3 id="network-title">Demo 控制與 Network</h3>

    <div class="controls">
      <label>
        伺服器狀態
        <select :value="settings.mode" @change="onMode">
          <option v-for="m in MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </label>
      <label class="range">
        <span>基本延遲 <output>{{ settings.latency }}ms</output></span>
        <input type="range" min="0" max="3000" step="100" :value="settings.latency" @input="onLatency" />
      </label>
      <button type="button" class="btn" :disabled="log.length === 0" @click="emit('clear')">清除紀錄</button>
    </div>

    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">最近的請求</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Method</th>
            <th scope="col">URL</th>
            <th scope="col">Status</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="log.length === 0">
            <td colspan="5" class="empty">還沒有請求</td>
          </tr>
          <tr v-for="entry in log" :key="entry.id" :class="statusClass(entry)">
            <td>{{ entry.id }}</td>
            <td>{{ entry.method }}</td>
            <td class="url">{{ entry.url }}</td>
            <td>{{ entry.status ?? '' }} {{ entry.outcome }}</td>
            <td>{{ Math.round(entry.duration) }} ms</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.network {
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.network h3 {
  font-size: 0.9375rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem 1.25rem;
  margin-bottom: 0.75rem;
}

.controls label {
  display: grid;
  gap: 0.125rem;
}

select {
  padding: 0.25rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.btn {
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.table-wrap {
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

table {
  width: 100%;
  font-family: var(--mono);
  font-size: 0.75rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.25rem 0.5rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

thead th {
  position: sticky;
  top: 0;
  background: var(--surface);
}

.url {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fail td {
  color: var(--danger);
}

.empty {
  text-align: center;
  color: var(--text-muted);
}
</style>
