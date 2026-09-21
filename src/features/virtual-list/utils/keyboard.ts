/**
 * 依按鍵計算下一個選取索引，不處理的按鍵回傳 null。
 * 尚未選取時，方向鍵與翻頁鍵從目前可視範圍的第一列開始。
 */
export function nextIndex(
  key: string,
  current: number | null,
  count: number,
  pageSize: number,
  fallback = 0,
): number | null {
  if (count === 0) return null
  const last = count - 1
  const page = Math.max(1, pageSize)

  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return last
    case 'ArrowDown':
    case 'ArrowUp':
    case 'PageDown':
    case 'PageUp':
      break
    default:
      return null
  }

  if (current === null) return Math.min(last, Math.max(0, fallback))

  switch (key) {
    case 'ArrowDown':
      return Math.min(last, current + 1)
    case 'ArrowUp':
      return Math.max(0, current - 1)
    case 'PageDown':
      return Math.min(last, current + page)
    default:
      return Math.max(0, current - page)
  }
}
