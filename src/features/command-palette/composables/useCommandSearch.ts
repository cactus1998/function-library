import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js'
import { computed, type ComputedRef, type Ref } from 'vue'
import type { Command, MatchRange, SearchResult } from '../types'

export const MAX_RESULTS = 50

export const FUSE_OPTIONS: IFuseOptions<Command> = {
  keys: [
    { name: 'title', weight: 0.7 },
    // 拼音首字母是 title 的另一種寫法，權重與 title 相同
    { name: 'initials', weight: 0.7 },
    { name: 'keywords', weight: 0.3 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeMatches: true,
  includeScore: true,
  // 不啟用 extended search：「'」「^」「!」都視為一般字元
  useExtendedSearch: false,
}

/** 從 Fuse 的命中結果取出 title 上的範圍；initials 與 title 逐字對齊，可直接沿用索引 */
export function titleRanges(command: Command, matches: readonly FuseResultMatch[] | undefined): MatchRange[] {
  const ranges: MatchRange[] = []
  const initialsAligned = command.initials?.length === command.title.length
  for (const match of matches ?? []) {
    if (match.key === 'title' || (match.key === 'initials' && initialsAligned)) {
      ranges.push(...match.indices)
    }
  }
  return ranges
}

export interface CommandSearch {
  results: ComputedRef<SearchResult[]>
  /** 查詢 trim 後的值 */
  normalizedQuery: ComputedRef<string>
  /** 最近一次搜尋耗時（ms），不含索引建立 */
  duration: ComputedRef<number>
}

export function useCommandSearch(query: Ref<string>, commands: Ref<Command[]>): CommandSearch {
  // 索引只在 commands 變動時重建，按鍵時只做查詢
  const fuse = computed(() => new Fuse(commands.value, FUSE_OPTIONS))
  const normalizedQuery = computed(() => query.value.trim())

  const measured = computed(() => {
    const start = performance.now()
    const q = normalizedQuery.value
    const results: SearchResult[] = q
      ? fuse.value.search(q, { limit: MAX_RESULTS }).map((r) => ({
          command: r.item,
          score: r.score ?? 0,
          matches: titleRanges(r.item, r.matches),
        }))
      : commands.value.slice(0, MAX_RESULTS).map((command) => ({ command, score: 0, matches: [] }))
    return { results, duration: performance.now() - start }
  })

  return {
    results: computed(() => measured.value.results),
    normalizedQuery,
    duration: computed(() => measured.value.duration),
  }
}
