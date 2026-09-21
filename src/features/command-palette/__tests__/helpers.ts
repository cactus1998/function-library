import { vi } from 'vitest'
import { effectScope } from 'vue'

/** 在 effect scope 中執行 composable，回傳結果與 stop（模擬元件 unmount） */
export function withScope<T>(factory: () => T): { result: T; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)!
  return { result, stop: () => scope.stop() }
}

export function keydown(key: string, init: KeyboardEventInit & { keyCode?: number } = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  // jsdom 的 KeyboardEventInit 不接受 keyCode，需手動覆寫
  if (init.keyCode !== undefined) Object.defineProperty(event, 'keyCode', { value: init.keyCode })
  return event
}

/**
 * jsdom 沒有實作 showModal / close / scrollIntoView。
 * 這裡模擬瀏覽器行為：close 事件以非同步 task 派送（與 Chrome 相同）。
 */
export function installDialogMocks() {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    setTimeout(() => this.dispatchEvent(new Event('close')), 0)
  }
  Element.prototype.scrollIntoView = vi.fn()
}

export function restoreDialogMocks() {
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>
  delete proto.showModal
  delete proto.close
  delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView
}
