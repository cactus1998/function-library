import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ContactForm from '../components/ContactForm.vue'
import { ApiError, type MessagesApi } from '../services/apiClient'
import type { Message, MessageInput } from '../types'

const created: Message = {
  id: 24,
  name: '王小明',
  email: 'ming@gmail.com',
  topic: 'order',
  message: '請問耶加雪菲還有貨嗎？',
  createdAt: '2026-09-23T00:00:00.000Z',
}

function apiWith(create: (input: MessageInput, key: string, signal?: AbortSignal) => Promise<Message>) {
  const spy = vi.fn(create)
  return { api: { list: vi.fn(), create: spy } as unknown as MessagesApi, create: spy }
}

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function mountForm(api: MessagesApi) {
  wrapper = mount(ContactForm, { props: { api }, attachTo: document.body })
  return wrapper
}

async function fillValid(w: VueWrapper) {
  await w.get('input[name="name"]').setValue('王小明')
  await w.get('input[name="email"]').setValue('ming@gmail.com')
  await w.get('textarea[name="message"]').setValue('請問耶加雪菲還有貨嗎？')
}

describe('ContactForm', () => {
  it('shows required errors and focuses the first invalid field instead of submitting', async () => {
    const { api, create } = apiWith(async () => created)
    const w = mountForm(api)
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(create).not.toHaveBeenCalled()
    expect(w.findAll('.error').map((e) => e.text())).toEqual(['此欄位必填', '此欄位必填', '此欄位必填'])
    expect(document.activeElement).toBe(w.get('input[name="name"]').element)
  })

  it('links each error to its field for screen readers', async () => {
    const w = mountForm(apiWith(async () => created).api)
    await w.get('form').trigger('submit')
    await flushPromises()

    const email = w.get('input[name="email"]')
    expect(email.attributes('aria-invalid')).toBe('true')
    const describedBy = email.attributes('aria-describedby')!
    expect(w.get(`[id="${describedBy}"]`).text()).toBe('此欄位必填')
  })

  it('applies minlength to the trimmed value, matching the server rule', async () => {
    const { api, create } = apiWith(async () => created)
    const w = mountForm(api)
    await fillValid(w)
    await w.get('input[name="name"]').setValue(' 王 ')
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(create).not.toHaveBeenCalled()
    expect(w.text()).toContain('至少 2 個字')
  })

  it('validates a field on blur and clears the error once it is fixed', async () => {
    const w = mountForm(apiWith(async () => created).api)
    const email = w.get('input[name="email"]')
    await email.setValue('not-an-email')
    await email.trigger('blur')
    expect(w.text()).toContain('Email 格式不正確')

    await email.setValue('ming@gmail.com')
    expect(w.text()).not.toContain('Email 格式不正確')
  })

  it('submits once, disables the button while sending and emits the created message', async () => {
    let finish!: (m: Message) => void
    const { api, create } = apiWith(() => new Promise((resolve) => (finish = resolve)))
    const w = mountForm(api)
    await fillValid(w)

    await w.get('form').trigger('submit')
    await w.get('form').trigger('submit')
    expect(create).toHaveBeenCalledTimes(1)
    expect(w.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    finish(created)
    await flushPromises()
    expect(w.emitted('created')).toEqual([[created]])
    expect(w.get('.done').text()).toContain('#24')
  })

  it('maps server-side 422 errors onto the matching field', async () => {
    const { api } = apiWith(async () => {
      throw new ApiError('validation', 'x', 422, { email: '不接受拋棄式信箱，請改用常用 Email' })
    })
    const w = mountForm(api)
    await fillValid(w)
    await w.get('form').trigger('submit')
    await flushPromises()

    expect(w.get('input[name="email"]').attributes('aria-invalid')).toBe('true')
    expect(w.text()).toContain('不接受拋棄式信箱')
    expect(document.activeElement).toBe(w.get('input[name="email"]').element)

    await w.get('input[name="email"]').setValue('other@gmail.com')
    expect(w.text()).not.toContain('不接受拋棄式信箱')
  })

  it('keeps the input after a failure and reuses the same idempotency key on retry', async () => {
    const { api, create } = apiWith(async () => {
      throw new ApiError('http', '伺服器暫時無法處理（504）', 504)
    })
    const w = mountForm(api)
    await fillValid(w)

    await w.get('form').trigger('submit')
    await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('504')
    expect((w.get('input[name="name"]').element as HTMLInputElement).value).toBe('王小明')
    expect(w.get('button[type="submit"]').text()).toBe('重試送出')

    await w.get('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1]![1]).toBe(create.mock.calls[0]![1])
  })

  it('uses a new idempotency key once the content changes', async () => {
    const { api, create } = apiWith(async () => {
      throw new ApiError('network', '無法連線')
    })
    const w = mountForm(api)
    await fillValid(w)
    await w.get('form').trigger('submit')
    await flushPromises()

    await w.get('textarea[name="message"]').setValue('改過的內容，至少十個字')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(create.mock.calls[1]![1]).not.toBe(create.mock.calls[0]![1])
  })

  it('can cancel an in-flight submission', async () => {
    const { api, create } = apiWith(
      (_input, _key, signal) =>
        new Promise((_, reject) => signal?.addEventListener('abort', () => reject(new ApiError('aborted', '已取消')))),
    )
    const w = mountForm(api)
    await fillValid(w)
    await w.get('form').trigger('submit')

    const cancel = w.findAll('button').find((b) => b.text() === '取消')!
    await cancel.trigger('click')
    await flushPromises()

    expect(create.mock.calls[0]![2]!.aborted).toBe(true)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.get('button[type="submit"]').text()).toBe('送出')
  })
})
