import { onScopeDispose, watch } from 'vue'
import { useBoardStore } from '../stores/board'
import { loadBoard, saveBoard, STORAGE_KEY } from '../utils/persist'

/**
 * 首次使用時從 localStorage 還原看板，之後變更 debounce 寫回；
 * pagehide、分頁隱藏與 unmount 時立即補存最後一次狀態。歷史紀錄不持久化。
 */
export function usePersistedBoard(store = useBoardStore(), key = STORAGE_KEY, delay = 300) {
  if (!store.hydrated) {
    const saved = loadBoard(key)
    if (saved) store.replace(saved)
    store.hydrated = true
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  function flush() {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    saveBoard(store.board, key)
  }

  watch(
    () => store.board,
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        saveBoard(store.board, key)
      }, delay)
    },
    { deep: true },
  )

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') flush()
  }

  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', onVisibilityChange)

  onScopeDispose(() => {
    flush()
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { flush }
}
