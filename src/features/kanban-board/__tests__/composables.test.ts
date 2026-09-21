import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAutoScroll } from '../composables/useAutoScroll'
import { useHistoryShortcuts } from '../composables/useHistoryShortcuts'
import { usePersistedBoard } from '../composables/usePersistedBoard'
import { useBoardStore } from '../stores/board'
import { serializeBoard, STORAGE_KEY } from '../utils/persist'
import { createSeedBoard } from '../utils/seed'
import { board, installFrames, keydown, withScope } from './helpers'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('useAutoScroll (AC-04)', () => {
  function scrollable() {
    const el = document.createElement('div')
    Object.defineProperties(el, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 400 },
    })
    el.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 400, width: 200, height: 400, x: 0, y: 0, toJSON: () => ({}) })
    return el
  }

  it('keeps scrolling each frame while the pointer rests near the bottom edge, at most 16px per frame', () => {
    const frames = installFrames()
    const el = scrollable()
    const { result, stop } = withScope(() => useAutoScroll(() => [{ el, axis: 'y' }]))
    result.update({ x: 100, y: 395 })
    const positions: number[] = []
    for (let i = 0; i < 5; i++) {
      frames.flush()
      positions.push(el.scrollTop)
    }
    const steps = positions.map((p, i) => p - (positions[i - 1] ?? 0))
    expect(steps.every((step) => step > 0 && step <= 16)).toBe(true)
    stop()
  })

  it('does not scroll when the pointer is away from the edge or in another column', () => {
    const frames = installFrames()
    const el = scrollable()
    const { result, stop } = withScope(() => useAutoScroll(() => [{ el, axis: 'y' }]))
    result.update({ x: 100, y: 200 })
    frames.flush()
    result.update({ x: 500, y: 395 })
    frames.flush()
    expect(el.scrollTop).toBe(0)
    expect(frames.pending).toBe(0)
    stop()
  })

  it('stops scheduling frames after stop()', () => {
    const frames = installFrames()
    const el = scrollable()
    const { result, stop } = withScope(() => useAutoScroll(() => [{ el, axis: 'y' }]))
    result.update({ x: 100, y: 395 })
    frames.flush()
    result.stop()
    frames.flush()
    const at = el.scrollTop
    frames.flush()
    expect(el.scrollTop).toBe(at)
    stop()
  })
})

describe('useHistoryShortcuts', () => {
  function setup(isMac = false) {
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const scope = withScope(() => useHistoryShortcuts({ isMac, onUndo, onRedo }))
    return { onUndo, onRedo, stop: scope.stop }
  }

  it('maps Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y on Windows', () => {
    const { onUndo, onRedo, stop } = setup(false)
    const event = keydown('z', { ctrlKey: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    window.dispatchEvent(keydown('Z', { ctrlKey: true, shiftKey: true }))
    window.dispatchEvent(keydown('y', { ctrlKey: true }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(2)
    stop()
  })

  it('uses ⌘ on macOS and ignores Ctrl there', () => {
    const { onUndo, stop } = setup(true)
    window.dispatchEvent(keydown('z', { ctrlKey: true }))
    expect(onUndo).not.toHaveBeenCalled()
    window.dispatchEvent(keydown('z', { metaKey: true }))
    expect(onUndo).toHaveBeenCalledTimes(1)
    stop()
  })

  it('leaves Ctrl+Z to the browser inside text inputs (EC-15)', () => {
    const { onUndo, stop } = setup()
    const input = document.createElement('input')
    document.body.append(input)
    const event = keydown('z', { ctrlKey: true })
    input.dispatchEvent(event)
    expect(onUndo).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    stop()
  })

  it('removes the listener on unmount', () => {
    const { onUndo, stop } = setup()
    stop()
    window.dispatchEvent(keydown('z', { ctrlKey: true }))
    expect(onUndo).not.toHaveBeenCalled()
  })
})

describe('usePersistedBoard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('restores a saved board on first use', () => {
    const saved = board({ done: ['Z'] })
    localStorage.setItem(STORAGE_KEY, serializeBoard(saved))
    const store = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(store))
    expect(store.board.columns.done).toEqual(['Z'])
    stop()
  })

  it('falls back to the seed board when saved data is corrupted (EC-18)', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    const store = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(store))
    expect(store.board).toEqual(createSeedBoard())
    stop()
  })

  it('keeps working when localStorage throws (EC-18)', async () => {
    vi.useFakeTimers()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const store = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(store))
    store.moveCard('seed-1', { column: 'done', index: 0 })
    await nextTick()
    expect(() => vi.advanceTimersByTime(300)).not.toThrow()
    expect(store.board.columns.done[0]).toBe('seed-1')
    stop()
  })

  it('debounces writes by 300ms', async () => {
    vi.useFakeTimers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(store))
    store.moveCard('seed-1', { column: 'done', index: 0 })
    await nextTick()
    vi.advanceTimersByTime(200)
    store.moveCard('seed-2', { column: 'done', index: 0 })
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).data.columns.done.slice(0, 2)).toEqual(['seed-2', 'seed-1'])
    stop()
  })

  it('flushes the pending write on pagehide and on unmount', async () => {
    vi.useFakeTimers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(store))
    store.removeCard('seed-1')
    await nextTick()
    window.dispatchEvent(new Event('pagehide'))
    expect(setItem).toHaveBeenCalledTimes(1)

    store.removeCard('seed-2')
    await nextTick()
    stop()
    expect(setItem).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(1000)
    expect(setItem).toHaveBeenCalledTimes(2)
  })

  it('persists the board but not the history (AC-08)', async () => {
    vi.useFakeTimers()
    const first = useBoardStore()
    const scope = withScope(() => usePersistedBoard(first))
    first.removeCard('seed-2')
    await nextTick()
    scope.stop()

    // 模擬重新整理：新的 Pinia、新的 store
    setActivePinia(createPinia())
    const reloaded = useBoardStore()
    const { stop } = withScope(() => usePersistedBoard(reloaded))
    expect(reloaded.board.cards['seed-2']).toBeUndefined()
    expect(reloaded.canUndo).toBe(false)
    expect(reloaded.undo()).toBeNull()
    stop()
  })

  it('does not reload from storage when the page is revisited in the same session', () => {
    const store = useBoardStore()
    const first = withScope(() => usePersistedBoard(store))
    store.moveCard('seed-1', { column: 'done', index: 0 })
    first.stop()
    localStorage.setItem(STORAGE_KEY, serializeBoard(board({ todo: ['Other'] })))
    const second = withScope(() => usePersistedBoard(store))
    expect(store.canUndo).toBe(true)
    expect(store.board.columns.done[0]).toBe('seed-1')
    second.stop()
  })
})
