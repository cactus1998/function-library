import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'template-handoff',
  title: '套版交接包',
  summary:
    '以「最新消息」列表為例，示範切版如何交接給後端：同一份模板餵入六種資料情境（正常、空列表、超長文字、圖片 404、選填欄位缺漏、不安全內容），版面都不會破；並附上輸出 HTML、API JSON、欄位規格與資料檢查報告，後端照表套版即可。',
  tags: ['html5', 'css', 'security', 'design-handoff'],
  highlights: [
    '模板函式只做兩件事：跳脫與組字串。五個 HTML 特殊字元全部跳脫、屬性一律加雙引號，後台貼上的 <script> 會以純文字顯示',
    '跳脫擋不住 javascript: 網址，所以連結與圖片另外做協定白名單（站內路徑、http(s)、data:image），不合格的連結改為 #、圖片改用預設底圖',
    '圖片 error 事件不冒泡，在容器上以捕獲階段監聽，一個 listener 就能接住 v-html 產生的所有圖片；壞圖換成同尺寸底圖，卡片高度不變',
    '版面防破：grid 子項加 min-width: 0、長字串 overflow-wrap: anywhere、標題與摘要以 line-clamp 截成 2／3 行；img 寫上 width／height 並用 aspect-ratio，skeleton 與卡片尺寸一致，載入前後沒有版面位移',
    '選填欄位缺值時整段不輸出，不留空標籤；日期只接受 YYYY-MM-DD，格式不對就不顯示並回報，不替後端猜測',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-23',
}

export default meta
