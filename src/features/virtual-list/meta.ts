import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'virtual-list',
  title: '虛擬列表',
  summary:
    '10 萬筆資料只渲染可視範圍的列，支援固定與動態高度，並可切換成全量渲染即時比較 FPS 與 DOM 數量。',
  tags: ['performance', 'composable', 'a11y', 'algorithm'],
  highlights: [
    '版面策略模式：固定高度 O(1) 定位；動態高度以 Float64Array 前綴和延遲計算加二分搜尋',
    'ResizeObserver 量測實際高度，並補償可視區上方列的高度變化，捲動時畫面不跳動',
    'scrollToIndex 先以預估高度跳轉，量測後逐幀修正直到位置穩定',
    'computed 回傳相同範圍時沿用舊物件，在同一段範圍內捲動不會重新渲染列',
    'listbox + aria-activedescendant 鍵盤導覽，選取項目一定保留在 DOM 中',
  ],
  difficulty: 'advanced',
  createdAt: '2026-09-21',
}

export default meta
