---
name: showcase-review
description: 面試展示前的品質檢查：型別、邊界狀態、效能、無障礙、記憶體洩漏、RWD、程式碼可讀性，找出面試官可能挑出的問題。使用時機：/showcase-review <slug 或 all>，或使用者說「幫我檢查這個功能能不能拿去面試」「review 這個 demo」。
argument-hint: <feature slug | all>
---

# 展示前檢查

用嚴格面試官的角度審查功能。目標是在面試前找出會被挑出的問題，不是給稱讚。

## 步驟

1. 範圍：指定 slug 時只檢查 `src/features/<slug>/`；`all` 時檢查全部 features 與共用程式碼（router、registry、HomeView）。
2. 執行 `npm run build`，記錄型別錯誤。
3. 依下方清單逐項閱讀程式碼。每個問題都要有具體檔案與行號，並說明面試官會怎麼問。
4. 需要實際互動驗證時（例如鍵盤操作、RWD），啟動 `npm run dev`，在瀏覽器中確認。
5. 輸出報告，依嚴重度排序：
   - **必修**：bug、型別錯誤、記憶體洩漏、race condition、明顯的無障礙缺陷。
   - **建議**：可讀性、命名、可抽出的 composable、缺少的邊界狀態。
   - **加分**：能讓 demo 更亮眼的小改動（例如加上效能數據顯示、切換 naive 與優化版本的比較開關）。
6. 詢問使用者要修哪些項目，確認後再改。

## 檢查清單

**TypeScript**
- 沒有 `any`、不必要的 `as` 斷言、`!` non-null 斷言。
- props / emits / composable 回傳值有明確型別。

**正確性**
- 空資料、載入中、錯誤狀態都有處理。
- 非同步請求有處理競態（AbortController 或請求序號）。
- `watch` / `computed` 依賴正確，沒有無限迴圈。

**資源清理**
- `addEventListener`、`setInterval`、`IntersectionObserver`、`ResizeObserver`、WebSocket、Worker 都在 `onUnmounted` 清理。

**效能**
- 大量列表有 `key`，並考慮虛擬化。
- 高頻事件（scroll、resize、input）有 debounce / throttle 或使用 `requestAnimationFrame`。
- 避免在 template 中做昂貴運算；大物件考慮 `shallowRef`。

**無障礙**
- 互動元素使用 `<button>` / `<a>`，不是可點的 `<div>`。
- 可用鍵盤完成操作，focus 狀態看得到。
- 表單有 label，動態訊息有 `aria-live`。

**可讀性**
- 元件職責單一，邏輯抽到 composables。
- 命名表達意圖；註解說明「為什麼」，而不是「做什麼」。

**展示效果**
- 頁面上看得出這個功能在展示什麼技術（標題、說明、可操作的控制項）。
- 窄螢幕（約 400px）不會破版。
