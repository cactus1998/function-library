<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { SCHEDULE } from '../data/schedule'
import type { ConfirmedBooking, Service } from '../types'
import { formatFullDay, formatMinutes, formatPrice } from '../utils/format'
import { buildIcs, downloadIcs } from '../utils/ics'

const props = defineProps<{ booking: ConfirmedBooking; service: Service }>()
const emit = defineEmits<{ again: [] }>()

const heading = useTemplateRef<HTMLHeadingElement>('heading')

// 表單被確認卡取代，焦點移到標題，鍵盤與螢幕報讀使用者不會迷失
onMounted(() => heading.value?.focus())

function addToCalendar() {
  const ics = buildIcs(props.booking, SCHEDULE, {
    summary: `髮廊預約：${props.service.name}`,
    location: 'Function Library 髮廊',
    stamp: Date.now(),
  })
  downloadIcs(ics, `booking-${props.booking.code}.ics`)
}
</script>

<template>
  <section class="card" aria-labelledby="confirm-title">
    <h3 id="confirm-title" ref="heading" tabindex="-1">預約完成</h3>
    <dl>
      <dt>預約編號</dt>
      <dd class="code">{{ booking.code }}</dd>
      <dt>服務</dt>
      <dd>{{ service.name }}（{{ formatPrice(service.price) }}）</dd>
      <dt>日期</dt>
      <dd>{{ formatFullDay(booking.date) }}</dd>
      <dt>時間</dt>
      <dd>{{ formatMinutes(booking.start) }}–{{ formatMinutes(booking.end) }}（台北時間）</dd>
      <dt>聯絡人</dt>
      <dd>{{ booking.name }}・{{ booking.phone }}</dd>
    </dl>
    <div class="actions">
      <button type="button" class="primary" @click="addToCalendar">加入行事曆（.ics）</button>
      <button type="button" @click="emit('again')">再預約一次</button>
    </div>
  </section>
</template>

<style scoped>
.card {
  padding: 1rem;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  background: var(--accent-bg);
}

h3 {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
  color: var(--accent);
}

h3:focus {
  outline: none;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.375rem 1rem;
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.code {
  font-family: var(--mono);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
}
</style>
