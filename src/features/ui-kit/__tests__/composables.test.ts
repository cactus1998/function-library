import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useMediaQuery } from '../composables/useMediaQuery'
import { installDomMocks, restoreDomMocks, type MediaQueryMock } from './domMocks'

let media: MediaQueryMock

beforeEach(() => {
  ;({ media } = installDomMocks())
})

afterEach(() => {
  restoreDomMocks()
})

describe('useMediaQuery', () => {
  it('reads the initial result and follows changes', () => {
    media.set('(min-width: 720px)', true)
    const scope = effectScope()
    const matches = scope.run(() => useMediaQuery('(min-width: 720px)'))!
    expect(matches.value).toBe(true)

    media.set('(min-width: 720px)', false)
    expect(matches.value).toBe(false)
    scope.stop()
  })

  it('removes its listener when the scope is disposed', () => {
    const scope = effectScope()
    scope.run(() => useMediaQuery('(min-width: 720px)'))
    expect(media.listenerCount('(min-width: 720px)')).toBe(1)
    scope.stop()
    expect(media.listenerCount('(min-width: 720px)')).toBe(0)
  })
})

describe('useClipboard', () => {
  function setup(writeText: (text: string) => Promise<void>) {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(writeText) } })
    const scope = effectScope()
    const clipboard = scope.run(() => useClipboard(2000))!
    return { scope, clipboard }
  }

  it('reports copied and returns to idle after the reset delay', async () => {
    vi.useFakeTimers()
    const { clipboard } = setup(async () => {})
    await clipboard.copy('<div></div>')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('<div></div>')
    expect(clipboard.state.value).toBe('copied')

    vi.advanceTimersByTime(2000)
    expect(clipboard.state.value).toBe('idle')
  })

  it('reports failed when the clipboard is unavailable or denied', async () => {
    const { clipboard } = setup(async () => {
      throw new DOMException('denied', 'NotAllowedError')
    })
    await clipboard.copy('x')
    expect(clipboard.state.value).toBe('failed')
  })

  it('restarts the reset delay on a second copy', async () => {
    vi.useFakeTimers()
    const { clipboard } = setup(async () => {})
    await clipboard.copy('a')
    vi.advanceTimersByTime(1500)
    await clipboard.copy('b')
    vi.advanceTimersByTime(1500)
    expect(clipboard.state.value).toBe('copied')
  })

  it('clears its pending timer when disposed', async () => {
    vi.useFakeTimers()
    const { scope, clipboard } = setup(async () => {})
    await clipboard.copy('a')
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
