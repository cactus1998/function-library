import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { BookingConflictError, type BookingApi, type ConfirmedBooking, type ServiceId, type Slot } from '../types'
import { normalizePhone, validateName, validatePhone } from '../utils/phone'

export type FormState = 'editing' | 'submitting' | 'confirmed'
export type SubmitResult = 'ok' | 'conflict' | 'error' | 'invalid' | 'busy'

export function useBookingForm(api: BookingApi) {
  const name = ref('')
  const phone = ref('')
  const state = ref<FormState>('editing')
  /** 按過送出才顯示錯誤，避免一開始就滿版紅字 */
  const attempted = ref(false)
  const submitError = ref<string | null>(null)
  const confirmed = shallowRef<ConfirmedBooking | null>(null)
  let controller: AbortController | null = null

  const errors = computed(() => ({ name: validateName(name.value), phone: validatePhone(phone.value) }))
  const valid = computed(() => !errors.value.name && !errors.value.phone)
  const visibleErrors = computed(() => (attempted.value ? errors.value : { name: null, phone: null }))

  async function submit(slot: Slot | null, serviceId: ServiceId): Promise<SubmitResult> {
    // 送出中直接忽略，連點只會送出一次
    if (state.value !== 'editing') return 'busy'
    attempted.value = true
    submitError.value = null
    const normalized = normalizePhone(phone.value)
    if (!slot || !valid.value || !normalized) return 'invalid'

    state.value = 'submitting'
    controller = new AbortController()
    try {
      confirmed.value = await api.createBooking(
        { serviceId, date: slot.date, start: slot.start, name: name.value.trim(), phone: normalized },
        controller.signal,
      )
      state.value = 'confirmed'
      return 'ok'
    } catch (reason) {
      state.value = 'editing'
      if (controller.signal.aborted) return 'error'
      if (reason instanceof BookingConflictError) {
        submitError.value = reason.message
        return 'conflict'
      }
      submitError.value = reason instanceof Error ? `預約失敗：${reason.message}，請再試一次` : '預約失敗，請再試一次'
      return 'error'
    } finally {
      controller = null
    }
  }

  /** 再預約一次：保留姓名電話，方便幫家人連續預約 */
  function reset() {
    state.value = 'editing'
    confirmed.value = null
    submitError.value = null
    attempted.value = false
  }

  onScopeDispose(() => controller?.abort())

  return { name, phone, state, errors: visibleErrors, valid, submitError, confirmed, submit, reset }
}
