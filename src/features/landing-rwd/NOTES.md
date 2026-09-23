# 設計稿還原 Landing Page

## 30 秒電梯簡報
我用語意化 HTML5 和純 CSS 切了一個咖啡品牌的形象頁，採 mobile-first，斷點是 640px 和 1024px。為了讓面試官不用縮放瀏覽器就能看到 RWD，我做了一個視窗模擬器，可以切 375／768／1024／1440 或自訂寬度。還能打開 4／8／12 欄的格線疊圖，或上傳 Photoshop 匯出的設計稿做差異疊圖，逐 px 比對還原度。最關鍵的技術點是版面用 container query 寫：模擬器改寬度，斷點就即時切換。

## 問題背景
- 切版職最常被問「你怎麼確認跟設計稿一樣」。只放一張完成截圖，看不出還原度，也看不出 RWD 是不是每個寬度都顧到。
- naive 做法是寫 `@media`，再叫面試官自己拖瀏覽器視窗。但 `@media` 看的是整個瀏覽器視窗，沒辦法在頁面裡「放一個 375px 的框」讓它套手機樣式。用 iframe 可以，但要另外起一個頁面，樣式與資料也要分開維護。
- 設計稿比對：肉眼左右對看很難看出 2–3px 的偏差。

## 實作重點
- **container query 取代 media query**：`components/LandingPage.vue` 最外層 `.landing-root { container: landing / inline-size; }`，所有斷點寫成 `@container landing (min-width: 640px)`。模擬器只要改外框寬度，裡面就換版。container 不能查詢自己，所以樣式寫在內層的 `.landing`。
- **mobile-first**：預設樣式就是手機版，往上用 `min-width` 疊加。例如商品格線預設 1 欄，640px 起 2 欄，1024px 起 4 欄（`.product-grid`）。
- **格線是 CSS 變數**：`.landing` 定義 `--cols`、`--gutter`、`--margin`，每個斷點改這三個值。Hero 與訂閱區塊用 `grid-template-columns: repeat(var(--cols), minmax(0, 1fr))` 排版，格線疊圖（`.grid-overlay`）也讀同一組變數，所以格線和內容不會各自漂移。
- **流體字級**：`font-size: clamp(2rem, 1.2rem + 4cqi, 3.75rem)`，`cqi` 是容器寬度的 1%。實測 375px 時 34.2px、768px 時 49.9px、1440px 時停在 60px。
- **模擬器縮放**：`components/ViewportSimulator.vue`。模擬寬度大於可用空間時，用 `transform: scale()` 等比例縮小。`transform` 不會改變 layout 尺寸，所以外層 `.stage` 的高度要手動設成「frame 實際高度 × 縮放比」，下方才不會留一大片空白。兩個尺寸都由 `composables/useElementSize.ts` 的 ResizeObserver 取得。
- **設計稿疊圖**：`composables/useDesignOverlay.ts`。用 `URL.createObjectURL` 讀本機圖片，以 `naturalWidth ÷ 倍率` 換算 CSS px（@2x 切圖要除以 2）。「差異」模式用 `mix-blend-mode: difference`：像素相同的地方變黑，偏移處出現亮邊。換圖、移除圖、元件卸載時都會 `revokeObjectURL`，不會漏記憶體。
- **漢堡選單**：`aria-expanded`、`aria-controls`，Esc 關閉後用 `nextTick` 把焦點還給按鈕。
- **對比度**：品牌色原本是 `#b4602a`，白字對比只有 4.52、放在米色底上只有 4.02，不到 WCAG AA 的 4.5。我改成 `#a5541f`，白字 5.4、米色底 4.8。

## 設計決策與取捨
| 決策 | 替代方案 | 為什麼選這個 |
|------|----------|--------------|
| container query | iframe + `@media` | 不用另外起頁面，元件資料和樣式只維護一份；缺點是 Safari 16 以前不支援 |
| `transform: scale` 縮放預覽 | `zoom` 屬性 | `transform` 不影響 layout，裡面仍以真實寬度排版；`zoom` 會改變排版結果，就不是「真的 1440px」 |
| 格線、欄距用 CSS 變數 | 每個斷點寫死數值 | 格線疊圖與版面讀同一組變數，不會漂移 |
| `clamp()` 流體字級 | 每個斷點各設一次 font-size | 少寫很多斷點，而且中間寬度也平滑，不會在斷點瞬間跳一級 |
| 設計稿由使用者上傳 | 內建一張設計稿 | 面試時可以放自己在 PS 畫的稿，證明會用設計工具，也不用把大圖放進 repo |

## 複雜度 / 效能
- 頁面本身是靜態標記，沒有 JS 運算。模擬器只有兩個 ResizeObserver，拖寬度滑桿時由瀏覽器重新排版。
- 整頁 CSS 約 12.5 kB（build 後、未 gzip），gzip 後約 3 kB。
- 縮放用 `transform`，只觸發合成（composite），不觸發 layout。但滑桿改的是 `width`，那部分一定會 reflow。

## 已知限制與可延伸方向
- 斷點數值在 `data/tokens.ts` 和 `LandingPage.vue` 各寫一次，因為 `@container` 條件不能讀 CSS 變數或 JS 常數。要改就兩邊都改。可以改用 PostCSS 的 custom media 或 Sass 變數集中管理。
- container query 沒做 fallback：Safari 16 以前會永遠停在手機版。正式專案要支援舊瀏覽器時，應該改回 `@media`。
- 放寬到桌機後，手機選單的 `menuOpen` 狀態不會重設：先在手機寬度打開選單、再放大、再縮回，選單仍是展開的。可以參考 `ui-kit` 的 `SiteShell.vue`，用 media query 監聽斷點變化並重設狀態。
- 手機選單沒有「點外面關閉」。
- 商品圖用 CSS 漸層代替，所以沒有示範 `<picture>`、`srcset`、`sizes` 的響應式圖片。這是切版常考題，值得補上。
- 設計稿只能從左上角對齊，不能微調偏移或對齊置中版面。
- 測試（`__tests__/`，26 個）涵蓋斷點判斷、`LandingPage.vue` 的 `@container` 斷點與欄數是否和 `tokens.ts` 一致（讀取元件原始碼比對，彌補兩邊各寫一次的風險）、設計稿疊圖的 object URL 釋放、模擬器縮放與置中、選單 Esc 還原焦點。jsdom 沒有版面計算，實際排版仍需在瀏覽器或 Playwright 驗證。

## 面試官可能追問
**Q: container query 和 media query 差在哪？什麼時候用哪個？**
A: media query 看整個 viewport，container query 看某個祖先容器的寬度。整頁版型用 media query 就夠了。同一個元件會放在不同寬度的欄位裡時（例如卡片可能在側欄也可能在主欄），用 container query 比較合適。我這裡用它，是為了讓預覽框的寬度直接決定版型。

**Q: mobile-first 有什麼好處？**
A: 手機版通常最簡單，一欄排下來就好，往上再疊加複雜版型，覆寫比較少。反過來從桌機往下寫，要一直把 grid、float 拆掉。另外手機載入的 CSS 規則也比較少需要覆寫。

**Q: 設計稿是 @2x 的，你怎麼對齊？**
A: 設計稿 2880px 寬代表 CSS 的 1440px。我把圖片寬度設成 `naturalWidth ÷ 2`，再把模擬器寬度設成一樣（有一顆「寬度設為設計稿」的按鈕）。然後用 `mix-blend-mode: difference`，對齊的地方會變黑。

**Q: `clamp(2rem, 1.2rem + 4cqi, 3.75rem)` 的數字怎麼來的？**
A: 先定兩端：375px 時約 32px，1440px 時 60px。中間值用「基準 rem + 容器寬度百分比」做線性插值，再用 clamp 把上下限鎖住。基準要保留一段 rem，使用者調整瀏覽器字級時才會跟著放大；只用 `vw` 或 `cqi` 的話，縮放文字會失效。

**Q: 如果設計師給的稿在 1024 和 1440 之間沒有定義怎麼辦？**
A: 我會先問設計師，而不是自己猜。溝通前先準備好我的預設做法：內容最大寬 1200px 置中，字級用 clamp 平滑放大，然後用模擬器拖給設計師看中間寬度的效果，讓他確認。

**Q: 要支援 IE11 或很舊的 Safari 怎麼辦？**
A: container query 和 `clamp` 都要換掉：斷點改回 `@media`，字級在每個斷點寫固定值；grid 的部分舊 Safari 其實支援，IE11 只支援舊語法，要靠 Autoprefixer 或改用 flex。實務上會先看 `browserslist` 和 GA 的瀏覽器分佈，再決定值不值得。

**Q: 這個頁面規模放大 10 倍（很多頁面、很多元件）怎麼管理樣式？**
A: 把 token（顏色、字級、間距、斷點）抽成全站共用的 CSS 變數，元件用 BEM 或 CSS Modules 隔離命名。斷點用 PostCSS custom media 集中定義，避免現在這種 TS 和 CSS 各寫一次的問題。

**Q: 怎麼測試 RWD？**
A: 手動：DevTools 裝置模式加實機，至少 iOS Safari 和 Android Chrome 各一台。自動化：Playwright 開多個 viewport 截圖做視覺回歸；或斷言關鍵元素，例如 375px 時漢堡按鈕可見、商品是 1 欄。

## 相關知識點
- reflow／repaint／composite：改 `width` 會 reflow，改 `transform`、`opacity` 只需 composite。
- `rem`、`em`、`vw`、`cqi` 的差別與適用情境。
- CSS Grid 的 `minmax(0, 1fr)` 與 `1fr` 差異：`1fr` 最小值是 `auto`，長內容會撐破欄寬。
- WCAG 對比度：一般文字 4.5:1，大字 3:1。
- 語意化標籤對 SEO 與螢幕閱讀器的影響（`header`、`nav`、`main`、`section` 要有標題、`figure`／`blockquote`）。
- `URL.createObjectURL` 與 `revokeObjectURL` 的記憶體管理。
