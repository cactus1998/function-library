import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePointerDrag, type PointerDragOptions } from '../composables/usePointerDrag'
import { installFrames, pointer, withScope, type PointerInit } from './helpers'

let root: HTMLElement
let card: HTMLElement
let frames: ReturnType<typeof installFrames>
let options: {
  onStart: ReturnType<typeof vi.fn<PointerDragOptions['onStart']>>
  onMove: ReturnType<typeof vi.fn<PointerDragOptions['onMove']>>
  onEnd: ReturnType<typeof vi.fn<PointerDragOptions['onEnd']>>
  onCancel: ReturnType<typeof vi.fn<PointerDragOptions['onCancel']>>
}
let stop: () => void
let api: ReturnType<typeof usePointerDrag>

function setup() {
  options = { onStart: vi.fn(), onMove: vi.fn(), onEnd: vi.fn(), onCancel: vi.fn() }
  const scope = withScope(() =>
    usePointerDrag(ref(root), {
      ...options,
      resolve: (target) => {
        const el = target instanceof Element ? target.closest<HTMLElement>('[data-card-id]') : null
        return el ? { id: el.dataset.cardId!, element: el } : null
      },
    }),
  )
  api = scope.result
  stop = scope.stop
}

const down = (init: PointerInit = {}) => card.dispatchEvent(pointer('pointerdown', { x: 10, y: 10, ...init }))
const move = (init: PointerInit) => window.dispatchEvent(pointer('pointermove', init))
const up = (init: PointerInit = {}) => window.dispatchEvent(pointer('pointerup', init))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  frames = installFrames()
  root = document.createElement('div')
  card = document.createElement('div')
  card.dataset.cardId = 'A'
  root.append(card, document.createElement('p'))
  document.body.append(root)
  setup()
  // watch 以 flush: 'post' 綁定 pointerdown
  await Promise.resolve()
})

afterEach(() => {
  stop()
  root.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('usePointerDrag', () => {
  it('treats a mouse press that moves less than 5px as a click (EC-01)', () => {
    down()
    move({ x: 13, y: 12 })
    up({ x: 13, y: 12 })
    expect(options.onStart).not.toHaveBeenCalled()
    expect(api.isDragging.value).toBe(false)
  })

  it('starts dragging after the mouse moves 5px and throttles moves to one per frame', () => {
    down()
    move({ x: 15, y: 10 })
    expect(options.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', element: card, pointerType: 'mouse', point: { x: 10, y: 10 } }),
    )
    expect(api.isDragging.value).toBe(true)
    move({ x: 20, y: 10 })
    move({ x: 30, y: 40 })
    expect(options.onMove).not.toHaveBeenCalled()
    frames.flush()
    expect(options.onMove).toHaveBeenCalledTimes(1)
    expect(options.onMove).toHaveBeenLastCalledWith({ x: 30, y: 40 })
  })

  it('ends the drag on pointerup with the release point', () => {
    down()
    move({ x: 30, y: 10 })
    up({ x: 40, y: 50 })
    expect(options.onEnd).toHaveBeenCalledWith({ x: 40, y: 50 })
    expect(api.isDragging.value).toBe(false)
  })

  it('swallows the click that follows a drag, but not later clicks', () => {
    const onClick = vi.fn()
    card.addEventListener('click', onClick)
    down()
    move({ x: 30, y: 10 })
    up({ x: 30, y: 10 })
    card.click()
    expect(onClick).not.toHaveBeenCalled()
    vi.runAllTimers()
    card.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores non-primary buttons (EC-06)', () => {
    down({ button: 2 })
    move({ x: 50, y: 50 })
    expect(options.onStart).not.toHaveBeenCalled()
  })

  it('ignores presses outside draggable items', () => {
    root.querySelector('p')!.dispatchEvent(pointer('pointerdown'))
    move({ x: 50, y: 50 })
    expect(options.onStart).not.toHaveBeenCalled()
  })

  it('ignores events from a second pointer while dragging (EC-05)', () => {
    down({ pointerId: 1 })
    move({ pointerId: 1, x: 30, y: 10 })
    card.dispatchEvent(pointer('pointerdown', { pointerId: 2, isPrimary: false }))
    move({ pointerId: 2, x: 200, y: 200 })
    up({ pointerId: 2, x: 200, y: 200 })
    frames.flush()
    expect(options.onMove).toHaveBeenLastCalledWith({ x: 30, y: 10 })
    expect(options.onEnd).not.toHaveBeenCalled()
    expect(api.isDragging.value).toBe(true)
  })

  it('cancels on Escape without ending (EC-03)', () => {
    down()
    move({ x: 30, y: 10 })
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(options.onCancel).toHaveBeenCalledTimes(1)
    up({ x: 30, y: 10 })
    expect(options.onEnd).not.toHaveBeenCalled()
  })

  it('cancels on pointercancel and when the window loses focus (EC-03)', () => {
    down()
    move({ x: 30, y: 10 })
    window.dispatchEvent(pointer('pointercancel'))
    expect(options.onCancel).toHaveBeenCalledTimes(1)

    down()
    move({ x: 30, y: 10 })
    window.dispatchEvent(new Event('blur'))
    expect(options.onCancel).toHaveBeenCalledTimes(2)
  })

  describe('touch (AC-05)', () => {
    it('hands the gesture to scrolling when the finger moves before the long press', () => {
      down({ pointerType: 'touch' })
      vi.advanceTimersByTime(150)
      move({ pointerType: 'touch', x: 10, y: 20 })
      vi.advanceTimersByTime(100)
      expect(options.onStart).not.toHaveBeenCalled()
      expect(api.isDragging.value).toBe(false)
    })

    it('starts dragging after a 200ms long press', () => {
      down({ pointerType: 'touch' })
      vi.advanceTimersByTime(199)
      expect(options.onStart).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(options.onStart).toHaveBeenCalledTimes(1)
      move({ pointerType: 'touch', x: 10, y: 80 })
      frames.flush()
      expect(options.onMove).toHaveBeenLastCalledWith({ x: 10, y: 80 })
    })

    it('blocks page scrolling only once dragging has started (EC-21)', () => {
      down({ pointerType: 'touch' })
      const early = new Event('touchmove', { cancelable: true })
      window.dispatchEvent(early)
      expect(early.defaultPrevented).toBe(false)

      vi.advanceTimersByTime(200)
      const late = new Event('touchmove', { cancelable: true })
      window.dispatchEvent(late)
      expect(late.defaultPrevented).toBe(true)
    })

    it('suppresses the long-press context menu', () => {
      down({ pointerType: 'touch' })
      const menu = new Event('contextmenu', { cancelable: true })
      window.dispatchEvent(menu)
      expect(menu.defaultPrevented).toBe(true)
    })
  })

  it('removes window listeners after the drag and cancels on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    down()
    move({ x: 30, y: 10 })
    stop()
    expect(options.onCancel).toHaveBeenCalledTimes(1)
    const removed = removeSpy.mock.calls.map(([type]) => type)
    expect(removed).toEqual(expect.arrayContaining(['pointermove', 'pointerup', 'pointercancel', 'keydown', 'touchmove']))
    move({ x: 90, y: 90 })
    frames.flush()
    expect(options.onMove).not.toHaveBeenCalled()
    removeSpy.mockRestore()
  })
})
