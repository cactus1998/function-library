import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  RECENT_STORAGE_KEY,
  resetRecentCommandsCache,
  useRecentCommands,
} from '../composables/useRecentCommands'

beforeEach(() => {
  localStorage.clear()
  resetRecentCommandsCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useRecentCommands', () => {
  it('puts the latest id first, de-duplicates and keeps at most 5', () => {
    const { ids, push } = useRecentCommands()
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) push(id)
    push('d')
    expect(ids.value).toEqual(['d', 'f', 'e', 'c', 'b'])
  })

  it('persists a versioned payload and restores it after reload (AC-05)', () => {
    useRecentCommands().push('nav-home')
    expect(JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)!)).toEqual({ version: 1, data: ['nav-home'] })

    resetRecentCommandsCache()
    expect(useRecentCommands().ids.value).toEqual(['nav-home'])
  })

  it('shares state between callers so clear() is visible everywhere', () => {
    const palette = useRecentCommands()
    const page = useRecentCommands()
    palette.push('x')
    expect(page.ids.value).toEqual(['x'])
    page.clear()
    expect(palette.ids.value).toEqual([])
  })

  it.each([
    ['corrupted JSON', '{not json'],
    ['an old version', JSON.stringify({ version: 0, data: ['a'] })],
    ['non-string ids', JSON.stringify({ version: 1, data: [1, 2] })],
    ['a bare array', JSON.stringify(['a'])],
  ])('falls back to an empty list for %s (EC-11)', (_, raw) => {
    localStorage.setItem(RECENT_STORAGE_KEY, raw)
    expect(useRecentCommands().ids.value).toEqual([])
  })

  it('keeps working in memory when localStorage throws (EC-11)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const { ids, push } = useRecentCommands()
    expect(ids.value).toEqual([])
    expect(() => push('a')).not.toThrow()
    expect(ids.value).toEqual(['a'])
  })
})
