import type { MatchRange } from '../types'

export interface TextSegment {
  text: string
  hit: boolean
}

/** 排序並合併重疊或相鄰的範圍，裁掉超出文字長度的部分 */
export function normalizeRanges(ranges: readonly MatchRange[], length: number): MatchRange[] {
  const sorted = ranges
    .map(([start, end]): MatchRange => [Math.max(0, start), Math.min(length - 1, end)])
    .filter(([start, end]) => start <= end)
    .sort((a, b) => a[0] - b[0])

  const merged: [number, number][] = []
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end)
    else merged.push([start, end])
  }
  return merged
}

/** 把文字依命中範圍切成片段，供模板以 <mark> 渲染 */
export function toSegments(text: string, ranges: readonly MatchRange[]): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  for (const [start, end] of normalizeRanges(ranges, text.length)) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), hit: false })
    segments.push({ text: text.slice(start, end + 1), hit: true })
    cursor = end + 1
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), hit: false })
  return segments
}
