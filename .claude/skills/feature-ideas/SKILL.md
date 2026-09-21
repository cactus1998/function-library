---
name: feature-ideas
description: 依使用者要應徵的職位與現有功能，推薦下一個值得做的前端功能展示，並說明各自展示的技術點與常見面試考點。使用時機：/feature-ideas [職位或技術方向]，或使用者問「接下來做什麼功能」「還缺什麼能展示的」。
argument-hint: [職位 / 技術方向，例如 "資深前端" "效能" "動畫"]
---

# 功能點子推薦

## 步驟

1. 讀取 `src/features/*/meta.ts`，整理已完成的功能與已涵蓋的 tags。
2. 有參數時，依職位或技術方向篩選；沒有參數時，挑出目前涵蓋最少的技術領域。
3. 推薦 3–5 個功能，每個包含：
   - 名稱與建議 slug
   - 展示的技術點（1–3 個）
   - 對應的常見面試考點
   - 預估難度（basic / intermediate / advanced）
   - 一個能讓 demo 更亮眼的做法（例如「並排比較 naive 版與優化版的 FPS」）
4. 使用者選定後，接著執行 `/new-feature`。

## 參考題庫（依領域）

**效能**
- 虛擬列表（10 萬筆資料、固定高度與動態高度）
- 無限捲動（IntersectionObserver）
- 圖片 lazy load 與漸進式載入
- Web Worker 處理大量運算（例如 CSV 解析、排序），比較主執行緒被卡住的差異
- debounce / throttle 視覺化比較

**非同步與資料**
- 搜尋自動完成（debounce、取消請求、race condition、快取、鍵盤選取）
- 請求重試與指數退避、併發數量限制的 Promise pool
- 樂觀更新與失敗回滾
- 大檔案切片上傳與斷點續傳（模擬後端）

**狀態與架構**
- Undo / Redo（command pattern 或快照）
- 使用 Pinia 的購物車（持久化、跨分頁同步 `BroadcastChannel` / `storage` event）
- 自己實作的迷你 reactive / event bus / 依賴注入
- 權限路由守衛與動態路由

**互動與 UI**
- 拖放排序（原生 Drag and Drop 或 Pointer Events）
- 可存取的 Modal / Combobox / Tabs（focus trap、ARIA pattern）
- 表單產生器與 schema 驗證
- 深色模式與 CSS 變數主題系統
- Toast 通知系統（佇列、自動關閉、`aria-live`）

**瀏覽器 API 與圖形**
- Canvas 畫板（撤銷、匯出圖片）
- 即時聊天（WebSocket 模擬、重連機制）
- Service Worker 離線快取（PWA）
- 國際化（i18n）與日期、數字格式化（`Intl`）

**演算法視覺化**
- 排序演算法動畫
- 樹狀結構元件（遞迴元件、懶載入子節點、全選 / 半選狀態）
- 迷你 diff 演算法或 LRU cache 視覺化
