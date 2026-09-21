import { vi } from 'vitest'

/**
 * jsdom 沒有版面計算，也沒有 ResizeObserver。
 * 這裡提供可手動觸發的 ResizeObserver，並固定 listbox 容器的 clientHeight。
 */
export class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  readonly callback: ResizeObserverCallback
  readonly observed = new Set<Element>()
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(target: Element) {
    this.observed.add(target)
  }

  unobserve(target: Element) {
    this.observed.delete(target)
  }

  disconnect() {
    this.observed.clear()
    this.disconnected = true
  }

  /** 模擬瀏覽器回報元素的新高度 */
  resize(sizes: Array<[Element, number]>) {
    const entries = sizes.map(
      ([target, blockSize]) =>
        ({
          target,
          borderBoxSize: [{ blockSize, inlineSize: 300 }],
        }) as unknown as ResizeObserverEntry,
    )
    this.callback(entries, this as unknown as ResizeObserver)
  }

  static reset() {
    MockResizeObserver.instances = []
  }
}

/** 找出觀察列元素的那一個 observer（另一個觀察的是容器） */
export function findItemObserver(): MockResizeObserver {
  const found = MockResizeObserver.instances.find((o) =>
    [...o.observed].some((el) => el.hasAttribute('data-virtual-index')),
  )
  if (!found) throw new Error('item observer not found')
  return found
}

export function installDomMocks(viewportHeight = 480) {
  MockResizeObserver.reset()
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.getAttribute('role') === 'listbox' ? viewportHeight : 0
  })
}

export function restoreDomMocks() {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}
