<script setup lang="ts">
import { computed } from 'vue'
import type { SyncTransport } from '../plugins/syncPlugin'
import type { ValidationStatus } from '../types'
import { tabLabel } from '../utils/tab'

const props = defineProps<{
  tabId: string
  clock: number
  isLeader: boolean
  locksSupported: boolean
  transport: SyncTransport
  persistent: boolean
  status: ValidationStatus
  attempt: number
  lastError: string | null
  validating: boolean
}>()

const online = defineModel<boolean>('online', { required: true })

const emit = defineEmits<{ check: [] }>()

const TRANSPORT_LABELS: Record<SyncTransport, string> = {
  broadcast: 'BroadcastChannel',
  storage: 'storage event',
  none: '僅本分頁',
}

const role = computed(() => {
  if (!props.locksSupported) return '無 leader 選舉'
  return props.isLeader ? 'Leader' : 'Follower'
})

const statusText = computed(() => {
  if (!props.validating) return '由 leader 分頁檢查'
  switch (props.status) {
    case 'idle':
      return '閒置'
    case 'pending':
      return '等待檢查'
    case 'checking':
      return props.attempt > 0 ? `檢查中（第 ${props.attempt} 次重試）` : '檢查中'
    case 'retrying':
      return `請求失敗，準備第 ${props.attempt + 1} 次重試`
    case 'confirmed':
      return '庫存已確認'
    case 'failed':
      return '無法確認庫存'
  }
  return ''
})

const busy = computed(() => props.status === 'checking' || props.status === 'pending')
</script>

<template>
  <div class="status-bar">
    <dl class="facts">
      <div>
        <dt>分頁</dt>
        <dd>
          <strong>{{ tabLabel(tabId) }}</strong>
          <span class="badge" :class="{ leader: isLeader }">{{ role }}</span>
        </dd>
      </div>
      <div>
        <dt>傳輸</dt>
        <dd>{{ TRANSPORT_LABELS[transport] }}</dd>
      </div>
      <div>
        <dt>Lamport clock</dt>
        <dd class="mono">{{ clock }}</dd>
      </div>
      <div>
        <dt>儲存</dt>
        <dd>{{ persistent ? 'localStorage' : '不會保存' }}</dd>
      </div>
      <div>
        <dt>庫存</dt>
        <dd :class="{ danger: status === 'failed' && validating }" role="status">
          {{ statusText }}
          <span v-if="lastError && validating && status !== 'confirmed'" class="error">（{{ lastError }}）</span>
        </dd>
      </div>
    </dl>

    <div class="actions">
      <label class="toggle">
        <input v-model="online" type="checkbox" role="switch" />
        <span>{{ online ? '連線中' : '模擬離線' }}</span>
      </label>
      <button v-if="validating" type="button" :disabled="busy" @click="emit('check')">
        {{ status === 'failed' ? '重試' : '立即檢查' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin: 0;
}

dt {
  font-size: 0.75rem;
  color: var(--text-muted);
}

dd {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  color: var(--text-h);
}

.mono {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

.badge.leader {
  color: var(--on-accent);
  background: var(--accent-solid);
}

.danger,
.error {
  color: var(--danger);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  cursor: pointer;
}

.toggle input {
  width: 1rem;
  height: 1rem;
  accent-color: var(--accent-solid);
}

button {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

button:hover:not(:disabled) {
  color: var(--text-h);
  border-color: var(--accent-border);
}

button:disabled {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.6;
}
</style>
