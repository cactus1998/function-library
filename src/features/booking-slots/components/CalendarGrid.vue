<script setup lang="ts">
import { computed, nextTick, toRef, useTemplateRef } from 'vue'
import { useCalendarNav } from '../composables/useCalendarNav'
import type { LoadStatus } from '../composables/useMonthBookings'
import type { DayInfo, PlainDate } from '../types'
import { formatDay, formatMonth } from '../utils/format'
import { monthGrid, monthOf } from '../utils/plainDate'

const props = defineProps<{
  min: PlainDate
  max: PlainDate
  today: PlainDate
  selected: PlainDate | null
  /** null 表示該日空檔還在載入 */
  infos: ReadonlyMap<PlainDate, DayInfo | null>
  status: LoadStatus
  error: string | null
}>()

const emit = defineEmits<{ select: [date: PlainDate]; retry: [] }>()
const focused = defineModel<PlainDate>('focused', { required: true })

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const nav = useCalendarNav(focused, toRef(props, 'min'), toRef(props, 'max'))
const weeks = computed(() => monthGrid(nav.visibleMonth.value))
const grid = useTemplateRef<HTMLTableElement>('grid')

function infoOf(date: PlainDate): DayInfo | null {
  return props.infos.get(date) ?? null
}

function isSelectable(date: PlainDate): boolean {
  return infoOf(date)?.status === 'available'
}

function describe(date: PlainDate): string {
  const info = infoOf(date)
  const prefix = date === props.today ? '今天，' : ''
  let state: string
  if (!info) state = '空檔載入中'
  else if (info.status === 'available') state = `剩 ${info.count} 個時段`
  else if (info.status === 'full') state = '已約滿'
  else if (info.status === 'closed') state = info.note ?? '公休'
  else state = '不在可預約範圍'
  return `${prefix}${formatDay(date)}，${state}`
}

function focusCell() {
  void nextTick(() => grid.value?.querySelector<HTMLButtonElement>(`[data-date="${focused.value}"]`)?.focus())
}

function onKeydown(event: KeyboardEvent) {
  const result = nav.onKeydown(event)
  if (result === 'moved') focusCell()
  else if (result === 'select' && isSelectable(focused.value)) emit('select', focused.value)
}

function onClick(date: PlainDate) {
  nav.moveTo(date)
  if (isSelectable(date)) emit('select', date)
}
</script>

<template>
  <section class="calendar" aria-labelledby="calendar-month">
    <div class="head">
      <button
        type="button"
        class="nav"
        :disabled="!nav.canPrev.value"
        :aria-label="`上個月，${formatMonth(nav.prevMonthLabel.value)}`"
        @click="nav.prevMonth"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" /></svg>
      </button>
      <h3 id="calendar-month" aria-live="polite">{{ formatMonth(nav.visibleMonth.value) }}</h3>
      <button
        type="button"
        class="nav"
        :disabled="!nav.canNext.value"
        :aria-label="`下個月，${formatMonth(nav.nextMonthLabel.value)}`"
        @click="nav.nextMonth"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
      </button>
    </div>

    <div class="grid-wrap">
      <table ref="grid" role="grid" aria-labelledby="calendar-month" :aria-busy="status === 'loading'" @keydown="onKeydown">
        <thead>
          <tr>
            <th v-for="(day, index) in WEEKDAYS" :key="day" scope="col" role="columnheader" :abbr="`星期${day}`">
              <span :class="{ weekend: index === 0 || index === 6 }">{{ day }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="week in weeks" :key="week[0]">
            <td
              v-for="date in week"
              :key="date"
              role="gridcell"
              :aria-selected="date === selected"
            >
              <button
                type="button"
                class="day"
                :class="[
                  infoOf(date)?.status ?? 'loading',
                  {
                    outside: monthOf(date) !== nav.visibleMonth.value,
                    today: date === today,
                    selected: date === selected,
                  },
                ]"
                :data-date="date"
                :tabindex="date === focused ? 0 : -1"
                :aria-disabled="!isSelectable(date)"
                :aria-label="describe(date)"
                @click="onClick(date)"
              >
                <span class="num">{{ Number(date.slice(8)) }}</span>
                <span class="sub" aria-hidden="true">
                  <template v-if="!infoOf(date)">&nbsp;</template>
                  <template v-else-if="infoOf(date)!.status === 'available'">剩 {{ infoOf(date)!.count }}</template>
                  <template v-else-if="infoOf(date)!.status === 'full'">滿</template>
                  <template v-else-if="infoOf(date)!.status === 'closed'">休</template>
                  <template v-else>&nbsp;</template>
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="status === 'error'" class="error" role="alert">
        <p>無法載入空檔{{ error ? `（${error}）` : '' }}</p>
        <button type="button" @click="emit('retry')">重試</button>
      </div>
    </div>

    <p class="legend" aria-hidden="true">
      <span><i class="dot available" />有空檔</span>
      <span><i class="dot full" />已約滿</span>
      <span><i class="dot closed" />公休</span>
    </p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

h3 {
  margin: 0;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.nav {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.grid-wrap {
  position: relative;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th {
  padding-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
}

.weekend {
  color: var(--danger);
}

td {
  padding: 2px;
}

.day {
  display: grid;
  place-items: center;
  align-content: center;
  width: 100%;
  min-height: 2.75rem;
  aspect-ratio: 1 / 0.9;
  padding: 0;
  color: var(--text-h);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: none;
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.day:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.num {
  font-size: 0.9375rem;
  line-height: 1.2;
}

.sub {
  font-size: 0.6875rem;
  line-height: 1.2;
  color: var(--text-muted);
}

.day.available {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.day.available .sub {
  color: var(--accent);
}

.day.available:hover {
  border-color: var(--accent-solid);
}

.day.selected {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.day.selected .sub {
  color: var(--on-accent);
}

.day.full .num {
  color: var(--text-muted);
}

/* 不只靠顏色：公休加斜線，約滿有文字 */
.day.closed .num {
  color: var(--text-muted);
  text-decoration: line-through;
}

.day.past {
  opacity: 0.35;
  cursor: default;
}

.day.full,
.day.closed {
  cursor: default;
}

.day.outside {
  opacity: 0.45;
}

.day.today .num {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.day.loading .sub {
  width: 1.75rem;
  border-radius: 999px;
  background: var(--surface);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .day.loading .sub {
    animation: none;
  }
}

.error {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.5rem;
  text-align: center;
  color: var(--danger);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
}

.error p {
  margin: 0;
}

.error button {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  cursor: pointer;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: 3px;
}

.dot.available {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.dot.closed {
  background: linear-gradient(135deg, transparent 45%, var(--text-muted) 45% 55%, transparent 55%);
}
</style>
