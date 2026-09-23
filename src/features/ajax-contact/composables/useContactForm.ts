import { computed, nextTick, ref, shallowRef, watch, type Ref } from 'vue'
import { ApiError, type MessagesApi } from '../services/apiClient'
import type { FieldErrors, FieldName, Message, MessageInput } from '../types'
import { isFormControl, validityMessage } from '../utils/validity'

export type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

function emptyValues(): MessageInput {
  return { name: '', email: '', topic: 'order', message: '' }
}

function newKey(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useContactForm(api: MessagesApi, form: Readonly<Ref<HTMLFormElement | null>>, onCreated: (message: Message) => void) {
  const values = ref<MessageInput>(emptyValues())
  const clientErrors = ref<FieldErrors>({})
  const serverErrors = ref<FieldErrors>({})
  const status = shallowRef<SubmitStatus>('idle')
  const submitError = shallowRef('')
  const created = shallowRef<Message | null>(null)
  /** 同一份內容的所有重試共用一個 key；內容改了就換新的 */
  let pendingKey: string | null = null
  let controller: AbortController | null = null
  let lastSubmitted: MessageInput | null = null

  /** 前端錯誤優先；伺服器錯誤在該欄位被修改後清除 */
  const errors = computed<FieldErrors>(() => ({ ...serverErrors.value, ...clientErrors.value }))

  watch(
    values,
    (next) => {
      pendingKey = null
      for (const field of Object.keys(serverErrors.value) as FieldName[]) {
        if (next[field] !== lastSubmitted?.[field]) delete serverErrors.value[field]
      }
    },
    { deep: true },
  )

  function controlFor(field: FieldName) {
    const el = form.value?.elements.namedItem(field) ?? null
    return el instanceof Element && isFormControl(el) ? el : null
  }

  /** blur 時驗證單一欄位；還沒碰過的欄位不顯示錯誤 */
  function validateField(field: FieldName) {
    const el = controlFor(field)
    if (!el) return
    const message = validityMessage(el)
    if (message) clientErrors.value[field] = message
    else delete clientErrors.value[field]
  }

  /** 輸入時只清除已修正的錯誤，不在打字途中跳出新錯誤 */
  function revalidateIfShown(field: FieldName) {
    if (clientErrors.value[field]) validateField(field)
  }

  async function focusFirstError(fieldErrors: FieldErrors) {
    await nextTick()
    const first = (['name', 'email', 'topic', 'message'] as const).find((f) => fieldErrors[f])
    if (first) controlFor(first)?.focus()
  }

  async function submit() {
    if (status.value === 'submitting' || !form.value) return

    const next: FieldErrors = {}
    for (const field of ['name', 'email', 'topic', 'message'] as const) {
      const el = controlFor(field)
      const message = el ? validityMessage(el) : ''
      if (message) next[field] = message
    }
    clientErrors.value = next
    if (Object.keys(next).length > 0) {
      await focusFirstError(next)
      return
    }

    pendingKey ??= newKey()
    const payload: MessageInput = { ...values.value }
    lastSubmitted = payload
    controller = new AbortController()
    status.value = 'submitting'
    submitError.value = ''
    serverErrors.value = {}

    try {
      const message = await api.create(payload, pendingKey, controller.signal)
      created.value = message
      status.value = 'success'
      pendingKey = null
      values.value = emptyValues()
      clientErrors.value = {}
      onCreated(message)
    } catch (e) {
      if (controller.signal.aborted) {
        status.value = 'idle'
        return
      }
      if (e instanceof ApiError && e.kind === 'validation') {
        serverErrors.value = e.fieldErrors
        status.value = 'idle'
        await focusFirstError(e.fieldErrors)
        return
      }
      status.value = 'error'
      submitError.value = e instanceof ApiError ? e.message : '發生未預期的錯誤'
    } finally {
      controller = null
    }
  }

  function cancel() {
    controller?.abort()
  }

  function startOver() {
    status.value = 'idle'
    created.value = null
  }

  return {
    values,
    errors,
    status,
    submitError,
    created,
    validateField,
    revalidateIfShown,
    submit,
    cancel,
    startOver,
  }
}
