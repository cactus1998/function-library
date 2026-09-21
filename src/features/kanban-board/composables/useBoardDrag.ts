import { onScopeDispose, shallowRef, type Ref } from 'vue'
import type { useBoardStore } from '../stores/board'
import type { CardPosition, Point } from '../types'
import { findPosition, samePosition } from '../utils/board'
import { measureBoard, refreshScroll, resolveDrop, type BoardGeometry } from '../utils/geometry'
import { describePosition } from '../utils/messages'
import { useAutoScroll } from './useAutoScroll'
import { usePointerDrag, type DragHandle } from './usePointerDrag'

export interface PointerDragState {
  id: string
  title: string
  origin: CardPosition
  /** null 表示指標在看板外，放下會取消 */
  target: CardPosition | null
  /** 拖曳開始時卡片的位置與尺寸（ghost 與 placeholder 使用） */
  rect: { left: number; top: number; width: number; height: number }
  /** 指標相對卡片左上角的偏移 */
  grab: Point
}

export interface BoardDragOptions {
  /** 回傳 false 表示目前不能開始拖曳（例如正在編輯） */
  canStart(id: string): boolean
  announce(message: string): void
}

/**
 * 串起指標拖曳的各個部分：手勢（usePointerDrag）、量測與插入位置（geometry）、邊緣自動捲動。
 * 拖曳中的狀態只存在這裡，放下時才呼叫一次 store.moveCard。
 */
export function useBoardDrag(
  scroller: Readonly<Ref<HTMLElement | null>>,
  store: ReturnType<typeof useBoardStore>,
  options: BoardDragOptions,
) {
  const drag = shallowRef<PointerDragState | null>(null)
  const pointer = shallowRef<Point>({ x: 0, y: 0 })
  let geometry: BoardGeometry | null = null
  let layoutFrame = 0
  let restoreBody: (() => void) | null = null

  const autoScroll = useAutoScroll(() => {
    const board = scroller.value
    if (!board) return []
    return [
      { el: board, axis: 'x' as const },
      ...[...board.querySelectorAll<HTMLElement>('[data-card-list]')].map((el) => ({ el, axis: 'y' as const })),
    ]
  })

  function updateTarget() {
    const current = drag.value
    if (!current || !geometry) return
    // 以 ghost 的垂直中心與指標的水平位置判斷
    const center = { x: pointer.value.x, y: pointer.value.y - current.grab.y + current.rect.height / 2 }
    const target = resolveDrop(geometry, center)
    if (!samePosition(target, current.target)) drag.value = { ...current, target }
  }

  function scheduleLayout(kind: 'scroll' | 'resize') {
    if (layoutFrame) cancelAnimationFrame(layoutFrame)
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0
      const board = scroller.value
      const current = drag.value
      if (!board || !current || !geometry) return
      geometry = kind === 'scroll' ? refreshScroll(geometry, board) : measureBoard(board, current.id)
      updateTarget()
    })
  }

  const onScroll = () => scheduleLayout('scroll')
  const onResize = () => scheduleLayout('resize')

  function lockBody() {
    const { style } = document.body
    const previous = { userSelect: style.userSelect, cursor: style.cursor }
    style.userSelect = 'none'
    style.cursor = 'grabbing'
    restoreBody = () => {
      style.userSelect = previous.userSelect
      style.cursor = previous.cursor
    }
  }

  function finish() {
    drag.value = null
    geometry = null
    autoScroll.stop()
    if (layoutFrame) cancelAnimationFrame(layoutFrame)
    layoutFrame = 0
    restoreBody?.()
    restoreBody = null
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
  }

  function resolveHandle(target: EventTarget | null): DragHandle | null {
    if (!(target instanceof Element)) return null
    if (target.closest('[data-no-drag], input, textarea')) return null
    const element = target.closest<HTMLElement>('[data-card-id]')
    const id = element?.dataset.cardId
    if (!element || !id || !options.canStart(id)) return null
    return { id, element }
  }

  const gesture = usePointerDrag(scroller, {
    resolve: resolveHandle,
    onStart({ id, element, point }) {
      const board = scroller.value
      const card = store.board.cards[id]
      const origin = findPosition(store.board.columns, id)
      if (!board || !card || !origin) return

      // 必須在隱藏卡片、插入 placeholder 之前量測
      const r = element.getBoundingClientRect()
      geometry = measureBoard(board, id)
      pointer.value = point
      drag.value = {
        id,
        title: card.title,
        origin,
        target: origin,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        grab: { x: point.x - r.left, y: point.y - r.top },
      }
      lockBody()
      // 捲動事件不冒泡，但 window 的 capture 階段收得到任何元素的 scroll
      window.addEventListener('scroll', onScroll, { capture: true, passive: true })
      window.addEventListener('resize', onResize)
    },
    onMove(point) {
      pointer.value = point
      updateTarget()
      autoScroll.update(point)
    },
    onEnd(point) {
      pointer.value = point
      updateTarget()
      const current = drag.value
      finish()
      if (!current) return
      if (!current.target) {
        options.announce(`已取消移動「${current.title}」`)
        return
      }
      if (store.moveCard(current.id, current.target)) {
        options.announce(
          `已將「${current.title}」移到${describePosition(store.board.columns, current.id, current.target)}`,
        )
      }
    },
    onCancel() {
      const current = drag.value
      finish()
      if (current) options.announce(`已取消移動「${current.title}」`)
    },
  })

  onScopeDispose(finish)

  return { drag, pointer, cancel: gesture.cancel }
}
