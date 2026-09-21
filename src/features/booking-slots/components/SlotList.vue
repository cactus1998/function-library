<script setup lang="ts">
import { computed } from 'vue'
import type { Minutes, PlainDate } from '../types'
import { formatDay, formatShortDay } from '../utils/format'
import { groupSlots, type DayPart } from '../utils/slots'

export interface SlotView {
  start: Minutes
  label: string
  /** 使用者時區與店家不同時的附註，例如「你的時間 前一天 23:00」 */
  localNote: string | null
}

const props = defineProps<{
  date: PlainDate | null
  /** null 表示載入中 */
  slots: SlotView[] | null
  serviceName: string
  /** undefined：尚未計算；null：可預約範圍內都滿了 */
  nextDate: PlainDate | null | undefined
  timeZoneNote: string | null
}>()

const emit = defineEmits<{ jump: [date: PlainDate] }>()
const selected = defineModel<Minutes | null>({ required: true })

const PARTS: { key: DayPart; label: string }[] = [
  { key: 'morning', label: '上午' },
  { key: 'afternoon', label: '下午' },
  { key: 'evening', label: '晚上' },
]

const groups = computed(() => (props.slots ? groupSlots(props.slots) : null))
</script>

<template>
  <section class="slots" aria-labelledby="slots-title">
    <h3 id="slots-title">3. 選擇時段<span v-if="date" class="date">・{{ formatDay(date) }}</span></h3>

    <p v-if="!date" class="empty">請先在日曆選擇有空檔的日期。</p>

    <div v-else-if="!slots || !groups" class="loading" aria-busy="true">
      <span v-for="n in 6" :key="n" class="chip-skeleton" />
      <span class="visually-hidden">時段載入中</span>
    </div>

    <div v-else-if="slots.length === 0" class="empty">
      <p>這天的{{ serviceName }}已約滿。</p>
      <button v-if="nextDate" type="button" class="jump" @click="emit('jump', nextDate)">
        試試 {{ formatShortDay(nextDate) }}
      </button>
      <p v-else-if="nextDate === null">近 30 天已約滿，歡迎來電詢問候補。</p>
    </div>

    <template v-else>
      <p v-if="timeZoneNote" class="tz-note">{{ timeZoneNote }}</p>
      <template v-for="part in PARTS" :key="part.key">
        <fieldset v-if="groups[part.key].length" class="group">
          <legend>{{ part.label }}</legend>
          <div class="chips">
            <label
              v-for="slot in groups[part.key]"
              :key="slot.start"
              class="chip"
              :class="{ checked: selected === slot.start }"
            >
              <input v-model="selected" type="radio" name="slot" :value="slot.start" />
              <span class="time">{{ slot.label }}</span>
              <span v-if="slot.localNote" class="local">{{ slot.localNote }}</span>
            </label>
          </div>
        </fieldset>
      </template>
    </template>
  </section>
</template>

<style scoped>
h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.date {
  font-weight: 400;
  color: var(--text-muted);
}

.empty {
  margin: 0;
  color: var(--text-muted);
}

.empty p {
  margin: 0 0 0.5rem;
}

.jump {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--accent);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  background: var(--accent-bg);
  cursor: pointer;
}

.tz-note {
  margin: 0 0 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--info);
  border-radius: var(--radius);
  background: var(--info-bg);
}

.group {
  margin: 0 0 0.75rem;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.chips,
.loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
  gap: 0.375rem;
}

.chip {
  position: relative;
  display: grid;
  place-content: center;
  justify-items: center;
  min-height: 2.75rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}

.chip:hover {
  border-color: var(--accent-solid);
}

.chip.checked {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.chip:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.chip input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.time {
  font-size: 0.875rem;
}

.local {
  font-size: 0.6875rem;
  opacity: 0.8;
}

.chip-skeleton {
  height: 2.75rem;
  border-radius: var(--radius);
  background: var(--surface);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip-skeleton {
    animation: none;
  }
}
</style>
