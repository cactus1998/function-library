# 常見套版元件

## 30 秒電梯簡報
形象網站最常出現的六個元件：輪播、手風琴、頁籤、漢堡選單、sticky header、回到頂部。我沒用 jQuery 或 UI 套件，而是盡量讓原生 HTML／CSS 做事：輪播滑動交給 CSS scroll-snap，手風琴直接用 `<details>`，header 用 `position: sticky`，JS 只補必要的狀態。每個元件都能用鍵盤操作，也都附上可以直接交給後端套版的 HTML 結構。

## 問題背景
- 設計公司的案子幾乎每個都有這些元件。常見做法是套 jQuery 外掛（Slick、Swiper），但會多一大包 JS，而且大多沒處理無障礙。
- 自己寫輪播最容易踩的坑：自動播放沒有暫停鈕（違反 WCAG 2.2.2）、觸控滑動要自己算手勢、螢幕閱讀器不斷朗讀換頁。
- 監聽 `scroll` 事件做 sticky header 或回到頂部，每秒觸發幾十次，要 throttle，還容易造成卡頓。

## 實作重點
- **輪播**：`components/ImageCarousel.vue` + `composables/useCarousel.ts`。
  - 滑動交給 CSS：`scroll-snap-type: x mandatory`，觸控、觸控板、捲軸都原生可用，不用寫手勢判斷。
  - 目前是第幾張由 IntersectionObserver 判斷（`root` 是 track、`threshold: 0.6`），不監聽 scroll。
  - 自動播放狀態由四個條件推導：`!userPaused && !hovering && !focusWithin && !pageHidden`。滑鼠移入、鍵盤焦點進入、分頁切到背景（`visibilitychange`）都會暫停。
  - `prefers-reduced-motion` 的使用者預設不自動播放，換頁用 `behavior: 'auto'` 不做平滑捲動。
  - 依 WAI-ARIA Carousel 規範：`aria-roledescription="carousel"`，每張 `role="group"` 並標示「第 n 張，共 m 張」。播放中 `aria-live="off"`，停止後改 `polite`。
  - 畫面外 slide 的連結設 `tabindex="-1"`，Tab 不會跑到看不見的地方。
  - `focusout` 用 `relatedTarget` 判斷焦點是否真的離開輪播，在內部元素之間移動不算離開。
- **手風琴**：`components/FaqAccordion.vue`，零 JavaScript。
  - `<details name="ui-kit-faq">`：`name` 相同的 details 一次只會展開一個（exclusive accordion）。
  - 高度動畫用 `::details-content` 加 `interpolate-size: allow-keywords` 漸進增強，包在 `@supports` 裡；不支援的瀏覽器照樣能展開，只是沒有動畫。
- **頁籤**：`components/ProductTabs.vue`，WAI-ARIA Tabs pattern。
  - roving tabindex：只有目前的 tab 是 `tabindex="0"`，其他是 `-1`，所以 Tab 鍵只停一次，進去後用方向鍵切換。
  - ← → 會循環（最後一個按右回到第一個），Home／End 到頭尾，切換即啟用（automatic activation）。
  - v-for 的 ref 陣列不保證和資料順序一致，所以聚焦時用 id 找按鈕。
- **漢堡選單、sticky header、回到頂部**：`components/SiteShell.vue`，用一個可捲動容器模擬瀏覽器視窗。
  - 在頂端放一個 1px 的哨兵元素。哨兵離開畫面就代表往下捲了，header 加陰影並縮小；Hero 完全離開畫面後才顯示「回到頂部」。兩件事共用一個 IntersectionObserver。
  - 回到頂部後把焦點移到頁首標題（`tabindex="-1"`、`preventScroll: true`），鍵盤使用者不用再 Tab 回去。
  - 選單支援 Esc 關閉並還原焦點、點選單外面關閉（document `pointerdown`）。`useMediaQuery` 監聽 720px 斷點，切到桌機時重設選單狀態。
- **HTML 結構交接**：`data/snippets.ts`，由 `components/DemoBlock.vue` 顯示並提供複製（`composables/useClipboard.ts`，非 HTTPS 或權限被拒時顯示失敗）。

## 設計決策與取捨
| 決策 | 替代方案 | 為什麼選這個 |
|------|----------|--------------|
| scroll-snap 輪播 | `transform` + Pointer Events 手勢 | 原生滑動手感最好、支援觸控板與慣性；缺點是很難做無限循環 |
| IntersectionObserver 追蹤張數與捲動狀態 | `scroll` 事件 + throttle | 不在主執行緒上每幀計算，程式也比較短 |
| `<details name>` 手風琴 | 自己寫按鈕 + `aria-expanded` | 零 JS，鍵盤與螢幕閱讀器行為由瀏覽器處理；舊瀏覽器不支援 `name` 時會退化成可多開，仍然能用 |
| 頁籤 automatic activation | manual activation（按 Enter 才切換） | 面板內容是本地資料、切換成本低；如果切換要打 API，應該改成 manual |
| 自動播放預設開啟，但提供暫停鈕 | 預設關閉 | 符合一般形象網站需求，同時滿足 WCAG 2.2.2；偏好減少動態的使用者預設關閉 |
| 回到頂部時移動焦點 | 只捲動 | 否則鍵盤使用者的焦點還停在頁尾 |

## 複雜度 / 效能
- 輪播與 SiteShell 各一個 IntersectionObserver，沒有 scroll listener。
- 自動播放用 `setInterval`，`playing` 變成 false 時立刻清掉，不會在背景分頁空轉。
- sticky header 縮小時改的是 `height`，會觸發 layout。如果要更順，可以改用 `transform: scaleY` 或只改陰影。

## 已知限制與可延伸方向
- 輪播不是無限循環：從最後一張按下一張會捲回第一張，整段倒捲。要無限循環需要複製頭尾 slide，捲到複製品時瞬間跳回。
- 使用者手動滑動後，自動播放的計時器不會重設，下一次自動換頁可能在滑完後很快就發生。可以在 `current` 改變時重設 interval。
- 畫面外的 slide 只設了連結的 `tabindex="-1"`，螢幕閱讀器用瀏覽模式仍讀得到。可以對非目前的 slide 加 `inert`。
- 圓點用 `aria-current` 標示目前張數，不是 APG 的 tablist 版本，但仍符合 basic carousel 模式。
- 手風琴動畫只有 Chrome 131 以上才有。
- sticky header 縮小會讓下方內容往上移 12px，有輕微版面位移。
- 選單的 document `pointerdown` listener 在 setup 就註冊，不是 `onMounted`。在瀏覽器沒問題，但如果要做 SSR 需要改。
- `data/snippets.ts` 的 HTML 是手寫的，可能和元件實際輸出不同步。
- 測試（`__tests__/`，32 個）以可手動觸發的 IntersectionObserver、matchMedia mock 與 fake timers，驗證自動播放在 hover／focus／背景分頁／減少動態時暫停、頁籤鍵盤操作、選單關閉與焦點還原，以及卸載時清掉計時器、observer 與 document listener。

## 延伸問題
**Q: 不用 jQuery 外掛，輪播怎麼做滑動？**
A: 交給 CSS scroll-snap。track 設 `overflow-x: auto` 和 `scroll-snap-type: x mandatory`，每張設 `scroll-snap-align: start`。這樣手機滑動、觸控板、滑鼠滾輪都是瀏覽器原生處理，慣性和回彈也是。JS 只負責按鈕換頁（`scrollTo`）和判斷目前第幾張。

**Q: 輪播的無障礙要注意什麼？**
A: 三件事。第一，自動播放一定要有暫停鈕，而且焦點進入或滑鼠移入時要暫停。第二，播放中 `aria-live` 設 `off`，不然螢幕閱讀器每 5 秒被打斷一次。第三，看不見的 slide 裡的連結不要被 Tab 到。另外尊重 `prefers-reduced-motion`。

**Q: 為什麼用 IntersectionObserver 而不是 scroll 事件？**
A: scroll 事件在主執行緒上觸發得非常頻繁，要 throttle，每次還要讀 `getBoundingClientRect` 算位置，可能造成 forced reflow。IntersectionObserver 由瀏覽器非同步計算交集，只在跨過門檻時通知。我用一個 1px 哨兵判斷「是否已經往下捲」，程式很短。

**Q: roving tabindex 是什麼？**
A: 一組元件（例如 tablist）裡只有一個元素可以被 Tab 到，其他設 `tabindex="-1"`。進去之後用方向鍵在組內移動，移動時把 `tabindex="0"` 換到新元素並聚焦。這樣 Tab 鍵只需要按一次就能跳過整組，是 WAI-ARIA 對複合元件的建議。

**Q: `<details>` 可以做動畫嗎？**
A: 以前不行，因為高度從 0 到 `auto` 無法 transition。現在可以用 `::details-content` 虛擬元素，加上 `interpolate-size: allow-keywords` 讓 `height: auto` 可以動畫。這是新功能，所以我包在 `@supports` 裡，舊瀏覽器沒有動畫但功能完整。

**Q: 漢堡選單要不要 focus trap？**
A: 看是哪種模式。這裡是 disclosure（展開一段導覽連結），不是 modal，所以不需要 trap，使用者可以 Tab 出去。但要做到 Esc 關閉並把焦點還給按鈕、點外面關閉。如果選單是全螢幕覆蓋的 modal 樣式，就要 trap，並讓背景 `inert`。

**Q: 如果一頁有 10 個輪播怎麼辦？**
A: 每個輪播各有 observer 和 interval，10 個問題不大。但應該讓畫面外的輪播暫停：再用一個以 viewport 為 root 的 IntersectionObserver，輪播不在畫面上時停止計時器。圖片要 lazy load，非第一張的 slide 可以延後載入。

**Q: 怎麼測？**
A: 元件測試用 Vue Test Utils：頁籤按方向鍵後 `aria-selected` 與焦點正確、Home／End、循環；選單 Esc 後焦點回到按鈕。輪播的 `useCarousel` 可以用 fake timers 測自動播放在 hover、focus 時暫停。IntersectionObserver 在 jsdom 裡沒有，要 mock。捲動相關的行為用 Playwright 在真實瀏覽器測比較可靠。

## 相關知識點
- WAI-ARIA Authoring Practices：Carousel、Tabs、Disclosure、Accordion 四種 pattern。
- WCAG 2.2.2（Pause, Stop, Hide）、2.3.3（動畫）、2.4.3（焦點順序）。
- `position: sticky` 失效的常見原因：祖先有 `overflow: hidden`，或沒有設定 `top`。
- `inert` 屬性：讓整塊區域不能聚焦、不被讀取。
- Page Visibility API 與背景分頁的計時器節流。
- Clipboard API 需要 secure context（HTTPS 或 localhost）。
