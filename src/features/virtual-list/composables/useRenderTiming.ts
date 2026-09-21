import { onScopeDispose, shallowRef, watch, type WatchSource } from 'vue'

/**
 * 量測 source 改變到畫面繪製完成的時間。
 * rAF 在繪製前執行，再排一個 macrotask 才會落在繪製之後。
 */
export function useRenderTiming(source: WatchSource<unknown>) {
  const duration = shallowRef<number | null>(null)
  let frameId = 0
  let timerId = 0

  function cancel() {
    cancelAnimationFrame(frameId)
    clearTimeout(timerId)
  }

  watch(
    source,
    () => {
      cancel()
      duration.value = null
      const start = performance.now()
      frameId = requestAnimationFrame(() => {
        timerId = window.setTimeout(() => {
          duration.value = performance.now() - start
        }, 0)
      })
    },
    { immediate: true },
  )

  onScopeDispose(cancel)

  return { duration }
}
