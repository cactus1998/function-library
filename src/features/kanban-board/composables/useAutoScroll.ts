import { onScopeDispose } from 'vue'
import type { Point } from '../types'

export interface ScrollTarget {
  el: HTMLElement
  axis: 'x' | 'y'
}

/**
 * 指標在容器邊緣 edge 範圍內時回傳捲動速度（負數往前、正數往後），
 * 越靠近邊緣越快，超出容器但在 edge 內視為最快；離容器超過 edge 回傳 0。
 */
export function edgeSpeed(pos: number, start: number, end: number, edge: number, max: number): number {
  if (pos < start - edge || pos > end + edge) return 0
  const fromStart = Math.max(pos - start, 0)
  const fromEnd = Math.max(end - pos, 0)
  if (fromStart < edge && fromStart <= fromEnd) return -Math.ceil((max * (edge - fromStart)) / edge)
  if (fromEnd < edge) return Math.ceil((max * (edge - fromEnd)) / edge)
  return 0
}

/**
 * 拖曳時靠近容器邊緣自動捲動。每次 update 排一個 rAF；
 * 這一幀有捲動才繼續排下一幀，所以指標停在邊緣時會持續捲動，離開後自動停止。
 */
export function useAutoScroll(getTargets: () => ScrollTarget[], { edge = 48, maxSpeed = 16 } = {}) {
  let point: Point | null = null
  let frame = 0

  function tick() {
    frame = 0
    if (!point) return
    let scrolled = false
    for (const { el, axis } of getTargets()) {
      const r = el.getBoundingClientRect()
      if (axis === 'y') {
        if (el.scrollHeight <= el.clientHeight || point.x < r.left || point.x > r.right) continue
        const speed = edgeSpeed(point.y, r.top, r.bottom, edge, maxSpeed)
        const before = el.scrollTop
        if (speed) el.scrollTop = before + speed
        if (el.scrollTop !== before) scrolled = true
      } else {
        if (el.scrollWidth <= el.clientWidth || point.y < r.top || point.y > r.bottom) continue
        const speed = edgeSpeed(point.x, r.left, r.right, edge, maxSpeed)
        const before = el.scrollLeft
        if (speed) el.scrollLeft = before + speed
        if (el.scrollLeft !== before) scrolled = true
      }
    }
    if (scrolled) frame = requestAnimationFrame(tick)
  }

  function update(next: Point) {
    point = next
    if (!frame) frame = requestAnimationFrame(tick)
  }

  function stop() {
    point = null
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }

  onScopeDispose(stop)

  return { update, stop }
}
