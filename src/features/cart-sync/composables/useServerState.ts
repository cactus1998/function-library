import { onScopeDispose, shallowRef } from 'vue'
import { defaultServerState, readServerState, subscribeServerState, writeServerState } from '../services/mockServer'

/** 後台控制面板用：讀寫共用的 mock 伺服器設定，其他分頁修改時同步更新 */
export function useServerState() {
  const state = shallowRef(readServerState())
  const unsubscribe = subscribeServerState(() => {
    state.value = readServerState()
  })
  onScopeDispose(unsubscribe)

  function setStock(productId: string, value: number) {
    writeServerState({ ...state.value, stock: { ...state.value.stock, [productId]: value } })
  }

  function setFailureRate(value: number) {
    writeServerState({ ...state.value, failureRate: value })
  }

  function reset() {
    writeServerState(defaultServerState())
  }

  return { state, setStock, setFailureRate, reset }
}
