import { onScopeDispose } from 'vue'
import { isEditableTarget } from '../utils/platform'

export interface HistoryShortcutOptions {
  isMac: boolean
  onUndo(): void
  onRedo(): void
}

/**
 * mod+Z 復原、mod+Shift+Z 重做（Windows 另支援 Ctrl+Y）。
 * 焦點在輸入框時不攔截，讓瀏覽器處理原生的文字 undo。
 */
export function useHistoryShortcuts(options: HistoryShortcutOptions) {
  function onKeydown(event: KeyboardEvent) {
    if (event.isComposing || event.altKey || isEditableTarget(event.target)) return
    const mod = options.isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
    if (!mod) return

    const key = event.key.toLowerCase()
    if (key === 'z') {
      event.preventDefault()
      if (event.shiftKey) options.onRedo()
      else options.onUndo()
    } else if (key === 'y' && !options.isMac && !event.shiftKey) {
      event.preventDefault()
      options.onRedo()
    }
  }

  window.addEventListener('keydown', onKeydown)
  onScopeDispose(() => window.removeEventListener('keydown', onKeydown))
}
