import { computed, onScopeDispose, shallowRef } from 'vue'
import { ApiError, type MessagesApi } from '../services/apiClient'
import type { MessagePage } from '../types'

export type ListStatus = 'loading' | 'success' | 'error'

/**
 * 分頁列表：切頁時取消上一個請求，舊回應永遠不會覆蓋新頁面。
 * 載入中保留上一頁資料（淡出顯示），避免列表高度歸零造成版面跳動。
 */
export function useMessages(api: MessagesApi, pageSize = 5) {
  const page = shallowRef(1)
  const data = shallowRef<MessagePage | null>(null)
  const status = shallowRef<ListStatus>('loading')
  const error = shallowRef('')
  const retryNote = shallowRef('')
  let controller: AbortController | null = null

  const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / pageSize)) : 1))

  async function load(target: number) {
    controller?.abort()
    const current = new AbortController()
    controller = current
    page.value = target
    status.value = 'loading'
    error.value = ''
    retryNote.value = ''

    try {
      const result = await api.list(target, pageSize, {
        signal: current.signal,
        onRetry: (attempt, wait) => {
          retryNote.value = `第 ${attempt} 次自動重試，${(wait / 1000).toFixed(1)} 秒後送出…`
        },
      })
      // abort 可能發生在回應已抵達之後（例如正在讀取 body），此時 promise 仍會 resolve
      if (current.signal.aborted) return
      data.value = result
      status.value = 'success'
    } catch (e) {
      // 被新請求取代或元件卸載，不更新畫面
      if (current.signal.aborted) return
      status.value = 'error'
      error.value = e instanceof ApiError ? e.message : '發生未預期的錯誤'
    } finally {
      if (controller === current) {
        retryNote.value = ''
        controller = null
      }
    }
  }

  function goTo(target: number) {
    void load(Math.min(Math.max(1, target), totalPages.value))
  }

  function reload() {
    void load(page.value)
  }

  /** 新增留言後回到第一頁，看到最新的一筆 */
  function reset() {
    void load(1)
  }

  onScopeDispose(() => controller?.abort())

  void load(1)

  return { page, data, status, error, retryNote, totalPages, goTo, reload, reset }
}
