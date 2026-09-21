<script setup lang="ts">
import { computed } from 'vue'
import type { UploadStatus } from '../composables/useUpload'
import type { CroppedResult } from '../types'
import { OUTPUT_SIZE } from '../utils/encode'
import { formatBytes, formatName } from '../utils/file'

const props = defineProps<{
  result: CroppedResult
  originalBytes: number
  status: UploadStatus
  progress: number
  error: string | null
}>()

const emit = defineEmits<{ upload: []; cancel: []; retry: []; recrop: [] }>()

const percent = computed(() => Math.round(props.progress * 100))
/** live region 每 25% 宣告一次，避免每 100ms 讀一次 */
const milestone = computed(() => (props.status === 'uploading' ? `上傳中 ${Math.floor(percent.value / 25) * 25}%` : ''))
</script>

<template>
  <section class="upload" aria-labelledby="upload-title">
    <h3 id="upload-title">裁切結果</h3>
    <div class="result">
      <img :src="result.url" alt="裁切後的大頭貼" width="96" height="96" />
      <dl>
        <dt>格式</dt>
        <dd>{{ formatName(result.blob.type) }} {{ OUTPUT_SIZE }}×{{ OUTPUT_SIZE }}</dd>
        <dt>大小</dt>
        <dd>
          {{ formatBytes(result.blob.size) }}（原始 {{ formatBytes(originalBytes) }}）
          <span v-if="!result.withinBudget" class="warn">超過建議大小</span>
        </dd>
        <dt>品質</dt>
        <dd>{{ Math.round(result.quality * 100) }}%</dd>
      </dl>
    </div>

    <div v-if="status === 'uploading'" class="progress">
      <progress :value="percent" max="100" aria-label="上傳進度">{{ percent }}%</progress>
      <span>{{ percent }}%</span>
    </div>
    <p v-if="status === 'success'" class="success" role="status">已更新大頭貼</p>
    <p v-if="status === 'error'" class="error" role="alert">上傳失敗：{{ error }}</p>
    <p class="visually-hidden" aria-live="polite">{{ milestone }}</p>

    <div class="actions">
      <button v-if="status === 'uploading'" type="button" @click="emit('cancel')">取消上傳</button>
      <button v-else-if="status === 'error'" type="button" class="primary" @click="emit('retry')">重試</button>
      <button v-else-if="status === 'idle'" type="button" class="primary" @click="emit('upload')">上傳</button>
      <button type="button" @click="emit('recrop')">重新裁切</button>
    </div>
  </section>
</template>

<style scoped>
.upload {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
}

h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.result img {
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--border);
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
  font-size: 0.875rem;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.warn {
  margin-left: 0.25rem;
  color: var(--danger);
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-variant-numeric: tabular-nums;
}

progress {
  flex: 1;
  height: 0.5rem;
  accent-color: var(--accent-solid);
}

.success,
.error {
  margin: 1rem 0 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
}

.success {
  color: var(--accent);
  background: var(--accent-bg);
}

.error {
  color: var(--danger);
  background: var(--danger-bg);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

button {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}

button.primary {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
  font-weight: 600;
}
</style>
