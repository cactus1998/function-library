<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useBookingForm } from '../composables/useBookingForm'
import { useMonthBookings } from '../composables/useMonthBookings'
import { useNow } from '../composables/useNow'
import { SCHEDULE } from '../data/schedule'
import { findService } from '../data/services'
import { createMockBookingApi, DEFAULT_FAILURE_RATE, type BookingApiSettings } from '../services/mockBookingApi'
import type { BookingApi, DayInfo, Minutes, PlainDate, ServiceId, Slot } from '../types'
import { formatDay, formatMinutes } from '../utils/format'
import { clampDate, diffDays, monthGrid, monthOf } from '../utils/plainDate'
import { bookingWindow, computeSlots, dayInfo, nextAvailableDate } from '../utils/slots'
import { localTimeZone, offsetMinutes, zonedTime, zonedToEpoch } from '../utils/timeZone'
import BookingForm from './BookingForm.vue'
import CalendarGrid from './CalendarGrid.vue'
import ConfirmationCard from './ConfirmationCard.vue'
import DemoControls from './DemoControls.vue'
import type { SlotView } from './SlotList.vue'
import SlotList from './SlotList.vue'
import ServicePicker from './ServicePicker.vue'

const props = defineProps<{
  /** 測試時注入；未提供時使用 mock API */
  api?: BookingApi
  /** 固定「現在」（epoch ms），測試與 Demo 用 */
  initialNow?: number
  userTimeZone?: string
}>()

const schedule = SCHEDULE
const settings = reactive<BookingApiSettings>({ failureRate: DEFAULT_FAILURE_RATE, forceConflict: false })
const api = props.api ?? createMockBookingApi({ schedule, settings })

const nowOverride = ref<number | null>(props.initialNow ?? null)
const now = useNow(nowOverride)
const shopNow = computed(() => zonedTime(now.value, schedule.timeZone))
const range = computed(() => bookingWindow(shopNow.value, schedule))
const min = computed(() => range.value.min)
const max = computed(() => range.value.max)

const detectedTimeZone = localTimeZone()
const userTimeZone = ref(props.userTimeZone ?? detectedTimeZone)

const serviceId = ref<ServiceId>('wash-cut')
const service = computed(() => findService(serviceId.value))

const focusedDate = ref<PlainDate>(shopNow.value.date)
const selectedDate = ref<PlainDate | null>(null)
const selectedStart = ref<Minutes | null>(null)
const month = computed(() => monthOf(focusedDate.value))

const { status, error, bookingsFor, retry, invalidate } = useMonthBookings(month, api)
const {
  name,
  phone,
  state: formState,
  errors,
  submitError,
  confirmed,
  submit: submitForm,
  reset: resetForm,
} = useBookingForm(api)

/** 同一段文字連續宣告時先清空，確保螢幕報讀器會再讀一次 */
const announcement = ref('')
function announce(text: string) {
  announcement.value = ''
  void nextTick(() => (announcement.value = text))
}

// 模擬時間改變或跨日時，可預約範圍跟著移動
watch(range, ({ min: lo, max: hi }) => {
  focusedDate.value = clampDate(focusedDate.value, lo, hi)
  if (selectedDate.value && (selectedDate.value < lo || selectedDate.value > hi)) {
    selectedDate.value = null
    selectedStart.value = null
  }
})

const baseQuery = computed(() => ({ duration: service.value.duration, schedule, now: shopNow.value }))

const dayInfos = computed(() => {
  const infos = new Map<PlainDate, DayInfo | null>()
  for (const week of monthGrid(month.value)) {
    for (const date of week) {
      const bookings = bookingsFor(date)
      if (bookings) {
        infos.set(date, dayInfo({ ...baseQuery.value, date, bookings }))
        continue
      }
      // 空檔還沒載入時，公休與超出範圍仍可直接判斷
      const info = dayInfo({ ...baseQuery.value, date, bookings: [] })
      infos.set(date, info.status === 'closed' || info.status === 'past' ? info : null)
    }
  }
  return infos
})

/** null 表示所選日期的空檔還在載入 */
const slots = computed<Slot[] | null>(() => {
  if (!selectedDate.value) return []
  const bookings = bookingsFor(selectedDate.value)
  if (!bookings || (monthOf(selectedDate.value) === month.value && status.value !== 'ready')) return null
  return computeSlots({ ...baseQuery.value, date: selectedDate.value, bookings })
})

const selectedSlot = computed(() => slots.value?.find((slot) => slot.start === selectedStart.value) ?? null)

/** 使用者時區與店家偏移不同時，才附註當地時間 */
const showLocalTime = computed(
  () => offsetMinutes(now.value, userTimeZone.value) !== offsetMinutes(now.value, schedule.timeZone),
)

function localNote(slot: Slot): string | null {
  if (!showLocalTime.value) return null
  const epoch = zonedToEpoch(slot.date, slot.start, schedule.timeZone)
  if (epoch === null) return null
  const local = zonedTime(epoch, userTimeZone.value)
  const shift = diffDays(slot.date, local.date)
  const prefix = shift < 0 ? '前一天 ' : shift > 0 ? '隔天 ' : ''
  return `你的時間 ${prefix}${formatMinutes(local.minutes)}`
}

const slotViews = computed<SlotView[] | null>(
  () =>
    slots.value?.map((slot) => ({
      start: slot.start,
      label: `${formatMinutes(slot.start)}–${formatMinutes(slot.end)}`,
      localNote: localNote(slot),
    })) ?? null,
)

const timeZoneNote = computed(() =>
  showLocalTime.value ? `時段以店家所在的台北時間為準，括號為你所在時區（${userTimeZone.value}）的時間。` : null,
)

const nextDate = computed(() => {
  if (!selectedDate.value || !slots.value || slots.value.length > 0) return undefined
  return nextAvailableDate(selectedDate.value, baseQuery.value, bookingsFor)
})

// 換服務或時間經過後，原本選的時段可能放不下或已過去
watch([slots, serviceId], ([list, id], [, previousId]) => {
  if (selectedStart.value === null || !list) return
  if (list.some((slot) => slot.start === selectedStart.value)) return
  const time = formatMinutes(selectedStart.value)
  selectedStart.value = null
  announce(
    id !== previousId
      ? `原本的 ${time} 放不下${findService(id).name}，請重新選擇`
      : `${time} 已無法預約，請重新選擇`,
  )
})

function selectDate(date: PlainDate) {
  if (date === selectedDate.value) return
  selectedDate.value = date
  selectedStart.value = null
}

function jumpTo(date: PlainDate) {
  focusedDate.value = date
  selectDate(date)
}

const summary = computed(() =>
  selectedSlot.value
    ? `${service.value.name}・${formatDay(selectedSlot.value.date)} ${formatMinutes(selectedSlot.value.start)}–${formatMinutes(selectedSlot.value.end)}`
    : null,
)

async function submit() {
  const slot = selectedSlot.value
  const result = await submitForm(slot, serviceId.value)
  if (!slot) return
  if (result === 'conflict') {
    // 保留姓名電話，只清時段並重新查詢該月
    selectedStart.value = null
    focusedDate.value = slot.date
    invalidate(monthOf(slot.date))
    announce(`${formatMinutes(slot.start)} 剛被預約走了，已重新載入空檔`)
  } else if (result === 'ok') {
    // 先清掉時段，重新載入後才不會被當成「已無法預約」而再宣告一次
    selectedStart.value = null
    invalidate(monthOf(slot.date))
    announce('預約完成')
  }
}

function bookAgain() {
  resetForm()
  selectedStart.value = null
}
</script>

<template>
  <div class="booking">
    <ServicePicker v-model="serviceId" />

    <div class="columns">
      <div class="col">
        <h3 class="step">2. 選擇日期</h3>
        <CalendarGrid
          v-model:focused="focusedDate"
          :min="min"
          :max="max"
          :today="shopNow.date"
          :selected="selectedDate"
          :infos="dayInfos"
          :status="status"
          :error="error"
          @select="selectDate"
          @retry="retry"
        />
      </div>

      <div class="col">
        <SlotList
          v-if="formState !== 'confirmed'"
          v-model="selectedStart"
          :date="selectedDate"
          :slots="slotViews"
          :service-name="service.name"
          :next-date="nextDate"
          :time-zone-note="timeZoneNote"
          @jump="jumpTo"
        />

        <ConfirmationCard
          v-if="formState === 'confirmed' && confirmed"
          :booking="confirmed"
          :service="findService(confirmed.serviceId)"
          @again="bookAgain"
        />
        <BookingForm
          v-else
          v-model:name="name"
          v-model:phone="phone"
          class="form"
          :summary="summary"
          :submitting="formState === 'submitting'"
          :errors="errors"
          :submit-error="submitError"
          @submit="submit"
        />
      </div>
    </div>

    <p class="visually-hidden" role="status">{{ announcement }}</p>

    <DemoControls
      v-model:now-override="nowOverride"
      v-model:user-time-zone="userTimeZone"
      class="controls"
      :settings="settings"
      :now="now"
      :shop-time-zone="schedule.timeZone"
      :detected-time-zone="detectedTimeZone"
    />
  </div>
</template>

<style scoped>
.booking {
  display: grid;
  gap: 1.25rem;
}

.columns {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .columns {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    align-items: start;
  }
}

.col {
  min-width: 0;
}

.step {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.form {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
</style>
