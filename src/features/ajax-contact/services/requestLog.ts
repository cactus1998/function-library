import type { FetchLike, RequestLogEntry } from '../types'

/** 包一層 fetch，記錄每個請求的方法、網址、結果與耗時，模擬 DevTools 的 Network 面板 */
export function withRequestLog(fetcher: FetchLike, onEntry: (entry: RequestLogEntry) => void): FetchLike {
  let sequence = 0
  return async (input, init) => {
    const id = ++sequence
    const startedAt = performance.now()
    const method = (init?.method ?? 'GET').toUpperCase()
    const log = (status: number | null, outcome: string) =>
      onEntry({ id, method, url: input, status, outcome, duration: performance.now() - startedAt, startedAt })

    try {
      const response = await fetcher(input, init)
      log(response.status, response.statusText || (response.ok ? 'OK' : 'Error'))
      return response
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') log(null, '(canceled)')
      else log(null, '(failed) net::ERR_INTERNET_DISCONNECTED')
      throw error
    }
  }
}
