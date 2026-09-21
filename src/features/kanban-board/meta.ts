import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'kanban-board',
  title: '拖放看板',
  summary:
    '仿 Trello 的三欄看板：以 Pointer Events 自行實作同欄排序、跨欄移動與邊緣自動捲動，所有變更走 command pattern 支援 Undo / Redo，並可只用鍵盤完成拖放。',
  tags: ['interaction', 'state', 'a11y', 'composable'],
  highlights: [
    'Pointer Events 統一滑鼠、觸控與觸控筆：移動 5px 才開始拖曳，觸控長按 200ms，拖曳中以非 passive 的 touchmove 阻止頁面捲動',
    '拖曳開始時量測一次卡片位置並扣掉被拖卡片佔的高度，插入索引只和指標位置有關，placeholder 移動不會讓結果來回跳動',
    '拖曳中只更新 ghost 的 transform 與 placeholder 位置，放下時才寫入 Pinia store 一次',
    'Command pattern：新增、編輯、刪除、移動都有 do / undo，歷史上限 50 筆；Ctrl+Z / Ctrl+Shift+Z 在輸入框中交給瀏覽器原生行為',
    '鍵盤拖放：Space 拿起、方向鍵移動、Space 放下、Esc 取消，aria-live 宣告位置，移動後焦點留在同一張卡片',
    '看板存入 localStorage（含版本號），讀取時驗證 schema、過濾不存在與重複的卡片 id，寫入 debounce 300ms 並在 pagehide 補存',
  ],
  difficulty: 'advanced',
  createdAt: '2026-09-21',
}

export default meta
