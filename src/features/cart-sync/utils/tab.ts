/** 每次載入頁面產生新的分頁 id（8 位十六進位），同時作為 LWW 的決勝鍵 */
export function createTabId(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function tabLabel(tabId: string): string {
  return `分頁 ${tabId.slice(0, 3).toUpperCase()}`
}
