# 套版交接包

## 30 秒電梯簡報
這個 demo 在示範「切版怎麼交給後端」。以最新消息列表為例：我寫了一個模板函式，把 API 資料套進 HTML。然後準備六種資料情境：正常、空列表、超長文字、圖片 404、選填欄位缺漏、有 XSS 的內容，證明版面都不會破、也不會被注入。畫面下方直接給後端三樣東西：輸出的 HTML、帶 `{{ }}` 標記的模板、欄位規格表，外加一份資料檢查報告。

## 問題背景
- 設計稿上的資料都是理想狀態：標題剛好兩行、每張都有圖。真實資料會有 80 字的標題、沒有空白的英文網址、壞掉的圖片、空列表。切版時沒考慮到，就會變成「套上真資料版面就破」。
- 後端套版時常常直接把資料塞進 HTML。後台編輯貼上 `<script>` 或 `javascript:` 連結，就是 XSS。
- 交接時如果只給一份靜態 HTML，後端不知道哪些欄位是選填、缺值時要輸出什麼。

## 實作重點
- **模板函式**：`utils/renderNewsList.ts` 的 `renderNewsList()`。選填欄位（`summary`、`imageUrl`、空的 `category`）缺值時整段不輸出，不留空標籤。空列表輸出提示文字。
- **跳脫**：`utils/html.ts` 的 `escapeHtml()` 把 `& < > " '` 五個字元全部跳脫。屬性值一律用雙引號包住，所以同一個函式對文字節點和屬性都安全。
- **網址白名單**：跳脫擋不住 `javascript:alert(1)`，因為裡面沒有特殊字元。`isSafeUrl()` 只允許站內路徑（`/` 開頭但不是 `//`）、`http(s)`；圖片另外允許 `data:image/`。不合格的連結改成 `#`，不合格的圖片改用預設底圖。
- **壞圖處理**：`components/NewsPreview.vue` 的 `onError`。`<img>` 的 `error` 事件不冒泡，所以在容器上用 `@error.capture` 捕獲。一個 listener 就處理 v-html 產生的所有圖片（事件委派），把圖片換成同尺寸的底圖並回報。
- **版面防破**：
  - grid 子項設 `min-width: 0`，卡片內部用 `grid-template-columns: minmax(0, 1fr)`；否則不換行的分類標籤會把卡片撐寬。這是我在瀏覽器實測時才發現的：原本超長分類會讓卡片多出 16px。
  - `overflow-wrap: anywhere` 讓沒有空白的英文與網址也能斷行。
  - 標題、摘要用 `line-clamp` 截成 2／3 行。
  - `<img>` 寫上 `width`／`height`，外層 `aspect-ratio: 16 / 9`，skeleton 用同一套尺寸，載入前後沒有版面位移（CLS）。
- **資料檢查**：`utils/validateNews.ts` 依交接規格檢查資料。error 表示會被替換成預設值，warning 表示畫面會截斷。日期只接受 `YYYY-MM-DD`，格式不對就不顯示，不替後端猜測。
- **日期**：`isPlainDate()` 用 `T00:00:00Z` 解析，`formatDate()` 用 `timeZone: 'UTC'` 格式化，避免時區讓日期差一天。

## 設計決策與取捨
| 決策 | 替代方案 | 為什麼選這個 |
|------|----------|--------------|
| 產生 HTML 字串 + `v-html` 預覽 | 用 Vue 模板渲染 | 預覽的就是後端會輸出的那一段 HTML，所見即所交；代價是必須自己保證跳脫正確 |
| 協定白名單 | 黑名單擋 `javascript:` | 黑名單擋不完（大小寫、`vbscript:`、編碼繞過），白名單只放行已知安全的 |
| 在容器上捕獲 `error` | 每張圖綁 `onerror` 屬性 | v-html 的內容無法綁 Vue 事件；inline `onerror` 又會被 CSP 擋掉 |
| 缺值整段不輸出 | 輸出空標籤再用 CSS 隱藏 | 空的 `<p>` 仍佔 grid gap 與 margin，而且螢幕閱讀器會讀到空元素 |
| 格式錯誤就不顯示 | 前端嘗試解析 `2026/9/1` | 猜錯比不顯示更糟，而且回報給後端才會從源頭修正 |

## 複雜度 / 效能
- `renderNewsList` 和 `validateNews` 都是 O(n)，n 是消息筆數。
- `escapeHtml` 是一次 regex replace，O(字串長度)。
- 圖片 `loading="lazy"`、`decoding="async"`，捲到附近才載入。

## 已知限制與可延伸方向
- `data/scenarios.ts` 的 `TEMPLATE_SNIPPET` 是手寫的。目前有測試確認 `renderNewsList` 輸出的每個 class 都出現在模板中、每個欄位都有 `{{ }}` 標記，但模板的巢狀結構仍需人工維護。
- `onError` 直接移除 v-html 裡的 `<img>`，這是繞過 Vue 的 DOM 操作。html 字串沒變時 Vue 不會重畫，所以目前沒問題；但如果之後改成部分更新，就要注意。
- `isSafeUrl` 放行 `data:image/svg+xml`。在 `<img>` 裡 SVG 的腳本不會執行，是安全的；但如果後端把同一個欄位拿去放 `<object>` 或 `<a href>`，就不安全。規格表應該寫清楚這個欄位只能用在 `<img>`。
- 標題字數用 `string.length` 計算，emoji 會算成 2 個字。可以改用 `Array.from(str).length` 或 `Intl.Segmenter`。
- 測試（`__tests__/`，54 個）涵蓋跳脫、網址白名單（大小寫 `JaVaScRiPt:`、`//evil.com`、`data:text/html`）、日期、選填欄位、屬性逃逸，以及「所有示範情境都不會輸出 script、on* 屬性或 javascript: 網址」；元件層測試壞圖以捕獲階段替換、程式碼面板與預覽的 HTML 一致。

## 面試官可能追問
**Q: 用 v-html 不是很危險嗎？**
A: 危險的是把沒跳脫的資料丟進去。我的字串是自己產生的，每個欄位都經過 `escapeHtml`，網址另外檢查協定。等於是把「後端模板引擎的自動跳脫」這件事在前端做一次。如果資料本身就是 HTML（例如後台富文字編輯器），就不能只靠跳脫，要用 DOMPurify 之類的 sanitizer。

**Q: 為什麼跳脫擋不住 `javascript:`？**
A: 跳脫只處理會破壞 HTML 結構的字元。`javascript:alert(1)` 放進 `href="..."` 完全合法，結構沒被破壞，但點下去就執行。所以網址要另外檢查協定，而且用白名單。

**Q: 圖片的 error 事件為什麼要用 capture？**
A: `error`、`load`、`focus` 這類事件不冒泡，但所有事件都會經過捕獲階段。所以在祖先元素上用捕獲監聽，就能做事件委派。

**Q: 超長文字你做了哪些處理？**
A: 三件事：`overflow-wrap: anywhere` 讓沒有空白的字串斷行；`line-clamp` 限制行數；grid 子項設 `min-width: 0`，不然 grid 欄寬最小值是內容寬度，長字串會把欄撐破。第三個最常被忽略，我自己也是實測才抓到。

**Q: 怎麼避免圖片載入造成版面跳動？**
A: `<img>` 寫上 `width`、`height`，瀏覽器會用寬高比先保留空間；外層再用 `aspect-ratio` 固定比例。壞圖換成同尺寸底圖，skeleton 也用同一套尺寸，所以載入前、載入後、載入失敗，高度都一樣。

**Q: 如果列表有 1 萬筆呢？**
A: 字串拼接本身很快，但一次塞 1 萬張卡片進 DOM 會很慢。首先應該由後端分頁；前端需要一次顯示大量資料時，改用虛擬列表只渲染可見範圍（專案裡的 `virtual-list` 就是這個）。

**Q: 怎麼測？**
A: 純函式寫單元測試：XSS 字串要被跳脫、各種危險網址要被擋、選填欄位缺值不輸出標籤、空陣列輸出提示。元件層用 Vue Test Utils 觸發 `img` 的 error 事件，確認換成底圖。視覺層可以用 Playwright 截六種情境比對。

## 相關知識點
- XSS 的三種類型（stored、reflected、DOM-based），以及 CSP 如何作為第二道防線。
- 事件傳遞的三個階段：capture、target、bubble；哪些事件不冒泡。
- CLS（Cumulative Layout Shift）與 Core Web Vitals。
- `min-width: auto` 在 flex／grid 子項的預設行為。
- 前後端分工：API 契約（欄位型別、必填、格式）越早對齊，套版越少來回。
