import type { ImageSize } from '../types'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MIN_DIMENSION = 200

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const isAccepted = (type: string) => (ACCEPTED_TYPES as readonly string[]).includes(type)

/** 解碼前可以先檢查的：格式與大小（副檔名造假要等解碼失敗才知道） */
export function validateFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!isAccepted(file.type)) return '只支援 JPEG、PNG、WebP'
  if (file.size > MAX_FILE_BYTES) return `檔案超過 10 MB（目前 ${formatBytes(file.size)}）`
  if (file.size === 0) return '無法讀取這張圖片'
  return null
}

export function validateDimensions(size: ImageSize): string | null {
  if (size.width < MIN_DIMENSION || size.height < MIN_DIMENSION) {
    return `圖片至少要 ${MIN_DIMENSION}×${MIN_DIMENSION} px（目前 ${size.width}×${size.height}）`
  }
  return null
}

/** 拖放或貼上時可能同時有多個檔案：取第一個圖片（任何 image/*，交給 validateFile 給出明確錯誤） */
export function firstImageFile(files: Iterable<File> | ArrayLike<File> | null | undefined): File | null {
  if (!files) return null
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) return file
  }
  return null
}

export function formatName(type: string): string {
  if (type === 'image/webp') return 'WebP'
  if (type === 'image/jpeg') return 'JPEG'
  if (type === 'image/png') return 'PNG'
  return type
}
