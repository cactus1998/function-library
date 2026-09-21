/**
 * 複製文字：優先使用非同步 Clipboard API；不支援（非安全來源、舊瀏覽器）或被拒時，
 * 退回隱藏 textarea + execCommand('copy')。回傳是否成功。
 */
export function useClipboard(clipboard: Pick<Clipboard, 'writeText'> | undefined = navigator.clipboard) {
  function legacyCopy(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.append(textarea)
    textarea.select()
    let ok = false
    try {
      ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    } catch {
      ok = false
    }
    textarea.remove()
    // 選取 textarea 會搶走焦點，複製後還給原本的按鈕
    previous?.focus()
    return ok
  }

  async function copy(text: string): Promise<boolean> {
    if (clipboard) {
      try {
        await clipboard.writeText(text)
        return true
      } catch {
        // 權限被拒：改用舊方法
      }
    }
    return legacyCopy(text)
  }

  return { copy }
}
