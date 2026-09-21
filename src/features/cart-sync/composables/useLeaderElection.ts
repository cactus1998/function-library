import { onScopeDispose, readonly, ref } from 'vue'

function defaultLocks(): LockManager | null {
  return typeof navigator !== 'undefined' && 'locks' in navigator ? navigator.locks : null
}

/**
 * 以 Web Locks 選出 leader：拿到 lock 後回傳一個不會 resolve 的 Promise，
 * 分頁存活期間一直持有；分頁關閉時瀏覽器自動釋放，由下一個排隊的分頁接手。
 */
export function useLeaderElection(name: string, locks: LockManager | null = defaultLocks()) {
  const isLeader = ref(false)
  const supported = locks !== null

  if (locks) {
    const controller = new AbortController()
    let release: (() => void) | null = null
    let disposed = false

    locks
      .request(name, { signal: controller.signal }, () => {
        if (disposed) return Promise.resolve()
        isLeader.value = true
        return new Promise<void>((resolve) => {
          release = resolve
        })
      })
      .catch((error: unknown) => {
        // unmount 時取消排隊會以 AbortError reject，屬於預期行為；
        // 其他錯誤（例如沙箱 iframe 的 SecurityError）只記錄，分頁維持 follower
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error)
      })

    onScopeDispose(() => {
      disposed = true
      controller.abort() // 還在排隊：取消
      release?.() // 已持有：釋放
      isLeader.value = false
    })
  }

  return { isLeader: readonly(isLeader), supported }
}
