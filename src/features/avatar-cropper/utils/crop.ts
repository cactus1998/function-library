import type { CropState, ImageSize, SourceRect } from '../types'

export const MAX_ZOOM = 4

/** 剛好蓋滿正方形裁切框的縮放（cover），短邊貼齊 */
export function coverScale(image: ImageSize, viewport: number): number {
  return Math.max(viewport / image.width, viewport / image.height)
}

export function scaleRange(image: ImageSize, viewport: number): { min: number; max: number } {
  const min = coverScale(image, viewport)
  return { min, max: min * MAX_ZOOM }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * 讓圖片永遠蓋滿裁切框：縮放夾在 [cover, cover × 4]，
 * 位置夾在 [viewport − 圖片寬, 0]（左緣不能進框、右緣不能出框）。
 */
export function clampCrop(state: CropState, image: ImageSize, viewport: number): CropState {
  const { min, max } = scaleRange(image, viewport)
  const scale = clamp(state.scale, min, max)
  return {
    scale,
    x: clamp(state.x, viewport - image.width * scale, 0),
    y: clamp(state.y, viewport - image.height * scale, 0),
  }
}

export function initialCrop(image: ImageSize, viewport: number): CropState {
  const scale = coverScale(image, viewport)
  return {
    scale,
    x: (viewport - image.width * scale) / 2,
    y: (viewport - image.height * scale) / 2,
  }
}

export function panCrop(state: CropState, dx: number, dy: number, image: ImageSize, viewport: number): CropState {
  return clampCrop({ ...state, x: state.x + dx, y: state.y + dy }, image, viewport)
}

/**
 * 以裁切框座標中的焦點 (fx, fy) 為中心縮放：焦點下的圖片像素在縮放前後不動。
 * 焦點對應的原圖座標為 (fx − x) / scale，縮放後要維持相同，因此 x' = fx − (fx − x) × scale' / scale。
 */
export function zoomCropAt(
  state: CropState,
  nextScale: number,
  fx: number,
  fy: number,
  image: ImageSize,
  viewport: number,
): CropState {
  const { min, max } = scaleRange(image, viewport)
  const scale = clamp(nextScale, min, max)
  const ratio = scale / state.scale
  return clampCrop({ scale, x: fx - (fx - state.x) * ratio, y: fy - (fy - state.y) * ratio }, image, viewport)
}

/** 裁切框在原圖中對應的正方形 */
export function sourceRect(state: CropState, viewport: number): SourceRect {
  // 用 0 − x 而非 −x，避免 x 為 0 時得到 −0
  return { sx: (0 - state.x) / state.scale, sy: (0 - state.y) / state.scale, size: viewport / state.scale }
}

/** 裁切框尺寸改變（視窗縮放）時，維持同一塊原圖區域 */
export function rescaleCrop(state: CropState, from: number, to: number, image: ImageSize): CropState {
  const ratio = to / from
  return clampCrop({ scale: state.scale * ratio, x: state.x * ratio, y: state.y * ratio }, image, to)
}
