import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'compat-lab',
  title: '瀏覽器相容性實驗室',
  summary:
    '即時偵測目前瀏覽器支援哪些 CSS、HTML、JS 功能，並附上不支援時的替代做法；另外整理七個切版常見的相容性問題（aspect-ratio、flex gap、:has()、行動版 100vh、iOS 輸入框放大、多行省略、日期欄位），每個都並排「沒處理」與「處理後」，可以一鍵強制走 fallback，證明舊瀏覽器也能正常顯示。',
  tags: ['css', 'compatibility', 'browser-api', 'html5'],
  highlights: [
    '只做功能偵測，不看 User-Agent：CSS 用 CSS.supports() 與 @supports，JS 用 \'x\' in window，HTML 用建立元素後讀回屬性（type="date" 不支援會退回 text）',
    '漸進增強：預設寫舊瀏覽器也看得懂的 fallback，再用 @supports 疊上原生寫法；原生規則加上 :not(.fallback)，因此可以在新瀏覽器上強制走舊路徑驗證 fallback',
    'flex gap 是 @supports 會誤判的例子：Safari 13 只支援 grid 的 gap，gap: 1px 卻回報支援，只能建立隱藏的 flex 容器量測 scrollHeight',
    '同一屬性寫兩次（height: 100vh; height: 100dvh;）：瀏覽器會忽略看不懂的值，保留前一行，是不需要 @supports 的最簡單 fallback',
    'iOS 輸入框字級小於 16px 會自動放大；正確做法是把字級設為 16px，而不是用 maximum-scale=1 關閉縮放，後者會傷害需要放大的使用者',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-23',
}

export default meta
