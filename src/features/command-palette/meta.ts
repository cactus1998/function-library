import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'command-palette',
  title: '指令面板',
  summary:
    '仿 VS Code / Linear 的 Ctrl+K 指令面板：模糊搜尋並高亮命中字元、合併非同步遠端結果、巢狀子頁與全域快捷鍵，完整支援鍵盤、螢幕報讀器與中文輸入法。',
  tags: ['a11y', 'composable', 'async', 'keyboard'],
  highlights: [
    'WAI-ARIA combobox + listbox：焦點留在 input，以 aria-activedescendant 標示 active 項目，live region 延遲宣告結果數',
    '原生 <dialog> showModal 讓背景 inert，關閉後焦點回到開啟前的元素，元素已移除時退回觸發按鈕',
    '遠端搜尋 debounce 200ms，查詢變更立即 abort 舊請求，並以 controller 身分比對丟棄過期回應',
    'Fuse.js 索引只在指令清單變動時重建；拼音首字母與 title 逐字對齊，「qhzt」也能高亮「切換主題」',
    '組合鍵與序列鍵共用一個比對器：輸入框中只接受 Ctrl / ⌘ 組合鍵，IME 組字中的按鍵一律忽略',
  ],
  difficulty: 'advanced',
  createdAt: '2026-09-21',
}

export default meta
