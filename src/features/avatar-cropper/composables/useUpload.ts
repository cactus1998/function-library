import { onScopeDispose, ref } from 'vue'
import type { Uploader } from '../types'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function useUpload(uploader: Uploader) {
  const status = ref<UploadStatus>('idle')
  /** 0–1 */
  const progress = ref(0)
  const error = ref<string | null>(null)
  const url = ref<string | null>(null)
  let controller: AbortController | null = null
  let lastBlob: Blob | null = null

  async function start(blob: Blob): Promise<boolean> {
    if (status.value === 'uploading') return false
    lastBlob = blob
    const current = new AbortController()
    controller = current
    status.value = 'uploading'
    progress.value = 0
    error.value = null
    try {
      const result = await uploader(blob, {
        signal: current.signal,
        onProgress: (loaded, total) => {
          if (!current.signal.aborted) progress.value = total > 0 ? loaded / total : 1
        },
      })
      if (current.signal.aborted) return false
      url.value = result.url
      progress.value = 1
      status.value = 'success'
      return true
    } catch (reason) {
      // 使用者取消：回到可上傳狀態，不當成錯誤
      if (current.signal.aborted) return false
      status.value = 'error'
      error.value = reason instanceof Error ? reason.message : '上傳失敗'
      return false
    } finally {
      if (controller === current) controller = null
    }
  }

  function cancel() {
    if (!controller) return
    controller.abort()
    controller = null
    status.value = 'idle'
    progress.value = 0
  }

  function retry() {
    return lastBlob ? start(lastBlob) : Promise.resolve(false)
  }

  function reset() {
    cancel()
    status.value = 'idle'
    progress.value = 0
    error.value = null
    url.value = null
    lastBlob = null
  }

  onScopeDispose(() => controller?.abort())

  return { status, progress, error, url, start, cancel, retry, reset }
}
