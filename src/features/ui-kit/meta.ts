import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'ui-kit',
  title: '常見套版元件',
  summary:
    '形象網站最常出現的六個元件：輪播、手風琴、頁籤、漢堡選單、sticky header、回到頂部。不用 jQuery 與 UI 套件，盡量交給原生 HTML／CSS（scroll-snap、details、position: sticky），JS 只補必要的狀態；全部支援 RWD 與鍵盤操作，並附上可直接交給後端套版的 HTML 結構。',
  tags: ['css', 'a11y', 'interaction', 'rwd'],
  highlights: [
    '輪播以 CSS scroll-snap 處理滑動，觸控、觸控板、捲軸都原生可用；目前張數由 IntersectionObserver 判斷，不監聽 scroll 事件',
    '自動播放依 WAI-ARIA Carousel 規範：提供暫停鈕，滑鼠移入、鍵盤焦點進入、分頁切到背景時暫停；偏好減少動態的使用者預設不播放；播放中 aria-live="off"，避免螢幕閱讀器不斷朗讀',
    '手風琴只用 <details name>，零 JavaScript 就有鍵盤操作與「一次只開一個」；高度動畫以 ::details-content 搭配 interpolate-size 漸進增強，不支援的瀏覽器照樣能用',
    '頁籤採 roving tabindex：Tab 鍵只停在目前的頁籤，方向鍵、Home／End 切換；v-for 的 ref 陣列不保證順序，聚焦時改以 id 尋找',
    'sticky header 的陰影與縮小、回到頂部按鈕的顯示，都由 IntersectionObserver 觀察哨兵元素決定；漢堡選單支援 Esc 關閉、點外面關閉，切到桌機寬度時重設狀態',
  ],
  difficulty: 'basic',
  createdAt: '2026-09-23',
}

export default meta
