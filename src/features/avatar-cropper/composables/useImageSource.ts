import { onScopeDispose, ref, shallowRef } from 'vue'
import type { LoadedImage, LoadImage } from '../types'
import { loadImageElement } from '../utils/encode'
import { validateDimensions, validateFile } from '../utils/file'

export type SourceStatus = 'empty' | 'loading' | 'ready'

/**
 * 管理使用者選的圖片：驗證、解碼、object URL 的建立與釋放。
 * 以遞增的 token 辨識最新一次載入，較舊的解碼結果回來時直接丟棄並釋放其 URL。
 */
export function useImageSource(loadImage: LoadImage = loadImageElement) {
  const image = shallowRef<LoadedImage | null>(null)
  const status = ref<SourceStatus>('empty')
  const error = ref<string | null>(null)
  const urls = new Set<string>()
  let token = 0

  function createUrl(file: Blob): string {
    const url = URL.createObjectURL(file)
    urls.add(url)
    return url
  }

  function revoke(url: string) {
    URL.revokeObjectURL(url)
    urls.delete(url)
  }

  function settleStatus() {
    status.value = image.value ? 'ready' : 'empty'
  }

  async function load(file: File | null): Promise<boolean> {
    if (!file) {
      error.value = '請選擇圖片檔'
      return false
    }
    const invalid = validateFile(file)
    if (invalid) {
      // 保留目前的圖片，只顯示錯誤
      error.value = invalid
      return false
    }

    const id = ++token
    const url = createUrl(file)
    status.value = 'loading'
    error.value = null
    try {
      const decoded = await loadImage(url)
      if (id !== token) {
        revoke(url)
        return false
      }
      const tooSmall = validateDimensions(decoded)
      if (tooSmall) {
        revoke(url)
        error.value = tooSmall
        settleStatus()
        return false
      }
      const previous = image.value
      image.value = { ...decoded, url, file }
      if (previous) revoke(previous.url)
      status.value = 'ready'
      return true
    } catch {
      revoke(url)
      if (id !== token) return false
      error.value = '無法讀取這張圖片'
      settleStatus()
      return false
    }
  }

  function clear() {
    token += 1
    if (image.value) revoke(image.value.url)
    image.value = null
    error.value = null
    status.value = 'empty'
  }

  onScopeDispose(() => {
    token += 1
    for (const url of [...urls]) revoke(url)
  })

  return { image, status, error, load, clear }
}
