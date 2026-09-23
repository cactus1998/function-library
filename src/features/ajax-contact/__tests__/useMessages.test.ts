import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { useMessages } from '../composables/useMessages'
import { ApiError, type ListOptions, type MessagesApi } from '../services/apiClient'
import type { MessagePage } from '../types'

interface PendingCall {
  page: number
  signal?: AbortSignal
  resolve: (page: MessagePage) => void
  reject: (error: unknown) => void
}

/** 由測試決定每個請求何時、以什麼結果完成，用來重現「舊請求較晚回來」 */
function controllableApi() {
  const calls: PendingCall[] = []
  const api = {
    list: (page: number, _size: number, options: ListOptions = {}) =>
      new Promise<MessagePage>((resolve, reject) => {
        calls.push({ page, signal: options.signal, resolve, reject })
      }),
    create: vi.fn(),
  } as unknown as MessagesApi
  return { api, calls }
}

function pageOf(page: number, total = 23): MessagePage {
  return { items: [], page, pageSize: 5, total }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

let scope: EffectScope | null = null

function setup(api: MessagesApi) {
  scope = effectScope()
  return scope.run(() => useMessages(api))!
}

afterEach(() => {
  scope?.stop()
  scope = null
})

describe('useMessages', () => {
  it('loads the first page immediately', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    expect(list.status.value).toBe('loading')
    expect(calls.map((c) => c.page)).toEqual([1])

    calls[0]!.resolve(pageOf(1))
    await flush()
    expect(list.status.value).toBe('success')
    expect(list.totalPages.value).toBe(5)
  })

  it('aborts the previous request when switching pages', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    calls[0]!.resolve(pageOf(1))
    await flush()

    list.goTo(2)
    list.goTo(3)
    expect(calls[1]!.signal!.aborted).toBe(true)
    expect(calls[2]!.signal!.aborted).toBe(false)
  })

  it('ignores a stale response that arrives after a newer one', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    calls[0]!.resolve(pageOf(1))
    await flush()

    list.goTo(2)
    list.goTo(3)
    calls[2]!.resolve(pageOf(3))
    await flush()
    calls[1]!.resolve(pageOf(2))
    await flush()

    expect(list.page.value).toBe(3)
    expect(list.data.value!.page).toBe(3)
    expect(list.status.value).toBe('success')
  })

  it('keeps the previous page visible while the next one loads', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    calls[0]!.resolve(pageOf(1))
    await flush()

    list.goTo(2)
    expect(list.status.value).toBe('loading')
    expect(list.data.value!.page).toBe(1)
  })

  it('shows the API error message and can reload the same page', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    calls[0]!.resolve(pageOf(1))
    await flush()
    list.goTo(2)
    calls[1]!.reject(new ApiError('network', '無法連線到伺服器'))
    await flush()

    expect(list.status.value).toBe('error')
    expect(list.error.value).toBe('無法連線到伺服器')

    list.reload()
    expect(calls[2]!.page).toBe(2)
  })

  it('clamps page numbers to the available range', async () => {
    const { api, calls } = controllableApi()
    const list = setup(api)
    calls[0]!.resolve(pageOf(1))
    await flush()

    list.goTo(99)
    list.goTo(-1)
    expect(calls.slice(1).map((c) => c.page)).toEqual([5, 1])
  })

  it('aborts the in-flight request when the scope is disposed', () => {
    const { api, calls } = controllableApi()
    setup(api)
    scope!.stop()
    scope = null
    expect(calls[0]!.signal!.aborted).toBe(true)
  })
})
