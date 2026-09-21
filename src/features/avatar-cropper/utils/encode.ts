import type { ExportCrop, SourceRect } from '../types'

export const OUTPUT_SIZE = 512
export const MAX_OUTPUT_BYTES = 200 * 1024
export const QUALITIES = [0.92, 0.85, 0.75, 0.65, 0.5] as const

export interface BudgetResult {
  blob: Blob
  quality: number
  withinBudget: boolean
}

/**
 * 由高到低嘗試品質，回傳第一個 ≤ maxBytes 的結果；都超過時回傳最後（最低品質）一個並標示 withinBudget = false。
 * 編碼有成本，因此找到就停，不做二分搜尋（最多 5 次）。
 */
export async function encodeWithinBudget(
  encode: (quality: number) => Promise<Blob | null>,
  { maxBytes = MAX_OUTPUT_BYTES, qualities = QUALITIES }: { maxBytes?: number; qualities?: readonly number[] } = {},
): Promise<BudgetResult> {
  let last: BudgetResult | null = null
  for (const quality of qualities) {
    const blob = await encode(quality)
    if (!blob) throw new Error('無法輸出圖片')
    last = { blob, quality, withinBudget: blob.size <= maxBytes }
    if (last.withinBudget) return last
  }
  if (!last) throw new Error('沒有可用的品質設定')
  return last
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * 以 canvas 輸出正方形裁切結果。優先 WebP；瀏覽器不支援 WebP 編碼時 toBlob 會回傳 PNG，
 * 此時改用 JPEG（PNG 不吃 quality，檔案會很大）。
 */
export const exportCrop: ExportCrop = async (source, rect: SourceRect, size, quality) => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('瀏覽器不支援 canvas')
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, rect.sx, rect.sy, rect.size, rect.size, 0, 0, size, size)
  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp?.type === 'image/webp') return webp
  return toBlob(canvas, 'image/jpeg', quality)
}

/** 預設解碼：<img> + decode()，現代瀏覽器解碼時會套用 EXIF 方向 */
export async function loadImageElement(url: string) {
  const img = new Image()
  img.src = url
  await img.decode()
  return { width: img.naturalWidth, height: img.naturalHeight, source: img }
}
