import type { CardPosition, ColumnId, Point } from '../types'
import { isColumnId } from './columns'

export interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

export interface ColumnGeometry {
  column: ColumnId
  rect: Rect
  /** 卡片列表（捲動容器）的 client top 與 scrollTop，捲動時只更新這兩個值 */
  listTop: number
  scrollTop: number
  /** 其他卡片中線在列表內容座標中的位置，已扣掉被拖卡片（或 placeholder）佔的空間 */
  mids: number[]
}

export interface BoardGeometry {
  rect: Rect
  columns: ColumnGeometry[]
}

function toRect(r: DOMRect): Rect {
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
}

/**
 * 量測看板中每欄卡片的位置。gapId 的卡片與 placeholder 視為「空隙」：
 * 其後的卡片中線會扣掉空隙高度，得到「好像被拖的卡片不存在」的中線位置。
 * 因此插入索引只取決於指標位置，placeholder 移到哪裡都不影響計算。
 *
 * 只在拖曳開始與 resize 時呼叫；pointermove 不讀版面。
 */
export function measureBoard(board: HTMLElement, gapId: string): BoardGeometry {
  const columns: ColumnGeometry[] = []
  for (const columnEl of board.querySelectorAll<HTMLElement>('[data-column-id]')) {
    const column = columnEl.dataset.columnId
    const list = columnEl.querySelector<HTMLElement>('[data-card-list]')
    if (!isColumnId(column) || !list) continue

    const listRect = list.getBoundingClientRect()
    const children = [...list.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.dragHidden === undefined,
    )
    const mids: number[] = []
    let shift = 0
    children.forEach((child, i) => {
      const r = child.getBoundingClientRect()
      if (child.dataset.placeholder !== undefined || child.dataset.cardId === gapId) {
        const next = children[i + 1]
        shift = next ? next.getBoundingClientRect().top - r.top : 0
        return
      }
      if (child.dataset.cardId === undefined) return
      mids.push(r.top + r.height / 2 - listRect.top + list.scrollTop - shift)
    })

    columns.push({
      column,
      rect: toRect(columnEl.getBoundingClientRect()),
      listTop: listRect.top,
      scrollTop: list.scrollTop,
      mids,
    })
  }
  return { rect: toRect(board.getBoundingClientRect()), columns }
}

/** 捲動後只需更新容器位置與 scrollTop；卡片中線是內容座標，不受捲動影響 */
export function refreshScroll(geometry: BoardGeometry, board: HTMLElement): BoardGeometry {
  return {
    rect: toRect(board.getBoundingClientRect()),
    columns: geometry.columns.map((col) => {
      const columnEl = board.querySelector<HTMLElement>(`[data-column-id="${col.column}"]`)
      const list = columnEl?.querySelector<HTMLElement>('[data-card-list]')
      if (!columnEl || !list) return col
      return {
        ...col,
        rect: toRect(columnEl.getBoundingClientRect()),
        listTop: list.getBoundingClientRect().top,
        scrollTop: list.scrollTop,
      }
    }),
  }
}

/**
 * 依指標位置決定插入位置。point 在看板外回傳 null（放下即取消）；
 * 在看板內但落在欄與欄之間時，取水平距離最近的欄。
 */
export function resolveDrop(geometry: BoardGeometry, point: Point): CardPosition | null {
  const { rect } = geometry
  if (point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) return null

  let best: ColumnGeometry | null = null
  let bestDistance = Infinity
  for (const col of geometry.columns) {
    const distance = Math.max(col.rect.left - point.x, 0, point.x - col.rect.right)
    if (distance < bestDistance) {
      best = col
      bestDistance = distance
    }
  }
  if (!best) return null

  const y = point.y - best.listTop + best.scrollTop
  let index = 0
  while (index < best.mids.length && best.mids[index]! < y) index++
  return { column: best.column, index }
}
