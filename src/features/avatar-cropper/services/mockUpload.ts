import type { Uploader } from '../types'

export interface MockUploaderOptions {
  /** 每次讀取時才取值，Demo 控制可以即時調整 */
  failureRate?: () => number
  random?: () => number
  /** 每個 tick 上傳的位元組數，模擬約 320 KB/s */
  chunk?: number
  interval?: number
}

function abortError(): DOMException {
  return new DOMException('The upload was aborted', 'AbortError')
}

/**
 * 模擬上傳：每個 interval 回報一次進度，介面與 XMLHttpRequest 的 upload.onprogress 相同。
 * 失敗會發生在上傳過程中（約一半時），比「一開始就失敗」更接近真實的網路中斷。
 */
export function createMockUploader(options: MockUploaderOptions = {}): Uploader {
  const failureRate = options.failureRate ?? (() => 0.2)
  const random = options.random ?? Math.random
  const chunk = options.chunk ?? 32 * 1024
  const interval = options.interval ?? 100

  return (blob, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(abortError())
        return
      }
      const total = blob.size
      const failAt = random() < failureRate() ? total * 0.5 : Infinity
      let loaded = 0
      onProgress(0, total)

      const timer = setInterval(() => {
        loaded = Math.min(total, loaded + chunk)
        if (loaded >= failAt) {
          cleanup()
          reject(new Error('網路連線中斷'))
          return
        }
        onProgress(loaded, total)
        if (loaded >= total) {
          cleanup()
          resolve({ url: `https://example.com/avatars/${Date.now().toString(36)}.webp` })
        }
      }, interval)

      function onAbort() {
        cleanup()
        reject(abortError())
      }

      function cleanup() {
        clearInterval(timer)
        signal.removeEventListener('abort', onAbort)
      }

      signal.addEventListener('abort', onAbort, { once: true })
    })
}
