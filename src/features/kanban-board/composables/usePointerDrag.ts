import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import type { Point } from '../types'

export interface DragHandle {
  id: string
  element: HTMLElement
}

export interface DragStart extends DragHandle {
  pointerType: string
  /** 按下時的指標位置 */
  point: Point
}

export interface PointerDragOptions {
  /** 從 pointerdown 的 target 找出可拖曳的項目，不可拖曳時回傳 null */
  resolve(target: EventTarget | null): DragHandle | null
  onStart(start: DragStart): void
  /** 以 requestAnimationFrame 節流，每幀最多一次 */
  onMove(point: Point): void
  onEnd(point: Point): void
  onCancel(): void
  /** 滑鼠 / 觸控筆移動超過此距離才開始拖曳（px） */
  threshold?: number
  /** 觸控需長按此時間才開始拖曳（ms），期間移動超過 threshold 視為捲動 */
  touchDelay?: number
}

type Phase = 'idle' | 'pressed' | 'dragging'

interface Pending extends DragHandle {
  pointerId: number
  pointerType: string
  origin: Point
}

/**
 * 以 Pointer Events 實作拖曳手勢，統一滑鼠、觸控與觸控筆。
 * 只追蹤第一個主要指標；拖曳結束後吞掉緊接著的 click，避免放下時誤觸卡片的點擊行為。
 */
export function usePointerDrag(root: Readonly<Ref<HTMLElement | null>>, options: PointerDragOptions) {
  const threshold = options.threshold ?? 5
  const touchDelay = options.touchDelay ?? 200

  const phase = ref<Phase>('idle')
  let pending: Pending | null = null
  let captureTarget: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let latest: Point = { x: 0, y: 0 }

  const pointOf = (event: PointerEvent): Point => ({ x: event.clientX, y: event.clientY })

  function onPointerDown(event: PointerEvent) {
    if (phase.value !== 'idle' || !event.isPrimary || event.button !== 0) return
    const handle = options.resolve(event.target)
    if (!handle) return

    pending = { ...handle, pointerId: event.pointerId, pointerType: event.pointerType, origin: pointOf(event) }
    latest = pending.origin
    phase.value = 'pressed'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeydown, true)
    window.addEventListener('blur', cancel)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('contextmenu', onContextMenu)

    if (event.pointerType === 'touch') timer = setTimeout(() => begin(), touchDelay)
  }

  function begin() {
    if (!pending || phase.value !== 'pressed') return
    clearTimeout(timer)
    timer = undefined
    phase.value = 'dragging'
    // capture 設在不會被移除的 root 上，被拖的卡片隱藏或換欄也不會中斷事件
    captureTarget = root.value
    try {
      captureTarget?.setPointerCapture(pending.pointerId)
    } catch {
      captureTarget = null
    }
    options.onStart({ id: pending.id, element: pending.element, pointerType: pending.pointerType, point: pending.origin })
    scheduleMove()
  }

  function scheduleMove() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (phase.value === 'dragging') options.onMove(latest)
    })
  }

  function onPointerMove(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointerId) return
    latest = pointOf(event)
    if (phase.value === 'dragging') {
      scheduleMove()
      return
    }
    const moved = Math.hypot(latest.x - pending.origin.x, latest.y - pending.origin.y) >= threshold
    if (!moved) return
    // 觸控在長按完成前移動：交給瀏覽器捲動
    if (pending.pointerType === 'touch') reset()
    else begin()
  }

  function onPointerUp(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointerId) return
    if (phase.value === 'dragging') {
      const point = pointOf(event)
      reset()
      suppressNextClick()
      options.onEnd(point)
    } else {
      reset()
    }
  }

  function onPointerCancel(event: PointerEvent) {
    if (!pending || event.pointerId !== pending.pointerId) return
    cancel()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || phase.value !== 'dragging') return
    event.preventDefault()
    event.stopPropagation()
    cancel()
  }

  // 已進入拖曳時阻止觸控捲動；長按前不阻止，讓使用者仍能正常捲動
  function onTouchMove(event: TouchEvent) {
    if (phase.value === 'dragging' && event.cancelable) event.preventDefault()
  }

  // 長按會叫出系統選單
  function onContextMenu(event: Event) {
    if (pending?.pointerType === 'touch') event.preventDefault()
  }

  function suppressNextClick() {
    const stop = (event: Event) => {
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
  }

  /** 取消進行中的拖曳（Esc、pointercancel、視窗失焦，或外部呼叫） */
  function cancel() {
    const wasDragging = phase.value === 'dragging'
    reset()
    if (wasDragging) options.onCancel()
  }

  function reset() {
    clearTimeout(timer)
    timer = undefined
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    if (captureTarget && pending) {
      try {
        if (captureTarget.hasPointerCapture(pending.pointerId)) captureTarget.releasePointerCapture(pending.pointerId)
      } catch {
        // 元素已離開文件時 release 會丟錯，忽略即可
      }
    }
    captureTarget = null
    pending = null
    phase.value = 'idle'
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('keydown', onKeydown, true)
    window.removeEventListener('blur', cancel)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('contextmenu', onContextMenu)
  }

  watch(
    root,
    (el, _prev, onCleanup) => {
      if (!el) return
      el.addEventListener('pointerdown', onPointerDown)
      onCleanup(() => el.removeEventListener('pointerdown', onPointerDown))
    },
    { immediate: true, flush: 'post' },
  )

  onScopeDispose(cancel)

  return {
    isDragging: computed(() => phase.value === 'dragging'),
    cancel,
  }
}
