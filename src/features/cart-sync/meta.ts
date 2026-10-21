import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'cart-sync',
  title: '跨分頁購物車',
  summary:
    '同一個使用者開多個分頁時，購物車以 BroadcastChannel 即時同步，衝突以逐項 Last-Write-Wins 與 Lamport clock 收斂；庫存檢查走樂觀更新，並用 Web Locks 選出唯一負責打 API 的 leader 分頁。',
  tags: ['browser-api', 'state', 'async', 'composable'],
  highlights: [
    '跨分頁同步的核心是 BroadcastChannel：同源的分頁加入同一個名稱的頻道（new BroadcastChannel(\'cart-sync\')），一個分頁 postMessage 送出變更，其他分頁在 onmessage 收到後合併；發送者自己不會收到',
    '只廣播變更的品項，不廣播整份購物車；套用其他分頁送來的資料時不再廣播，避免 A 通知 B、B 又通知 A 的無限迴圈',
    '新分頁先從 localStorage 還原，再廣播 sync-request（「我剛來，請把資料給我」），其他分頁回傳完整購物車；不支援 BroadcastChannel 時退回 storage event，bfcache 返回時重新連線',
    '兩個分頁同時改同一件商品時，不用時間戳判斷（各分頁時鐘可能不準），而用 Lamport clock：每次修改計數器加 1，收到別人的修改就把自己調到較大值；數字大者勝，相同時比分頁 id，所有分頁算出的結果一定一致',
    '每個品項是一個 LWW register；刪除寫入 tombstone，讓刪除也能參與比較；合併具冪等性與交換律，訊息重複或亂序都會收斂',
    '自寫 Pinia plugin：store 宣告 sync option 即獲得 localStorage 持久化（含版本號、debounce 100ms）與跨分頁同步，store 本身不需要知道 plugin 存在',
    'navigator.locks 選出 leader，只有 leader 呼叫庫存 API；leader 分頁關閉時 lock 自動釋放，下一個分頁接手並立即重新檢查',
    '樂觀更新：畫面先變，庫存不足時由 leader 以新的 clock 寫入修正；請求以 AbortController 取消，時間戳改變過的品項不套用舊回應',
    '指數退避重試 3 次（500ms × 2^n ± 20% jitter），最後失敗仍可繼續操作；頁內並排兩個同源 iframe，不用切分頁就能展示同步',
  ],
  difficulty: 'advanced',
  createdAt: '2026-09-21',
}

export default meta
