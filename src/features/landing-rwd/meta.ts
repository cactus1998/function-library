import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'landing-rwd',
  title: '設計稿還原 Landing Page',
  summary:
    '以咖啡品牌形象頁為題，用語意化 HTML5 與純 CSS 完成 mobile-first 的 RWD 切版。內建視窗模擬器（375／768／1024／1440 與自訂寬度）、4／8／12 欄格線疊圖、盒模型除錯，還能上傳 Photoshop 匯出的設計稿做半透明或差異疊圖，逐 px 比對還原度。',
  tags: ['css', 'rwd', 'html5', 'design-handoff'],
  highlights: [
    '版面以 container query 撰寫：模擬器改變寬度就能即時切換斷點，不必真的縮放瀏覽器；搬到正式頁面只要把 @container 換成 @media，斷點數值不變',
    'mobile-first：預設樣式就是手機版，640px 與 1024px 往上疊加；欄數、欄距、左右留白都是 CSS 變數，格線疊圖讀取同一組變數，畫面和格線不會各自漂移',
    '字級用 clamp(最小值, 基準 + cqi, 最大值) 流體縮放，只在兩端設上下限，不用每個斷點各寫一次 font-size',
    '設計稿疊圖支援 @1x／@2x 切圖：以 naturalWidth ÷ 倍率換算成 CSS px，可切換「差異」混合模式，對齊的地方會變成黑色，一眼看出偏移',
    '只用語意化標籤（header／nav／main／section／article／footer）與原生表單；漢堡選單有 aria-expanded、aria-controls，Esc 關閉並把焦點還給按鈕',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-23',
}

export default meta
