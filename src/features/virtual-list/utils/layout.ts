/**
 * 列表版面策略：回答「第 i 列在哪」與「某個位置是第幾列」。
 * 固定高度與動態高度實作同一個介面，虛擬化邏輯不需要知道是哪一種。
 */
export interface Layout {
  readonly count: number
  readonly totalHeight: number
  offsetOf(index: number): number
  sizeOf(index: number): number
  /** 回傳包含 offset 這個位置的列索引，offset 會被夾在合法範圍內 */
  indexAt(offset: number): number
  /** 回報實際高度，回傳與舊高度的差值；固定高度模式永遠回傳 0 */
  measure(index: number, size: number): number
}

export interface VirtualRange {
  /** 可視範圍（不含 overscan） */
  start: number
  end: number
  /** 實際渲染範圍（含 overscan） */
  renderStart: number
  renderEnd: number
}

export type ScrollAlign = 'start' | 'center' | 'end' | 'auto'
export type PublicScrollAlign = Exclude<ScrollAlign, 'auto'>

export const EMPTY_RANGE: VirtualRange = Object.freeze({
  start: 0,
  end: -1,
  renderStart: 0,
  renderEnd: -1,
})

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 固定高度：所有位置都能用乘除法 O(1) 算出 */
export function createFixedLayout(count: number, itemHeight: number): Layout {
  const size = Math.max(1, itemHeight)
  return {
    count,
    totalHeight: count * size,
    offsetOf: (index) => clamp(index, 0, count) * size,
    sizeOf: () => size,
    indexAt: (offset) => (count === 0 ? 0 : clamp(Math.floor(offset / size), 0, count - 1)),
    measure: () => 0,
  }
}

/**
 * 動態高度：先用預估高度，量測後更新。
 *
 * - `heights[i]`：第 i 列高度（未量測時為預估值）
 * - `offsets[i]`：第 i 列頂端位置（前綴和），`offsets[count]` 為總高度
 * - `valid`：`offsets[0..valid]` 為最新值；量測第 i 列只會讓 i 之後的位置失效
 *
 * 前綴和採延遲計算，只算到被查詢的位置，所以量測遠處的列不會觸發整份 O(n) 重算。
 */
export function createDynamicLayout(count: number, estimatedHeight: number): Layout {
  const estimate = Math.max(1, estimatedHeight)
  const heights = new Float64Array(count).fill(estimate)
  const offsets = new Float64Array(count + 1)
  let valid = 0
  let total = count * estimate

  function ensureValid(index: number) {
    for (; valid < index; valid++) offsets[valid + 1] = offsets[valid] + heights[valid]
  }

  return {
    count,
    get totalHeight() {
      return total
    },
    offsetOf(index) {
      const i = clamp(index, 0, count)
      ensureValid(i)
      return offsets[i]
    },
    sizeOf(index) {
      return heights[clamp(index, 0, count - 1)] ?? 0
    },
    indexAt(offset) {
      if (count === 0) return 0
      const target = clamp(offset, 0, total)
      // 把有效前綴和往前推進，直到超過目標位置，之後才能二分搜尋
      while (valid < count && offsets[valid] <= target) {
        offsets[valid + 1] = offsets[valid] + heights[valid]
        valid++
      }
      // 找最後一個 offsets[i] <= target 的 i
      let lo = 0
      let hi = Math.min(valid, count) - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1
        if (offsets[mid] <= target) lo = mid
        else hi = mid - 1
      }
      return lo
    },
    measure(index, size) {
      if (!Number.isInteger(index) || index < 0 || index >= count) return 0
      if (!Number.isFinite(size) || size < 0) return 0
      const delta = size - heights[index]
      if (delta === 0) return 0
      heights[index] = size
      total += delta
      valid = Math.min(valid, index)
      return delta
    },
  }
}

export function computeRange(
  layout: Layout,
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VirtualRange {
  const { count } = layout
  if (count === 0) return EMPTY_RANGE

  const top = Math.max(0, scrollTop)
  const bottom = top + Math.max(0, viewportHeight)
  const start = layout.indexAt(top)
  let end = layout.indexAt(bottom)
  // 頂端剛好落在可視區底線上的列看不到，不算可視
  if (end > start && layout.offsetOf(end) >= bottom) end--

  const extra = Math.max(0, Math.floor(overscan))
  return {
    start,
    end,
    renderStart: Math.max(0, start - extra),
    renderEnd: Math.min(count - 1, end + extra),
  }
}

export function isSameRange(a: VirtualRange, b: VirtualRange): boolean {
  return (
    a.start === b.start &&
    a.end === b.end &&
    a.renderStart === b.renderStart &&
    a.renderEnd === b.renderEnd
  )
}

/** 計算讓第 index 列依 align 對齊時的 scrollTop，結果夾在可捲動範圍內 */
export function scrollOffsetFor(
  layout: Layout,
  index: number,
  align: ScrollAlign,
  viewportHeight: number,
  currentScrollTop: number,
): number {
  if (layout.count === 0) return 0
  const i = clamp(Math.trunc(index), 0, layout.count - 1)
  const top = layout.offsetOf(i)
  const size = layout.sizeOf(i)

  let target: number
  switch (align) {
    case 'start':
      target = top
      break
    case 'center':
      target = top + size / 2 - viewportHeight / 2
      break
    case 'end':
      target = top + size - viewportHeight
      break
    case 'auto':
      if (top < currentScrollTop) target = top
      else if (top + size > currentScrollTop + viewportHeight) target = top + size - viewportHeight
      else target = currentScrollTop
      break
  }

  return clamp(target, 0, Math.max(0, layout.totalHeight - viewportHeight))
}
