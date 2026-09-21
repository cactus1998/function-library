import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'booking-slots',
  title: '預約時段選擇器',
  summary:
    '以髮廊線上預約為情境：依營業時間、午休、公休與例外日、服務時長與最短提前時間計算可預約時段；不用日期套件處理店家與使用者時區，日曆支援完整鍵盤導覽，並處理月份快速切換與時段被搶先預約的衝突。',
  tags: ['date-time', 'a11y', 'async', 'form'],
  highlights: [
    '日期以 YYYY-MM-DD 字串、時間以當日分鐘數表示，只有和「現在」比較時才換成 epoch ms，避免 new Date(字串) 被當成 UTC 午夜而跨日',
    '不引入日期套件：以 Intl.DateTimeFormat 取得指定時區的牆上時間，反推時區偏移做雙向轉換，DST 缺口回傳 null；時段附註使用者當地時間（含「前一天」）',
    '時段計算為純函式：服務必須完整落在同一段營業區間（不跨午休、不超過打烊），最短提前 2 小時無條件進位到 30 分粒度並可跨日，與既有預約以半開區間判斷重疊',
    '日曆依 WAI-ARIA grid 實作 roving tabindex：方向鍵、Home / End、PageUp / PageDown（1/31 到 2/28），焦點移到補位格時自動換月，不可選的日子仍可聚焦並讀出原因',
    '月份切換以 AbortController 取消舊請求，舊回應永遠不會覆蓋新月份；同月份快取 60 秒，載入中日曆保留格子（CLS 為 0）',
    '伺服器才是「誰先訂到」的依據：送出時回 409 會保留姓名電話、清除時段並重新載入；連點只送出一次，成功後可下載 UTC 格式的 .ics',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-21',
}

export default meta
