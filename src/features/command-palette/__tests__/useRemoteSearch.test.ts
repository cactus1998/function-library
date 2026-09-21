import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useRemoteSearch } from '../composables/useRemoteSearch'
import type { Command, RemoteFetcher } from '../types'
import { withScope } from './helpers'

interface PendingRequest {
  query: string
  signal: AbortSignal
  resolve: (value: Command[]) => void
  reject: (reason: unknown) => void
}

/** 可手動決定回應順序與時機的 fetcher，用來重現競態 */
function controllableFetcher() {
  const requests: PendingRequest[] = []
  const fetcher = vi.fn<RemoteFetcher>(
    (query, signal) =>
      new Promise<Command[]>((resolve, reject) => {
        requests.push({ query, signal, resolve, reject })
      }),
  )
  return { fetcher, requests }
}

const doc = (title: string): Command => ({ id: title, title, group: 'remote' })

async function type(query: { value: string }, value: string) {
  query.value = value
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useRemoteSearch', () => {
  it('only calls the fetcher once, with the last query, after 200ms of no typing (AC-06)', async () => {
    const { fetcher } = controllableFetcher()
    const query = ref('')
    const { result } = withScope(() => useRemoteSearch(query, fetcher))

    await type(query, 'v')
    await vi.advanceTimersByTimeAsync(100)
    await type(query, 'vu')
    await vi.advanceTimersByTimeAsync(100)
    await type(query, 'vue')
    expect(result.status.value).toBe('debouncing')
    await vi.advanceTimersByTimeAsync(199)
    expect(fetcher).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith('vue', expect.any(AbortSignal))
    expect(result.status.value).toBe('loading')
  })

  it('aborts the in-flight request and discards its late response (AC-07, EC-01)', async () => {
    const { fetcher, requests } = controllableFetcher()
    const query = ref('')
    const { result } = withScope(() => useRemoteSearch(query, fetcher))

    await type(query, 'vu')
    await vi.advanceTimersByTimeAsync(200)
    const [old] = requests
    expect(old?.query).toBe('vu')

    await type(query, 'vue')
    expect(old?.signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    const latest = requests[1]!

    latest.resolve([doc('vue result')])
    await vi.runAllTimersAsync()
    // 較晚回來的「vu」回應不應覆蓋結果
    old!.resolve([doc('vu result')])
    await vi.runAllTimersAsync()

    expect(result.status.value).toBe('success')
    expect(result.results.value.map((c) => c.title)).toEqual(['vue result'])
  })

  it('exposes the error and re-sends the request on retry (AC-08)', async () => {
    const { fetcher, requests } = controllableFetcher()
    const query = ref('vue')
    const { result } = withScope(() => useRemoteSearch(query, fetcher))

    await vi.advanceTimersByTimeAsync(200)
    requests[0]!.reject(new Error('HTTP 503'))
    await vi.runAllTimersAsync()
    expect(result.status.value).toBe('error')
    expect(result.error.value?.message).toBe('HTTP 503')
    expect(result.results.value).toEqual([])

    result.retry()
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.status.value).toBe('loading')
    requests[1]!.resolve([doc('ok')])
    await vi.runAllTimersAsync()
    expect(result.status.value).toBe('success')
    expect(result.error.value).toBeNull()
  })

  it('wraps non-Error rejections in an Error', async () => {
    const query = ref('vue')
    const { result } = withScope(() => useRemoteSearch(query, () => Promise.reject('boom')))
    await vi.advanceTimersByTimeAsync(200)
    expect(result.status.value).toBe('error')
    expect(result.error.value?.message).toBe('boom')
  })

  it('returns to idle and aborts when the query is cleared (EC-18)', async () => {
    const { fetcher, requests } = controllableFetcher()
    const query = ref('vue')
    const { result } = withScope(() => useRemoteSearch(query, fetcher))
    await vi.advanceTimersByTimeAsync(200)

    await type(query, '   ')
    expect(requests[0]!.signal.aborted).toBe(true)
    expect(result.status.value).toBe('idle')
    expect(result.results.value).toEqual([])

    requests[0]!.resolve([doc('late')])
    await vi.runAllTimersAsync()
    expect(result.status.value).toBe('idle')
  })

  it('does not send a request for a query cleared during the debounce window', async () => {
    const { fetcher } = controllableFetcher()
    const query = ref('')
    withScope(() => useRemoteSearch(query, fetcher))
    await type(query, 'v')
    await type(query, '')
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('aborts the request and clears the timer when the scope is disposed', async () => {
    const { fetcher, requests } = controllableFetcher()
    const query = ref('vue')
    const { stop } = withScope(() => useRemoteSearch(query, fetcher))
    await vi.advanceTimersByTimeAsync(200)
    query.value = 'vuex'
    await nextTick()
    stop()

    expect(requests[0]!.signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
