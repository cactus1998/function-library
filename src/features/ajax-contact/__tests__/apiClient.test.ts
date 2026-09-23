import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, backoffDelay, createMessagesApi, isRetryable, requestJson, withRetry } from '../services/apiClient'
import type { FetchLike, Message } from '../types'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** 永遠不回應，只在 signal abort 時以 AbortError 結束（模擬伺服器卡住）；與真正的 fetch 一樣，已取消的 signal 立即 reject */
const hangingFetch: FetchLike = (_input, init) =>
  new Promise((_, reject) => {
    const abort = () => reject(new DOMException('aborted', 'AbortError'))
    if (init?.signal?.aborted) return abort()
    init?.signal?.addEventListener('abort', abort)
  })

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the request to fail')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('requestJson', () => {
  it('returns parsed JSON for a 2xx response', async () => {
    const fetcher = vi.fn<FetchLike>(async () => jsonResponse(200, { ok: 1 }))
    await expect(requestJson(fetcher, '/x')).resolves.toEqual({ ok: 1 })
  })

  it('serialises the body and sets the JSON content type', async () => {
    const fetcher = vi.fn<FetchLike>(async () => jsonResponse(201, {}))
    await requestJson(fetcher, '/x', { method: 'POST', body: { a: 1 }, headers: { 'X-Test': '1' } })
    const init = fetcher.mock.calls[0]![1]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Test': '1' })
  })

  it('turns a resolved 5xx response into an http error, because fetch does not reject on it', async () => {
    const error = await errorOf(requestJson(async () => jsonResponse(503, { error: 'x' }), '/x'))
    expect(error.kind).toBe('http')
    expect(error.status).toBe(503)
  })

  it('maps 422 field errors and ignores unknown fields or non-string messages', async () => {
    const body = { errors: { email: '不接受拋棄式信箱', password: 'x', name: 42 } }
    const error = await errorOf(requestJson(async () => jsonResponse(422, body), '/x'))
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual({ email: '不接受拋棄式信箱' })
  })

  it('reports a network error when fetch itself rejects with TypeError', async () => {
    const error = await errorOf(
      requestJson(async () => {
        throw new TypeError('Failed to fetch')
      }, '/x'),
    )
    expect(error.kind).toBe('network')
  })

  it('reports a parse error for a 2xx response that is not JSON', async () => {
    const error = await errorOf(requestJson(async () => new Response('<html>', { status: 200 }), '/x'))
    expect(error.kind).toBe('parse')
  })

  it('still reports the HTTP status when an error page is not JSON', async () => {
    const error = await errorOf(requestJson(async () => new Response('<html>502</html>', { status: 502 }), '/x'))
    expect(error.kind).toBe('http')
    expect(error.status).toBe(502)
  })

  it('treats an empty 2xx body as null', async () => {
    await expect(requestJson(async () => new Response(null, { status: 204 }), '/x')).resolves.toBeNull()
  })

  it('aborts and reports a timeout when the server does not answer in time', async () => {
    vi.useFakeTimers()
    const pending = errorOf(requestJson(hangingFetch, '/x', { timeoutMs: 1000 }))
    await vi.advanceTimersByTimeAsync(1000)
    const error = await pending
    expect(error.kind).toBe('timeout')
  })

  it('reports aborted, not timeout, when the caller cancels', async () => {
    const controller = new AbortController()
    const pending = errorOf(requestJson(hangingFetch, '/x', { signal: controller.signal }))
    controller.abort()
    expect((await pending).kind).toBe('aborted')
  })

  it('passes an already-aborted signal through so the request fails as aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher = vi.fn<FetchLike>(hangingFetch)
    const error = await errorOf(requestJson(fetcher, '/x', { signal: controller.signal }))
    expect(error.kind).toBe('aborted')
    expect(fetcher.mock.calls[0]![1]!.signal!.aborted).toBe(true)
  })

  it('clears its timeout timer after the response arrives', async () => {
    vi.useFakeTimers()
    await requestJson(async () => jsonResponse(200, {}), '/x')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('isRetryable', () => {
  it('retries network errors, timeouts and 5xx only', () => {
    expect(isRetryable(new ApiError('network', ''))).toBe(true)
    expect(isRetryable(new ApiError('timeout', ''))).toBe(true)
    expect(isRetryable(new ApiError('http', '', 500))).toBe(true)
    expect(isRetryable(new ApiError('http', '', 404))).toBe(false)
    expect(isRetryable(new ApiError('validation', '', 422))).toBe(false)
    expect(isRetryable(new ApiError('aborted', ''))).toBe(false)
    expect(isRetryable(new Error('boom'))).toBe(false)
  })
})

describe('backoffDelay', () => {
  it('doubles the delay on every attempt', () => {
    const noJitter = () => 0
    expect([0, 1, 2, 3].map((n) => backoffDelay(n, 500, noJitter))).toEqual([500, 1000, 2000, 4000])
  })

  it('adds at most 30% jitter', () => {
    expect(backoffDelay(1, 500, () => 1)).toBe(1300)
    expect(backoffDelay(1, 500, () => 0.5)).toBe(1150)
  })
})

describe('withRetry', () => {
  it('retries a failing task with backoff and resolves once it succeeds', async () => {
    vi.useFakeTimers()
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError('http', '', 503))
      .mockRejectedValueOnce(new ApiError('network', ''))
      .mockResolvedValue('ok')
    const onRetry = vi.fn()

    const pending = withRetry(task, { retries: 2, baseDelay: 100, onRetry, random: () => 0 })
    await vi.advanceTimersByTimeAsync(100)
    expect(task).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(200)

    await expect(pending).resolves.toBe('ok')
    expect(task).toHaveBeenCalledTimes(3)
    expect(onRetry.mock.calls.map(([attempt, wait]) => [attempt, wait])).toEqual([
      [1, 100],
      [2, 200],
    ])
  })

  it('gives up after the configured number of retries', async () => {
    vi.useFakeTimers()
    const task = vi.fn(async () => {
      throw new ApiError('http', '', 500)
    })
    const pending = errorOf(withRetry(task, { retries: 2, baseDelay: 10, random: () => 0 }))
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).status).toBe(500)
    expect(task).toHaveBeenCalledTimes(3)
  })

  it('does not retry client errors', async () => {
    const task = vi.fn(async () => {
      throw new ApiError('http', '', 404)
    })
    await errorOf(withRetry(task, { retries: 2, baseDelay: 10 }))
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('stops waiting as soon as the signal aborts', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const task = vi.fn(async () => {
      throw new ApiError('network', '')
    })
    const pending = errorOf(withRetry(task, { retries: 5, baseDelay: 10_000, signal: controller.signal }))
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    expect((await pending).kind).toBe('aborted')
    expect(task).toHaveBeenCalledTimes(1)
  })
})

describe('createMessagesApi', () => {
  const message: Message = {
    id: 1,
    name: '王小明',
    email: 'a@example.com',
    topic: 'order',
    message: '請問耶加雪菲還有貨嗎？',
    createdAt: '2026-09-01T00:00:00.000Z',
  }

  it('builds the list query with URLSearchParams', async () => {
    const fetcher = vi.fn<FetchLike>(async () => jsonResponse(200, { items: [message], page: 2, pageSize: 5, total: 6 }))
    await createMessagesApi(fetcher).list(2, 5)
    expect(fetcher.mock.calls[0]![0]).toBe('/api/messages?page=2&pageSize=5')
  })

  it('rejects list responses that do not match the expected shape', async () => {
    const fetcher: FetchLike = async () => jsonResponse(200, { items: [{ id: '1' }], page: 1, pageSize: 5, total: 1 })
    expect((await errorOf(createMessagesApi(fetcher).list(1, 5))).kind).toBe('parse')
  })

  it('sends the idempotency key with create and never retries it automatically', async () => {
    const fetcher = vi.fn<FetchLike>(async () => jsonResponse(503, {}))
    const { name, email, topic, message: body } = message
    await errorOf(createMessagesApi(fetcher).create({ name, email, topic, message: body }, 'key-1'))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0]![1]!.headers).toMatchObject({ 'Idempotency-Key': 'key-1' })
  })
})
