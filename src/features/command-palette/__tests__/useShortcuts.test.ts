import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { SEQUENCE_TIMEOUT, useShortcuts } from '../composables/useShortcuts'
import type { ShortcutBinding } from '../types'
import { keydown, withScope } from './helpers'

function setup(shortcuts: string[], options: { isMac?: boolean; enabled?: boolean } = {}) {
  const handlers = Object.fromEntries(shortcuts.map((s) => [s, vi.fn()]))
  const bindings = ref<ShortcutBinding[]>(shortcuts.map((shortcut) => ({ shortcut, handler: handlers[shortcut]! })))
  const enabled = ref(options.enabled ?? true)
  const scope = withScope(() => useShortcuts(bindings, { enabled, isMac: options.isMac ?? false }))
  return { handlers, enabled, bindings, ...scope }
}

function press(key: string, init: KeyboardEventInit & { keyCode?: number } = {}, target: EventTarget = document.body) {
  const event = keydown(key, init)
  target.dispatchEvent(event)
  return event
}

let input: HTMLInputElement

beforeEach(() => {
  vi.useFakeTimers()
  input = document.createElement('input')
  document.body.append(input)
})

afterEach(() => {
  input.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useShortcuts', () => {
  it('fires a mod combo with Ctrl on Windows and Meta on macOS, and prevents default', () => {
    const win = setup(['mod+shift+l'])
    expect(press('l', { ctrlKey: true, metaKey: true, shiftKey: true }).defaultPrevented).toBe(false)
    const event = press('L', { ctrlKey: true, shiftKey: true })
    expect(win.handlers['mod+shift+l']).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    win.stop()

    const mac = setup(['mod+shift+l'], { isMac: true })
    press('l', { ctrlKey: true, shiftKey: true })
    expect(mac.handlers['mod+shift+l']).not.toHaveBeenCalled()
    press('l', { metaKey: true, shiftKey: true })
    expect(mac.handlers['mod+shift+l']).toHaveBeenCalledTimes(1)
    mac.stop()
  })

  it('requires modifiers to match exactly', () => {
    const { handlers, stop } = setup(['mod+k'])
    press('k', { ctrlKey: true, shiftKey: true })
    press('k')
    expect(handlers['mod+k']).not.toHaveBeenCalled()
    stop()
  })

  it('fires a sequence when the second key comes within 1000ms (AC-09)', () => {
    const { handlers, stop } = setup(['g h'])
    press('g')
    vi.advanceTimersByTime(SEQUENCE_TIMEOUT - 1)
    press('h')
    expect(handlers['g h']).toHaveBeenCalledTimes(1)
    stop()
  })

  it('resets the sequence after the timeout (EC-14)', () => {
    const { handlers, stop } = setup(['g h'])
    press('g')
    vi.advanceTimersByTime(SEQUENCE_TIMEOUT + 1)
    press('h')
    expect(handlers['g h']).not.toHaveBeenCalled()
    stop()
  })

  it('resets the sequence when another key interrupts it, but lets that key start a new one (EC-14)', () => {
    const { handlers, stop } = setup(['g h'])
    press('g')
    press('x')
    press('h')
    expect(handlers['g h']).not.toHaveBeenCalled()

    press('x')
    press('g')
    press('h')
    expect(handlers['g h']).toHaveBeenCalledTimes(1)
    stop()
  })

  it('distinguishes sequences sharing the same prefix', () => {
    const { handlers, stop } = setup(['g h', 'g d'])
    press('g')
    press('d')
    expect(handlers['g d']).toHaveBeenCalledTimes(1)
    expect(handlers['g h']).not.toHaveBeenCalled()
    stop()
  })

  it('ignores sequences in editable elements but still fires mod combos (EC-13)', () => {
    const { handlers, stop } = setup(['g h', 'mod+k'])
    press('g', {}, input)
    press('h', {}, input)
    expect(handlers['g h']).not.toHaveBeenCalled()
    press('k', { ctrlKey: true }, input)
    expect(handlers['mod+k']).toHaveBeenCalledTimes(1)
    stop()
  })

  it('ignores keys pressed during IME composition (EC-02)', () => {
    const { handlers, stop } = setup(['g h'])
    press('g', { isComposing: true })
    press('h', { keyCode: 229 })
    press('h')
    expect(handlers['g h']).not.toHaveBeenCalled()
    stop()
  })

  it('does nothing while disabled and drops a half-typed sequence when disabled (EC-15)', async () => {
    const { handlers, enabled, stop } = setup(['g h'])
    press('g')
    enabled.value = false
    await nextTick()
    press('h')
    enabled.value = true
    await nextTick()
    press('h')
    expect(handlers['g h']).not.toHaveBeenCalled()
    stop()
  })

  it('warns about duplicates in dev and keeps the first registration (EC-16)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = vi.fn()
    const second = vi.fn()
    const bindings = ref<ShortcutBinding[]>([
      { shortcut: 'mod+k', handler: first },
      { shortcut: 'MOD+K', handler: second },
    ])
    const { stop } = withScope(() => useShortcuts(bindings, { enabled: ref(true), isMac: false }))
    press('k', { ctrlKey: true })
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('重複註冊'))
    stop()
  })

  it('removes the keydown listener when the scope is disposed', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { handlers, stop } = setup(['mod+k'])
    stop()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
    press('k', { ctrlKey: true })
    expect(handlers['mod+k']).not.toHaveBeenCalled()
  })
})
