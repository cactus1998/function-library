import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'cart-sync',
  title: '跨分頁購物車',
  summary:
    '同一個使用者開多個分頁時，購物車以 BroadcastChannel 即時同步，衝突以逐項 Last-Write-Wins 與 Lamport clock 收斂；庫存檢查走樂觀更新，並用 Web Locks 選出唯一負責打 API 的 leader 分頁。',
  tags: ['browser-api', 'state', 'async', 'composable'],
  highlights: [
    '每個品項是一個 LWW register，帶 Lamport clock 與 tabId；刪除寫入 tombstone，合併具冪等性與交換律，訊息重複或亂序都會收斂',
    '自寫 Pinia plugin：store 宣告 sync option 即獲得 localStorage 持久化（含版本號、debounce 100ms）與跨分頁同步，只廣播 action 回傳的變更品項',
    'BroadcastChannel 為主，不支援時退回 storage event；新分頁以 sync-request 補齊尚未寫入儲存的變更，bfcache 返回時重新連線',
    'navigator.locks 選出 leader，只有 leader 呼叫庫存 API；leader 分頁關閉時 lock 自動釋放，下一個分頁接手並立即重新檢查',
    '樂觀更新：畫面先變，庫存不足時由 leader 以新的 clock 寫入修正；請求以 AbortController 取消，時間戳改變過的品項不套用舊回應',
    '指數退避重試 3 次（500ms × 2^n ± 20% jitter），最後失敗仍可繼續操作；頁內並排兩個同源 iframe，不用切分頁就能展示同步',
  ],
  difficulty: 'advanced',
  createdAt: '2026-09-21',
}

export default meta
