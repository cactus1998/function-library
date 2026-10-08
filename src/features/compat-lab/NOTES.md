# 瀏覽器相容性實驗室

## 30 秒電梯簡報
這頁回答「你怎麼處理瀏覽器相容性」。上半部即時偵測目前瀏覽器支援哪些 CSS、HTML、JS 功能，共 22 項，並列出不支援時的替代做法。下半部整理七個切版常見的相容性問題，每個都並排「沒處理」和「處理後」。有 fallback 的案例可以勾選「模擬不支援」，強制在新瀏覽器上走舊路徑，證明 fallback 真的能用。原則是只做功能偵測，不看 User-Agent。

## 問題背景
- 切版最常遇到的狀況：自己的 Chrome 看起來都對，到客戶的 iPhone 或舊版 Safari 就壞掉。
- 常見的錯誤做法是用 User-Agent 判斷瀏覽器，再載入不同樣式。但 UA 可以偽造，同一版本在不同平台支援度也不同，而且瀏覽器一更新判斷就過時。
- 寫了 fallback 卻沒辦法驗證：手邊只有最新瀏覽器，fallback 路徑從來沒被執行過。

## 實作重點
- **偵測表**：`data/detections.ts` 的 `DETECTIONS`。
  - CSS 用 `CSS.supports()`，選擇器用 `CSS.supports('selector(:has(*))')`。
  - JS 用 `'IntersectionObserver' in window`。
  - HTML 用「建立元素、設屬性、讀回來」：`input.setAttribute('type', 'date')`，不支援的瀏覽器讀回來會是 `'text'`（`detectDateInput()`）。
- **flex gap 的特例**：`detectFlexGap()`。Safari 14.1 以前只支援 grid 的 `gap`，但 `CSS.supports('gap: 1px')` 會回傳 true。所以只能實際建立一個隱藏的 flex 容器，放兩個空子元素並設 `row-gap: 1px`，量 `scrollHeight` 是不是 1。
- **漸進增強的 CSS 結構**：`components/CompatCases.vue`。預設寫舊瀏覽器也看得懂的 fallback，再用 `@supports` 疊上原生寫法：
  ```css
  .ratio { height: 0; padding-top: 56.25%; }
  @supports (aspect-ratio: 16 / 9) {
    .ratio:not(.fallback) { height: auto; padding-top: 0; aspect-ratio: 16 / 9; }
  }
  ```
  原生規則多加一個 `:not(.fallback)`，Vue 在勾選「模擬不支援」時加上 `.fallback` class，就能在新瀏覽器上驗證舊路徑。我實測過：aspect-ratio、flex gap、`:has()`、line-clamp 四個案例切到 fallback 後，元素的高度、位置、邊框顏色都和原生寫法一模一樣。
- **案例元件**：`components/CompatCase.vue` 用具名 slot（`problem`、`broken`、`fixed`），`fixed` slot 回傳 `{ fallback }` 讓內容決定要走哪條路。
- **七個案例**：
  1. `aspect-ratio`：舊寫法是 padding-top 百分比（百分比以寬度為基準）。
  2. flex `gap`：舊寫法是子元素 margin，容器用負 margin 抵消。
  3. `:has()`：不支援時由 JS 加 `.is-checked` class。
  4. 行動版 `100vh`：寫兩次 `height: 100vh; height: 100dvh;`，瀏覽器會忽略看不懂的第二行。
  5. iOS 輸入框放大：字級設 16px，不用 `maximum-scale=1`。
  6. 多行省略：`-webkit-line-clamp` 需要搭配 `display: -webkit-box`，fallback 用 `max-height`。
  7. `type="date"`：不支援時改文字欄位加 `pattern`。

## 設計決策與取捨
| 決策 | 替代方案 | 為什麼選這個 |
|------|----------|--------------|
| 功能偵測 | User-Agent 判斷 | UA 可偽造、會過時；功能偵測直接問瀏覽器「你會不會」 |
| 先寫 fallback，再用 `@supports` 疊原生寫法 | 先寫原生，用 `@supports not` 補 fallback | 很舊的瀏覽器連 `@supports` 都不認得，會跳過整個區塊；預設放 fallback 最保險 |
| `:not(.fallback)` 強制開關 | 只在舊瀏覽器上手動測 | 手邊沒有舊瀏覽器也能驗證 fallback，展示時可以現場切 |
| 「沒處理」用靜態模擬 | 真的載入舊瀏覽器截圖 | 截圖不能互動、會過時；模擬的版本能說明問題的樣子 |
| 前綴交給 Autoprefixer | 手寫 `-webkit-` | 依 `browserslist` 自動補，不會漏也不會多 |

## 複雜度 / 效能
- 偵測表在 `onMounted` 跑一次，22 項都是 O(1) 呼叫。
- `detectFlexGap()` 會插入元素並讀 `scrollHeight`，觸發一次同步 layout（forced reflow）。`SupportTable.vue` 和 `CompatCases.vue` 各呼叫一次，共兩次。量很小，但可以快取結果。

## 已知限制與可延伸方向
- 「沒處理」那一欄是模擬，不是真的舊瀏覽器畫面。要說清楚，真正驗證要靠 BrowserStack 或實機。
- `100vh` 和 iOS 放大兩個案例只是示意：桌機無法重現工具列伸縮，也不會自動放大，只能用手機開。
- `detectFlexGap()` 被呼叫兩次。可以包成模組層級的快取（第一次算完就存起來）。
- Can I Use 的連結代稱有幾個是 `mdn-` 開頭的推測值，沒有逐一確認都能連到正確頁面。
- 偵測只跑一次；使用者切換瀏覽器實驗性旗標後要重新整理頁面。
- 日期 fallback 欄位的 `id` 是寫死的，同一頁放兩個會重複。
- 測試（`__tests__/`，17 個）mock `scrollHeight` 與 `CSS.supports` 驗證偵測邏輯，並測試 `CompatCase` 的原生／fallback 切換與 `SupportTable` 對偵測丟例外的容錯。實際 fallback 的視覺效果仍要在瀏覽器驗證。

## 延伸問題
**Q: 遇到相容性問題，你的處理流程是什麼？**
A: 先在 Can I Use 查支援度，再對照專案要支援的瀏覽器（看 `browserslist` 或 GA 的瀏覽器分佈）。需要支援就寫 fallback，結構是「預設 fallback，`@supports` 疊原生」。最後在實機或 BrowserStack 驗證。前綴交給 Autoprefixer。

**Q: 為什麼不用 User-Agent 判斷？**
A: UA 可以偽造，也常常說謊（很多瀏覽器 UA 裡都有 `Safari`、`Mozilla`）。同一版本的瀏覽器在不同作業系統支援度也不同。而且瀏覽器更新後，UA 判斷會把已經支援的新版本擋在外面。功能偵測直接問「支不支援」，不會有這些問題。

**Q: `@supports` 會不會判斷錯？**
A: 會。flex gap 就是例子：舊版 Safari 支援 grid 的 gap，`@supports (gap: 1px)` 回傳 true，但 flex 容器的 gap 其實沒效。這種情況只能實際排版量測，我在 `detectFlexGap()` 裡建立隱藏的 flex 容器，量它的高度。

**Q: 漸進增強和優雅降級差在哪？**
A: 漸進增強是先做所有瀏覽器都能用的基本版，再為支援的瀏覽器加上進階效果。優雅降級是先做完整版，再替舊瀏覽器補救。我這裡用漸進增強：預設樣式就是 fallback，`@supports` 再往上疊。

**Q: iOS 輸入框放大，為什麼不用 `maximum-scale=1`？**
A: 那會關掉所有縮放，視力不好的使用者就不能放大頁面，違反 WCAG。正確做法是把輸入框字級設成至少 16px，iOS 就不會自動放大。

**Q: `100vh` 在手機上有什麼問題？**
A: 行動瀏覽器的 `100vh` 是「網址列收起來」時的高度。網址列還在的時候，頁面比可見區域高，底部按鈕會被工具列蓋住。`100dvh` 會跟著工具列伸縮。先寫 `100vh` 再寫 `100dvh`，不支援的瀏覽器會忽略第二行，保留第一行。

**Q: 要支援的瀏覽器範圍放大很多（例如還要支援 IE11）怎麼辦？**
A: 先評估成本：IE11 不支援 CSS 變數、grid 新語法、`fetch`、Promise。CSS 要用 PostCSS 轉換，JS 要 Babel 轉譯加 polyfill（core-js），而且只給舊瀏覽器載入 polyfill（`nomodule` 或差異化打包）。如果使用者比例很低，可以跟 PM 討論只保證「能用」而不保證「一樣好看」。

**Q: 怎麼測 fallback？**
A: 這頁的做法是在原生規則加 `:not(.fallback)`，在新瀏覽器強制走舊路徑，然後比對兩條路徑的量測結果。自動化可以用 Playwright 在 Chromium、Firefox、WebKit 三種引擎各跑一次，再加上 BrowserStack 跑真實舊版本。

## 相關知識點
- CSS 解析規則：看不懂的屬性或值會被整條忽略，所以「同一屬性寫兩次」可以當 fallback。
- `browserslist`、Autoprefixer、Babel、core-js 各自負責什麼。
- forced reflow（同步 layout）：讀 `offsetHeight`、`scrollHeight` 會強迫瀏覽器立刻排版。
- WebKit、Blink、Gecko 三大引擎；iOS 上所有瀏覽器都是 WebKit。
- WCAG 1.4.4 文字縮放。
