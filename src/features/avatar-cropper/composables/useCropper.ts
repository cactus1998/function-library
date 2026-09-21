import { computed, ref, watch, type Ref } from 'vue'
import type { CropState, ImageSize } from '../types'
import { clampCrop, initialCrop, panCrop, rescaleCrop, scaleRange, zoomCropAt } from '../utils/crop'

export const KEY_STEP = 10
export const KEY_STEP_LARGE = 50
export const ZOOM_STEP = 1.1

interface Point {
  x: number
  y: number
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * 裁切互動：拖曳平移、雙指縮放、滾輪縮放、鍵盤與 slider。
 * 所有操作都經過 crop.ts 的純函式 clamp，圖片永遠蓋滿裁切框。
 * target 用來把 client 座標換成裁切框座標（縮放焦點）。
 */
export function useCropper(
  image: Ref<ImageSize | null>,
  viewport: Ref<number>,
  target: () => HTMLElement | null | undefined = () => null,
) {
  const crop = ref<CropState>({ scale: 1, x: 0, y: 0 })
  const pointers = new Map<number, Point>()
  const dragging = ref(false)

  const range = computed(() => (image.value ? scaleRange(image.value, viewport.value) : { min: 1, max: 1 }))
  /** 相對於「剛好蓋滿」的倍率，1–4 */
  const zoom = computed(() => crop.value.scale / range.value.min)

  function reset() {
    if (image.value) crop.value = initialCrop(image.value, viewport.value)
  }

  watch(image, reset, { immediate: true })
  watch(viewport, (to, from) => {
    if (image.value && from) crop.value = rescaleCrop(crop.value, from, to, image.value)
  })

  function local(point: Point): Point {
    const rect = target()?.getBoundingClientRect()
    return { x: point.x - (rect?.left ?? 0), y: point.y - (rect?.top ?? 0) }
  }

  function pan(dx: number, dy: number) {
    if (image.value) crop.value = panCrop(crop.value, dx, dy, image.value, viewport.value)
  }

  function zoomAt(scale: number, focus: Point = { x: viewport.value / 2, y: viewport.value / 2 }) {
    if (image.value) crop.value = zoomCropAt(crop.value, scale, focus.x, focus.y, image.value, viewport.value)
  }

  function setZoom(value: number) {
    zoomAt(range.value.min * value)
  }

  function onPointerDown(event: PointerEvent) {
    if (!image.value || (event.pointerType === 'mouse' && event.button !== 0)) return
    // 捕捉後即使指標移出裁切框，move / up 仍會送到這個元素
    ;(event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId)
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    dragging.value = true
  }

  function onPointerMove(event: PointerEvent) {
    const previous = pointers.get(event.pointerId)
    if (!previous || !image.value) return
    const current = { x: event.clientX, y: event.clientY }
    if (pointers.size >= 2) {
      // 雙指：以兩指中點為焦點縮放，並跟著中點平移
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1]
      const before = distance(previous, other)
      const after = distance(current, other)
      const midBefore = local(midpoint(previous, other))
      const midAfter = local(midpoint(current, other))
      if (before > 0) {
        const zoomed = zoomCropAt(crop.value, crop.value.scale * (after / before), midBefore.x, midBefore.y, image.value, viewport.value)
        crop.value = panCrop(zoomed, midAfter.x - midBefore.x, midAfter.y - midBefore.y, image.value, viewport.value)
      }
    } else {
      pan(current.x - previous.x, current.y - previous.y)
    }
    pointers.set(event.pointerId, current)
  }

  function onPointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId)
    dragging.value = pointers.size > 0
  }

  /** 滾輪以游標位置為焦點縮放；呼叫端需以非 passive listener 註冊，才能阻止頁面捲動 */
  function onWheel(event: WheelEvent) {
    if (!image.value) return
    event.preventDefault()
    // deltaMode 1 為「行」，換算成像素
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    zoomAt(crop.value.scale * Math.exp(-delta * 0.0015), local({ x: event.clientX, y: event.clientY }))
  }

  function onKeydown(event: KeyboardEvent) {
    if (!image.value) return
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const actions: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0),
      ArrowRight: () => pan(step, 0),
      ArrowUp: () => pan(0, -step),
      ArrowDown: () => pan(0, step),
      '+': () => zoomAt(crop.value.scale * ZOOM_STEP),
      '=': () => zoomAt(crop.value.scale * ZOOM_STEP),
      '-': () => zoomAt(crop.value.scale / ZOOM_STEP),
      '0': reset,
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const transform = computed(
    () => `translate3d(${crop.value.x}px, ${crop.value.y}px, 0) scale(${crop.value.scale})`,
  )

  return {
    crop,
    range,
    zoom,
    dragging,
    transform,
    reset,
    setZoom,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    onKeydown,
    /** 讓外部（例如測試或重設按鈕）直接設定並 clamp */
    setCrop: (state: CropState) => {
      if (image.value) crop.value = clampCrop(state, image.value, viewport.value)
    },
  }
}

export type Cropper = ReturnType<typeof useCropper>
