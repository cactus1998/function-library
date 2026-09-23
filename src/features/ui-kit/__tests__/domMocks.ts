import { vi } from 'vitest'

/** 可手動觸發的 IntersectionObserver（jsdom 沒有） */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit
  readonly observed = new Set<Element>()
  disconnected = false

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback
    this.options = options
    MockIntersectionObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.add(el)
  }

  unobserve(el: Element) {
    this.observed.delete(el)
  }

  disconnect() {
    this.observed.clear()
    this.disconnected = true
  }

  takeRecords() {
    return []
  }

  /** 對所有觀察該元素的 observer 回報交集狀態 */
  static report(target: Element, isIntersecting: boolean) {
    for (const observer of MockIntersectionObserver.instances) {
      if (!observer.observed.has(target)) continue
      const entry = { target, isIntersecting } as IntersectionObserverEntry
      observer.callback([entry], observer as unknown as IntersectionObserver)
    }
  }
}

/** matchMedia：以 query 字串設定結果，並可觸發 change */
export class MediaQueryMock {
  readonly matches = new Map<string, boolean>()
  readonly listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()

  install() {
    vi.stubGlobal('matchMedia', (query: string) => {
      const listeners = this.listeners.get(query) ?? new Set()
      this.listeners.set(query, listeners)
      return {
        get matches() {
          return mock.matches.get(query) ?? false
        },
        media: query,
        addEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => listeners.add(fn),
        removeEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => listeners.delete(fn),
      }
    })
    const mock = this
    return this
  }

  set(query: string, matches: boolean) {
    this.matches.set(query, matches)
    for (const fn of this.listeners.get(query) ?? []) fn({ matches, media: query } as MediaQueryListEvent)
  }

  listenerCount(query: string) {
    return this.listeners.get(query)?.size ?? 0
  }
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export function installDomMocks() {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  const media = new MediaQueryMock().install()
  // jsdom 的元素沒有 scrollTo
  const scrollTo = vi.fn()
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo']
  return { media, scrollTo }
}

export function restoreDomMocks() {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
}
