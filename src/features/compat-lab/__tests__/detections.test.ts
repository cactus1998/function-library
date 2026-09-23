import { afterEach, describe, expect, it, vi } from 'vitest'
import { DETECTIONS, detectDateInput, detectFlexGap } from '../data/detections'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('detectFlexGap', () => {
  it('reports support when two empty flex children end up exactly 1px apart', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1)
    expect(detectFlexGap()).toBe(true)
  })

  it('reports no support when the gap is ignored', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(0)
    expect(detectFlexGap()).toBe(false)
  })

  it('removes its probe element from the document', () => {
    const before = document.body.childElementCount
    detectFlexGap()
    expect(document.body.childElementCount).toBe(before)
  })
})

describe('detectDateInput', () => {
  it('reports support when the browser keeps type="date"', () => {
    expect(detectDateInput()).toBe(true)
  })

  it('reports no support when the browser falls back to text', () => {
    const create = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = create(tag)
      if (el instanceof HTMLInputElement) Object.defineProperty(el, 'type', { get: () => 'text', set: () => {} })
      return el
    })
    expect(detectDateInput()).toBe(false)
  })
})

describe('DETECTIONS', () => {
  it('have unique ids and a fallback strategy for every feature', () => {
    const ids = DETECTIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const d of DETECTIONS) expect(d.fallback.trim()).not.toBe('')
  })

  it('ask CSS.supports() instead of sniffing the user agent', () => {
    const supports = vi.fn(() => true)
    vi.stubGlobal('CSS', { supports })
    DETECTIONS.find((d) => d.id === 'has')!.test()
    DETECTIONS.find((d) => d.id === 'aspect-ratio')!.test()
    expect(supports).toHaveBeenCalledWith('selector(:has(*))')
    expect(supports).toHaveBeenCalledWith('aspect-ratio: 1 / 1')
  })

  it('treat a missing CSS.supports as unsupported', () => {
    vi.stubGlobal('CSS', undefined)
    expect(DETECTIONS.find((d) => d.id === 'dvh')!.test()).toBe(false)
  })
})
