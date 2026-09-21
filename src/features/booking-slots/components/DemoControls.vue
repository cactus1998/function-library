<script setup lang="ts">
import { computed } from 'vue'
import { FAILURE_RATE_MAX, type BookingApiSettings } from '../services/mockBookingApi'
import { formatMinutes } from '../utils/format'
import { isPlainDate } from '../utils/plainDate'
import { zonedTime, zonedToEpoch } from '../utils/timeZone'

const props = defineProps<{
  settings: BookingApiSettings
  now: number
  shopTimeZone: string
  detectedTimeZone: string
}>()

/** null 表示使用真實時間 */
const nowOverride = defineModel<number | null>('nowOverride', { required: true })
const userTimeZone = defineModel<string>('userTimeZone', { required: true })

const TIME_ZONES = ['Asia/Taipei', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles']
const zoneOptions = computed(() => [...new Set([props.detectedTimeZone, ...TIME_ZONES])])

/** datetime-local 的值以店家時區解讀，與瀏覽器所在時區無關 */
const nowInput = computed(() => {
  const { date, minutes } = zonedTime(props.now, props.shopTimeZone)
  return `${date}T${formatMinutes(minutes)}`
})

function onNowChange(event: Event) {
  const [date, time] = (event.target as HTMLInputElement).value.split('T')
  if (!date || !time || !isPlainDate(date)) return
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return
  const epoch = zonedToEpoch(date, h! * 60 + m!, props.shopTimeZone)
  if (epoch !== null) nowOverride.value = epoch
}

function onFailureRate(event: Event) {
  props.settings.failureRate = Number((event.target as HTMLInputElement).value) / 100
}

function onForceConflict(event: Event) {
  props.settings.forceConflict = (event.target as HTMLInputElement).checked
}
</script>

<template>
  <section class="controls" aria-labelledby="controls-title">
    <h3 id="controls-title">Demo 控制</h3>

    <div class="row">
      <label for="demo-now">現在時間（台北）</label>
      <input id="demo-now" type="datetime-local" :value="nowInput" @change="onNowChange" />
      <button type="button" :disabled="nowOverride === null" @click="nowOverride = null">使用真實時間</button>
    </div>

    <div class="row">
      <label for="demo-tz">你的時區</label>
      <select id="demo-tz" v-model="userTimeZone">
        <option v-for="zone in zoneOptions" :key="zone" :value="zone">
          {{ zone }}{{ zone === detectedTimeZone ? '（偵測到）' : '' }}
        </option>
      </select>
    </div>

    <div class="row">
      <label for="demo-failure">API 失敗率 {{ Math.round(settings.failureRate * 100) }}%</label>
      <input
        id="demo-failure"
        type="range"
        min="0"
        :max="FAILURE_RATE_MAX * 100"
        step="5"
        :value="Math.round(settings.failureRate * 100)"
        @input="onFailureRate"
      />
    </div>

    <label class="check">
      <input type="checkbox" :checked="settings.forceConflict" @change="onForceConflict" />
      下一次送出時，時段被別人搶先預約（409）
    </label>

    <p class="hint">空檔每次查詢延遲 300–800ms、送出延遲 500–1000ms；同月份 60 秒內切回不重新查詢。</p>
  </section>
</template>

<style scoped>
.controls {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9375rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
}

.row label {
  min-width: 9rem;
  font-variant-numeric: tabular-nums;
}

input[type='datetime-local'],
select,
button {
  min-height: 2.75rem;
  padding: 0 0.625rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

input[type='range'] {
  flex: 1;
  min-width: 10rem;
  min-height: 2.75rem;
  accent-color: var(--accent-solid);
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  cursor: pointer;
}

.check input {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--accent-solid);
}

.hint {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}
</style>
