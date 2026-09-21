import { vi } from 'vitest'
import { effectScope } from 'vue'

export function withScope<T>(factory: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)!
  return { result, stop: () => scope.stop() }
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** jsdom 沒有 URL.createObjectURL：以計數器產生假 URL，並記錄哪些已釋放 */
export function stubObjectUrls() {
  let n = 0
  const created: string[] = []
  const revoked = new Set<string>()
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${++n}`
    created.push(url)
    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => void revoked.add(url))
  return {
    created,
    revoked,
    /** 尚未釋放的 URL */
    alive: () => created.filter((url) => !revoked.has(url)),
  }
}

export function imageFile(name = 'photo.png', type = 'image/png', bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

export const fakeSource = {} as CanvasImageSource
