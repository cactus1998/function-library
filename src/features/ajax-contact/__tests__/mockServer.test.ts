import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockServer } from '../services/mockServer'
import type { ServerSettings } from '../types'

const validInput = { name: '王小明', email: 'ming@gmail.com', topic: 'order', message: '請問耶加雪菲還有貨嗎？' }

function post(fetcher: ReturnType<typeof createMockServer>, body: unknown, key?: string) {
  return fetcher('/api/messages', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: key ? { 'Idempotency-Key': key } : {},
  })
}

let settings: ServerSettings

beforeEach(() => {
  vi.useFakeTimers()
  settings = { mode: 'normal', latency: 0 }
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** 推進模擬延遲（固定 latency 0 + 最多 200ms 抖動） */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(2500)
  return promise
}

describe('mock server', () => {
  it('pages messages newest first', async () => {
    const server = createMockServer(settings)
    const res = await settle(server('/api/messages?page=1&pageSize=5'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.total).toBe(23)
    expect(body.items.map((m: { id: number }) => m.id)).toEqual([23, 22, 21, 20, 19])

    const last = await (await settle(server('/api/messages?page=5&pageSize=5'))).json()
    expect(last.items.map((m: { id: number }) => m.id)).toEqual([3, 2, 1])
  })

  it('clamps invalid paging parameters', async () => {
    const server = createMockServer(settings)
    const body = await (await settle(server('/api/messages?page=-3&pageSize=999'))).json()
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
  })

  it('validates on the server even when the client is bypassed', async () => {
    const server = createMockServer(settings)
    const res = await settle(post(server, { name: 'a', email: 'x@mailinator.com', topic: 'nope', message: 'short' }))
    expect(res.status).toBe(422)
    const { errors } = await res.json()
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'topic'])
    expect(errors.email).toContain('拋棄式信箱')
  })

  it('trims input before validating', async () => {
    const server = createMockServer(settings)
    const res = await settle(post(server, { ...validInput, name: '  王  ' }))
    expect(res.status).toBe(422)
  })

  it('creates a message and returns 201', async () => {
    const server = createMockServer(settings)
    const res = await settle(post(server, validInput, 'k1'))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: 24, name: '王小明' })
  })

  it('returns the original message for a repeated idempotency key instead of creating another', async () => {
    const server = createMockServer(settings)
    const first = await (await settle(post(server, validInput, 'k1'))).json()
    const retry = await settle(post(server, validInput, 'k1'))
    expect(retry.status).toBe(200)
    expect((await retry.json()).id).toBe(first.id)

    const list = await (await settle(server('/api/messages?page=1&pageSize=5'))).json()
    expect(list.total).toBe(24)
  })

  it('in flaky mode can store the message but lose the response, and a retry with the same key recovers it', async () => {
    settings.mode = 'slow-flaky'
    // 第一次 Math.random 是延遲抖動，第二次決定是否失敗
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const server = createMockServer(settings)

    const lost = await settle(post(server, validInput, 'k1'))
    expect(lost.status).toBe(504)

    settings.mode = 'normal'
    const retry = await settle(post(server, validInput, 'k1'))
    expect(retry.status).toBe(200)
    const list = await (await settle(server('/api/messages?page=1&pageSize=5'))).json()
    expect(list.total).toBe(24)
  })

  it('rejects with TypeError when offline, like a real fetch', async () => {
    settings.mode = 'offline'
    const server = createMockServer(settings)
    const pending = server('/api/messages').catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(200)
    expect(await pending).toBeInstanceOf(TypeError)
  })

  it('never answers in timeout mode until the request is aborted', async () => {
    settings.mode = 'timeout'
    const server = createMockServer(settings)
    const controller = new AbortController()
    let settled = false
    const pending = server('/api/messages', { signal: controller.signal }).catch((e: unknown) => {
      settled = true
      return e
    })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(settled).toBe(false)
    controller.abort()
    const error = await pending
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
  })

  it('returns 500 in error mode and 404 for unknown routes', async () => {
    const server = createMockServer(settings)
    expect((await settle(server('/api/unknown'))).status).toBe(404)
    settings.mode = 'error500'
    expect((await settle(server('/api/messages'))).status).toBe(500)
  })
})
