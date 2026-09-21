import { getActivePinia, type Pinia } from 'pinia'
import { onScopeDispose } from 'vue'
import { installSyncPlugin, type SyncPluginOptions } from '../plugins/syncPlugin'
import { useCartStore } from '../stores/cart'

/**
 * 取得購物車 store，並把它的生命週期綁在呼叫端的 scope 上：
 * unmount 時 $dispose 會關閉 channel、移除 listener、補存最後一次狀態，
 * 下次進入頁面重新建立 store（新的 tabId），並從 localStorage 還原。
 */
export function useCartSession(pinia: Pinia | undefined = getActivePinia(), options?: SyncPluginOptions) {
  if (!pinia) throw new Error('Pinia is not installed')
  installSyncPlugin(pinia, options)
  const store = useCartStore(pinia)

  onScopeDispose(() => {
    store.$dispose()
    delete pinia.state.value[store.$id]
  })

  return store
}
