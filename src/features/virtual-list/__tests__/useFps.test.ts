import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useFps } from '../composables/useFps'

describe('useFps', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubAnimationFrames() {
    const callbacks = new Map<number, FrameRequestCallback>()
    let nextId = 1
    const cancel = vi.fn((id: number) => callbacks.delete(id))
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callbacks.set(nextId, callback)
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', cancel)
    vi.spyOn(performance, 'now').mockReturnValue(0)

    /** 依序執行一幀，傳入該幀的時間戳 */
    const runFrame = (time: number) => {
      const pending = [...callbacks.entries()]
      callbacks.clear()
      for (const [, callback] of pending) callback(time)
    }
    return { runFrame, cancel, pendingCount: () => callbacks.size }
  }

  it('reports about 60 fps when frames arrive every 16.7ms', () => {
    const { runFrame } = stubAnimationFrames()
    const scope = effectScope()
    const { fps } = scope.run(() => useFps(500))!

    for (let frame = 1; frame <= 30; frame++) runFrame((frame * 1000) / 60)

    expect(fps.value).toBe(60)
    scope.stop()
  })

  it('reports a lower value when frames are slow', () => {
    const { runFrame } = stubAnimationFrames()
    const scope = effectScope()
    const { fps } = scope.run(() => useFps(500))!

    for (let frame = 1; frame <= 10; frame++) runFrame(frame * 50)

    expect(fps.value).toBe(20)
    scope.stop()
  })

  it('cancels the animation frame loop when the scope is disposed (EC-11)', () => {
    const { runFrame, cancel, pendingCount } = stubAnimationFrames()
    const scope = effectScope()
    scope.run(() => useFps())
    runFrame(16)

    scope.stop()

    expect(cancel).toHaveBeenCalled()
    expect(pendingCount()).toBe(0)
  })
})
