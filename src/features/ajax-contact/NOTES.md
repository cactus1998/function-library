# Ajax 表單與分頁列表

## 30 秒電梯簡報
我用原生 `fetch` 做了聯絡表單和留言分頁，沒有用 axios。重點在失敗處理：逾時、斷線、5xx、422 欄位錯誤、切頁時的競態都有處理。GET 失敗時用指數退避自動重試；POST 不自動重試，手動重試時帶同一個 `Idempotency-Key`，就算上一次其實已經送達也不會重複留言。頁面上可以切換伺服器狀態，旁邊有一個仿 DevTools 的 Network 面板，可以現場重現每一種失敗。

## 問題背景
- 很多人以為 `fetch` 失敗會進 `catch`，但 `fetch` 只有網路層失敗才 reject，404、500 仍會 resolve。沒檢查 `res.ok` 就會把錯誤頁當成資料。
- `fetch` 沒有內建逾時，伺服器不回應時會一直轉圈。
- 使用者快速切換分頁時，先發的請求可能比較晚回來，把新頁面蓋掉（race condition）。
- 送出表單時遇到逾時，前端不知道伺服器到底有沒有收到。直接重送可能重複建立，不重送又可能遺失。

## 實作重點
- **fetch 封裝**：`services/apiClient.ts` 的 `requestJson()`。它把所有失敗轉成同一個 `ApiError`，畫面只要看 `kind`（`timeout`、`network`、`http`、`validation`、`aborted`、`parse`）：
  - 先用 `res.text()` 再 `JSON.parse`，空回應與非 JSON 回應都不會炸掉。
  - 422 會把 `errors` 轉成 `FieldErrors`，只接受已知欄位與字串訊息。
- **逾時**：`AbortController` 加 `setTimeout`，5 秒沒回應就 abort。呼叫端傳進來的 signal 也串進同一個 controller。abort 之後用 `timedOut` 旗標和 `signal.aborted` 區分是逾時還是使用者取消。`finally` 裡清掉 timer 和 listener。
- **自動重試**：`withRetry()` 只重試 network、timeout、5xx，4xx 不重試（再送一次也一樣錯）。等待時間是 `base × 2^n`，再加上最多 30% 的隨機抖動（`backoffDelay()`），避免大量客戶端同時重試。等待期間也能被 abort。
- **冪等重試**：`composables/useContactForm.ts`。同一份內容的所有重試共用一個 `pendingKey`，內容一改（`watch(values, ...)`）就換新的 key。mock server（`services/mockServer.ts`）在「不穩定」模式下會先寫入資料、再回 504，模擬「其實成功但回應遺失」。重試時伺服器看到同一個 key，回 200 與原本那筆資料。我在瀏覽器實測過：Network 面板依序是 `504 Gateway Timeout`、`200 OK`，沒有第二個 `201`。
- **分頁競態**：`composables/useMessages.ts` 每次載入前 `controller?.abort()` 取消上一個請求；被取消的請求在 `catch` 裡直接 return，不會更新畫面。`await` 回來後還會再檢查一次 `signal.aborted`：abort 可能發生在回應已經抵達之後，這時 promise 仍會 resolve，只靠 catch 擋不住。這個漏洞是寫測試時抓到的（`__tests__/useMessages.test.ts` 的 stale response 測試）。
- **trim 後再驗證長度**：`required`、`minlength` 以原始值計算，前後空白也算字數，但伺服器會先 trim。`utils/validity.ts` 的 `trimmedMessage()` 以 trim 後的長度補驗一次，所以輸入「 王 」會在前端就擋下，不會等到伺服器回 422。這也是寫測試時抓到的。載入中保留上一頁資料並淡化（`.stale`），列表高度不會歸零。
- **表單驗證**：`<form novalidate>` 關掉瀏覽器預設的泡泡，但保留 `required`、`type="email"`、`minlength` 屬性。`utils/validity.ts` 讀 `ValidityState`，轉成統一的中文訊息。blur 時才顯示錯誤；打字時只清除已修正的錯誤，不會邊打邊跳錯。送出時聚焦第一個錯誤欄位。
- **伺服器驗證**：mock server 另外驗證一次（前端驗證可以被繞過）。例如拋棄式信箱只有伺服器擋得到。422 的欄位錯誤對應回各欄位，該欄位被修改後才清除。
- **無障礙**：錯誤欄位加 `aria-invalid`，用 `aria-describedby` 連到錯誤訊息；送出中有 live region 宣告；按鈕送出中停用，防止重複送出。
- **可替換的 fetcher**：mock server 的介面和 `window.fetch` 一樣，回傳真正的 `Response` 物件。`AjaxApp.vue` 把 `createMockServer(settings)` 換成 `window.fetch`，就能接真實後端，其他程式碼不用改。`services/requestLog.ts` 再包一層記錄請求。

## 設計決策與取捨
| 決策 | 替代方案 | 為什麼選這個 |
|------|----------|--------------|
| 原生 `fetch` 自己封裝 | axios | 目標是展示 ajax 能力，自己處理 `res.ok`、逾時、取消更能說明原理；axios 有攔截器與逾時設定，大型專案可以考慮 |
| GET 自動重試、POST 不重試 | 全部自動重試 | GET 是冪等的，重送無副作用；POST 重送可能重複建立 |
| Idempotency-Key | 送出後停用按鈕就好 | 停用只能防連點，防不了「逾時後使用者再按一次」 |
| `AbortController` 取消舊請求 | 用遞增序號忽略過期回應 | abort 能真正中止網路請求、省流量；序號法在不支援 AbortController 時可以當 fallback |
| `novalidate` + Constraint Validation API | 全部自己寫 regex | 沿用瀏覽器的驗證邏輯（email 格式、minlength），只自訂訊息與顯示時機 |
| 載入中保留舊資料 | 顯示空白 + spinner | 版面不跳動，使用者也能繼續看舊資料 |

## 複雜度 / 效能
- 分頁每頁 5 筆，伺服器端 O(n) slice。
- 最壞情況：GET 遇到持續逾時，會嘗試 3 次，每次最多 5 秒，加上兩次退避約 0.5–0.65 秒與 1–1.3 秒，約 16–17 秒才顯示錯誤。
- Network 面板只保留最近 30 筆，避免陣列無限成長。

## 已知限制與可延伸方向
- GET 的重試沒有整體期限，最壞要 16 秒以上才報錯。可以加一個總逾時，或逾時錯誤不重試。
- 同一欄位同時有前端與伺服器錯誤時，只顯示前端錯誤（`errors` computed 的合併順序）。
- `pendingKey` 只存在記憶體，重新整理頁面後就遺失。要更保險可以存到 `sessionStorage`。
- 新增留言後一律跳回第 1 頁，如果使用者正在看第 3 頁會被打斷。
- 分頁按鈕列出所有頁碼，頁數多時應改成「1 … 4 5 6 … 20」。
- mock 資料存在記憶體，重新整理就重置。
- 測試（`__tests__/`，48 個）涵蓋 `requestJson` 的每種錯誤、逾時計時器清理、指數退避與抖動、重試上限、abort 中斷等待、mock server 的冪等與 504 後復原、分頁競態，以及表單驗證、422 對應、冪等 key 重用與取消。

## 延伸問題
**Q: fetch 和 axios 差在哪？**
A: 最大差別是錯誤處理：`fetch` 對 4xx／5xx 不會 reject，axios 會。`fetch` 沒有內建逾時，axios 有 `timeout`。`fetch` 要自己 `JSON.stringify` 和設 `Content-Type`。這些我都在 `requestJson` 裡補上了。取消的話，兩者現在都用 `AbortController`。

**Q: 怎麼處理 race condition？**
A: 每次切頁先 abort 上一個請求，被 abort 的請求在 catch 裡直接 return。Network 面板可以看到被取代的請求顯示 `(canceled)`。不能用 AbortController 的環境，可以每次請求帶遞增序號，回來時只接受最新序號的回應。

**Q: 為什麼 POST 不自動重試？冪等是什麼？**
A: 冪等是「做一次和做很多次結果一樣」。GET、PUT、DELETE 照規範應該冪等，POST 不是：送兩次可能建兩筆。所以 POST 失敗交給使用者決定要不要重試。重試時帶同一個 `Idempotency-Key`，伺服器看到重複的 key 就回傳第一次的結果。Stripe 的 API 就是這樣設計的。

**Q: 為什麼退避要加隨機抖動？**
A: 伺服器掛掉時，所有客戶端幾乎同時失敗。如果都固定等 1 秒、2 秒，它們會同時重試，在伺服器剛恢復時又把它打垮（thundering herd）。加上隨機抖動可以把重試時間錯開。

**Q: 前端驗證過了，為什麼還要伺服器驗證？**
A: 前端驗證只是為了體驗，任何人都可以用 curl 或 DevTools 繞過。而且有些規則只有伺服器知道，例如拋棄式信箱清單、同一個 Email 今天已經送過幾次。

**Q: 表單錯誤什麼時候顯示比較好？**
A: 我選 blur 後才顯示，因為使用者還沒打完就跳紅字很煩。已經顯示的錯誤在打字時即時檢查，改對就消失。送出時一次驗證全部，並把焦點移到第一個錯誤欄位，螢幕閱讀器會讀出 `aria-describedby` 連到的訊息。

**Q: 流量放大 10 倍怎麼辦？**
A: 前端能做的：列表加快取（同一頁短時間內不重抓，或 stale-while-revalidate），搜尋類請求加 debounce，限制併發數量。重試一定要有上限和退避，避免放大流量。伺服器端要做 rate limit，429 時回 `Retry-After`，前端依它決定等待時間。

**Q: 怎麼測？**
A: mock server 是純函式工廠，`random` 可以注入，所以單元測試可以固定「這次要失敗」。測試項目：`requestJson` 在 500 時丟 `http` 錯誤、逾時丟 `timeout`；`withRetry` 對 4xx 不重試、對 5xx 重試兩次；同一個 Idempotency-Key 只建立一筆；分頁快速切換時只套用最後一個回應（用 fake timers）。

## 相關知識點
- HTTP 狀態碼：201、400 與 422 的差別、429、503 與 504。
- HTTP 方法的冪等性與安全性。
- Promise 與 event loop：`await` 之後的程式碼在 microtask 執行。
- CORS 與 preflight：帶 `Content-Type: application/json` 或自訂 header（例如 `Idempotency-Key`）的跨域請求會先送 OPTIONS。
- Constraint Validation API：`validity`、`setCustomValidity`、`checkValidity`，以及 CSS 的 `:user-invalid`。
- `AbortSignal.timeout()`、`AbortSignal.any()`：較新的瀏覽器可以用它們取代手寫的 timer 串接。
