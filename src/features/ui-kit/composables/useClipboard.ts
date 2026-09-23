import { onScopeDispose, shallowRef } from 'vue'

export type CopyState = 'idle' | 'copied' | 'failed'

/** 複製文字並在 2 秒後回到 idle；非 HTTPS 或權限被拒時回報 failed */
export function useClipboard(resetMs = 2000) {
  const state = shallowRef<CopyState>('idle')
  let timer = 0

  async function copy(text: string) {
    window.clearTimeout(timer)
    try {
      await navigator.clipboard.writeText(text)
      state.value = 'copied'
    } catch {
      state.value = 'failed'
    }
    timer = window.setTimeout(() => (state.value = 'idle'), resetMs)
  }

  onScopeDispose(() => window.clearTimeout(timer))

  return { state, copy }
}
