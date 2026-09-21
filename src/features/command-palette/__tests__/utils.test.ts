import { describe, expect, it, vi } from 'vitest'
import { normalizeRanges, toSegments } from '../utils/highlight'
import { createMockDocsFetcher } from '../utils/mockDocsApi'
import {
  detectMac,
  formatShortcut,
  isEditableTarget,
  parseShortcut,
  toAriaKeyShortcuts,
} from '../utils/shortcut'

describe('toSegments', () => {
  it('wraps matched ranges and keeps the rest as plain text', () => {
    expect(toSegments('切換主題', [[0, 1]])).toEqual([
      { text: '切換', hit: true },
      { text: '主題', hit: false },
    ])
  })

  it('returns the whole text as one plain segment when nothing matched', () => {
    expect(toSegments('前往首頁', [])).toEqual([{ text: '前往首頁', hit: false }])
  })

  it('merges overlapping and adjacent ranges and clips out-of-range indices', () => {
    expect(normalizeRanges([[3, 9], [0, 1], [1, 2]], 5)).toEqual([[0, 4]])
    expect(normalizeRanges([[7, 9]], 5)).toEqual([])
  })
})

describe('parseShortcut', () => {
  it('maps mod to Meta on macOS and Control elsewhere', () => {
    expect(parseShortcut('mod+shift+l', true)).toEqual([
      { key: 'l', meta: true, ctrl: false, alt: false, shift: true },
    ])
    expect(parseShortcut('mod+shift+l', false)[0]).toMatchObject({ meta: false, ctrl: true })
  })

  it('splits sequences on whitespace', () => {
    expect(parseShortcut('g  h', false).map((s) => s.key)).toEqual(['g', 'h'])
  })

  it('throws when a step has no main key', () => {
    expect(() => parseShortcut('mod+shift', false)).toThrow(/missing key/)
  })
})

describe('formatShortcut / toAriaKeyShortcuts', () => {
  it('uses platform symbols for display', () => {
    expect(formatShortcut('mod+shift+l', true)).toEqual([['⇧', '⌘', 'L']])
    expect(formatShortcut('mod+shift+l', false)).toEqual([['Ctrl', 'Shift', 'L']])
    expect(formatShortcut('g h', false)).toEqual([['G'], ['H']])
  })

  it('produces aria-keyshortcuts for combos but not for sequences', () => {
    expect(toAriaKeyShortcuts('mod+k', false)).toBe('Control+K')
    expect(toAriaKeyShortcuts('mod+k', true)).toBe('Meta+K')
    expect(toAriaKeyShortcuts('g h', false)).toBeUndefined()
  })
})

describe('detectMac', () => {
  it('prefers userAgentData.platform over navigator.platform', () => {
    const nav = { platform: 'Win32', userAgentData: { platform: 'macOS' } } as unknown as Navigator
    expect(detectMac(nav)).toBe(true)
    expect(detectMac({ platform: 'Win32' } as Navigator)).toBe(false)
    expect(detectMac({ platform: 'MacIntel' } as Navigator)).toBe(true)
  })
})

describe('isEditableTarget', () => {
  it('treats text inputs, textarea, select and contenteditable as editable', () => {
    const text = document.createElement('input')
    const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox' })
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    // jsdom 未實作 isContentEditable
    Object.defineProperty(editable, 'isContentEditable', { value: true })

    expect(isEditableTarget(text)).toBe(true)
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true)
    expect(isEditableTarget(document.createElement('select'))).toBe(true)
    expect(isEditableTarget(editable)).toBe(true)
    expect(isEditableTarget(checkbox)).toBe(false)
    expect(isEditableTarget(document.body)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})

describe('createMockDocsFetcher', () => {
  const base = { failureRate: () => 0, onOpen: () => {}, random: () => 0 }

  it('resolves matching docs after the delay', async () => {
    vi.useFakeTimers()
    const fetcher = createMockDocsFetcher(base)
    const promise = fetcher('abort', new AbortController().signal)
    await vi.advanceTimersByTimeAsync(300)
    await expect(promise).resolves.toMatchObject([{ title: 'AbortController 取消請求', group: 'remote' }])
    vi.useRealTimers()
  })

  it('rejects with AbortError when aborted and counts it', async () => {
    vi.useFakeTimers()
    const stats = { sent: 0, aborted: 0, failed: 0 }
    const controller = new AbortController()
    const promise = createMockDocsFetcher({ ...base, stats })('vue', controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(stats).toEqual({ sent: 1, aborted: 1, failed: 0 })
    vi.useRealTimers()
  })

  it('fails according to the failure rate', async () => {
    vi.useFakeTimers()
    const promise = createMockDocsFetcher({ ...base, failureRate: () => 1 })('vue', new AbortController().signal)
    const assertion = expect(promise).rejects.toThrow('HTTP 503')
    await vi.advanceTimersByTimeAsync(300)
    await assertion
    vi.useRealTimers()
  })
})
