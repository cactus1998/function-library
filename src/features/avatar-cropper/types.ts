export interface ImageSize {
  width: number
  height: number
}

/** 圖片左上角在裁切框座標系中的位置（px）與縮放倍率 */
export interface CropState {
  scale: number
  x: number
  y: number
}

/** 原圖座標系中要輸出的正方形區域 */
export interface SourceRect {
  sx: number
  sy: number
  size: number
}

export interface LoadedImage extends ImageSize {
  /** object URL，給 <img> 顯示 */
  url: string
  /** 給 canvas drawImage 使用 */
  source: CanvasImageSource
  file: File
}

export type LoadImage = (url: string) => Promise<{ width: number; height: number; source: CanvasImageSource }>

export interface CroppedResult {
  blob: Blob
  url: string
  quality: number
  withinBudget: boolean
}

export interface UploadOptions {
  signal: AbortSignal
  onProgress: (loaded: number, total: number) => void
}

export type Uploader = (blob: Blob, options: UploadOptions) => Promise<{ url: string }>

export type ExportCrop = (source: CanvasImageSource, rect: SourceRect, size: number, quality: number) => Promise<Blob | null>
