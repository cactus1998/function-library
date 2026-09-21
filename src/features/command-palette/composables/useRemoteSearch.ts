import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import type { Command, RemoteFetcher, RemoteStatus } from '../types'

export interface RemoteSearchOptions {
  debounce?: number
}

export function useRemoteSearch(query: Ref<string>, fetcher: RemoteFetcher, options: RemoteSearchOptions = {}) {
  const { debounce = 200 } = options

  const status = ref<RemoteStatus>('idle')
  const results = shallowRef<Command[]>([])
  const error = ref<Error | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | null = null

  const normalized = computed(() => query.value.trim())

  function cancel() {
    clearTimeout(timer)
    timer = undefined
    controller?.abort()
    controller = null
  }

  async function run(q: string) {
    cancel()
    const current = new AbortController()
    controller = current
    status.value = 'loading'
    error.value = null
    try {
      const data = await fetcher(q, current.signal)
      // 已被新請求取代或取消：丟棄過期回應
      if (current !== controller || current.signal.aborted) return
      results.value = data
      status.value = 'success'
    } catch (e) {
      if (current !== controller || current.signal.aborted) return
      error.value = e instanceof Error ? e : new Error(String(e))
      results.value = []
      status.value = 'error'
    } finally {
      if (current === controller) controller = null
    }
  }

  function schedule(q: string) {
    if (!q) {
      cancel()
      status.value = 'idle'
      results.value = []
      error.value = null
      return
    }
    // 查詢一變就取消進行中的請求，舊回應即使稍後抵達也不會寫入；
    // 上一筆成功結果保留到新回應抵達，避免列表閃爍
    cancel()
    status.value = 'debouncing'
    timer = setTimeout(() => {
      timer = undefined
      void run(q)
    }, debounce)
  }

  function retry() {
    if (normalized.value) void run(normalized.value)
  }

  watch(normalized, schedule, { immediate: true })
  onScopeDispose(cancel)

  return { status, results, error, retry, cancel }
}
