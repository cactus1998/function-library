import { describe, expect, it } from 'vitest'
import { ref, shallowRef } from 'vue'
import { MAX_RESULTS, useCommandSearch } from '../composables/useCommandSearch'
import type { Command } from '../types'
import { generateCommands } from '../utils/generateCommands'

const COMMANDS: Command[] = [
  { id: 'home', title: '前往首頁', initials: 'qwsy', keywords: ['home'], group: 'navigation' },
  { id: 'theme', title: '切換主題', initials: 'qhzt', keywords: ['theme', 'dark'], group: 'appearance' },
  { id: 'copy', title: '複製目前網址', initials: 'fzmqwz', keywords: ['copy', 'url'], group: 'action' },
  // initials 長度與 title 不符時不應映射高亮
  { id: 'bad', title: '錯誤對齊', initials: 'cwd', group: 'action' },
]

function setup(query = '', commands: Command[] = COMMANDS) {
  const q = ref(query)
  const list = shallowRef(commands)
  return { q, list, ...useCommandSearch(q, list) }
}

describe('useCommandSearch', () => {
  it('finds a Chinese title by pinyin initials and highlights the title characters (AC-02)', () => {
    const { results } = setup('qhzt')
    expect(results.value[0]?.command.id).toBe('theme')
    expect(results.value[0]?.matches).toEqual([[0, 3]])
  })

  it('returns title ranges when the title itself matches', () => {
    const { results } = setup('主題')
    expect(results.value[0]?.command.id).toBe('theme')
    expect(results.value[0]?.matches).toEqual([[2, 3]])
  })

  it('matches keywords without producing title highlights', () => {
    const { results } = setup('url')
    expect(results.value[0]?.command.id).toBe('copy')
    expect(results.value[0]?.matches).toEqual([])
  })

  it('ignores initials that are not aligned with the title', () => {
    const { results } = setup('cwd')
    const hit = results.value.find((r) => r.command.id === 'bad')
    expect(hit?.matches).toEqual([])
  })

  it('returns every command in original order with score 0 for an empty query', () => {
    const { results } = setup('')
    expect(results.value.map((r) => r.command.id)).toEqual(['home', 'theme', 'copy', 'bad'])
    expect(results.value.every((r) => r.score === 0 && r.matches.length === 0)).toBe(true)
  })

  it('treats whitespace-only queries as empty and trims surrounding spaces (EC-04)', () => {
    const blank = setup('   ')
    expect(blank.normalizedQuery.value).toBe('')
    expect(blank.results.value).toHaveLength(COMMANDS.length)

    const padded = setup('  qhzt  ')
    expect(padded.results.value[0]?.command.id).toBe('theme')
  })

  it("treats Fuse extended-search operators as plain characters (EC-19)", () => {
    // 若啟用 extended search，「!theme」會變成「不含 theme」而回傳其他指令
    for (const query of ["'zzz", '^zzz', '!theme']) {
      const { results } = setup(query)
      expect(results.value.map((r) => r.command.id)).not.toContain('home')
    }
  })

  it('returns an empty list when nothing matches (EC-03)', () => {
    expect(setup('xyzxyzxyz').results.value).toEqual([])
  })

  it(`caps results at ${MAX_RESULTS}`, () => {
    const many = generateCommands(1000, undefined)
    expect(setup('', many).results.value).toHaveLength(MAX_RESULTS)
    expect(setup('item', many).results.value.length).toBeLessThanOrEqual(MAX_RESULTS)
  })

  it('updates results when the command list changes', () => {
    const { list, results, q } = setup('新指令')
    expect(results.value).toEqual([])
    list.value = [...COMMANDS, { id: 'new', title: '新指令', group: 'action' }]
    expect(results.value[0]?.command.id).toBe('new')
    q.value = ''
    expect(results.value).toHaveLength(5)
  })

  it('searches 1,000 commands within one frame budget', () => {
    const { results, duration } = setup('匯出報表', [...COMMANDS, ...generateCommands(1000, undefined)])
    expect(results.value.length).toBeGreaterThan(0)
    // jsdom 與 CI 較慢，留寬鬆上限；瀏覽器實測約 2–8ms
    expect(duration.value).toBeLessThan(50)
  })
})
