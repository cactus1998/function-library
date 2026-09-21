# PRD：功能集（Function Library）

| 項目 | 內容 |
| --- | --- |
| 狀態 | Draft |
| 版本 | v0.1 |
| 建立日期 | 2026-09-21 |
| 技術棧 | Vue 3、TypeScript、Vite、Pinia、vue-router |

## 1. 背景與目的

求職時，履歷上的技術關鍵字很難讓面試官判斷實際能力。一般作品集多半是完整應用，技術重點被業務邏輯淹沒，面試官沒有時間細看。

本專案是一個「功能集」：把常見的前端技術難題拆成獨立、可互動的小型展示（feature demo）。每個展示聚焦 1–3 個技術點，搭配設計說明與測試，讓面試官能在幾分鐘內看到實作品質，也讓求職者在面試中有具體的東西可以講解。

## 2. 目標

1. 用可操作的 demo 證明前端核心能力：效能、非同步、狀態管理、互動、無障礙、瀏覽器 API。
2. 每個功能都能在 3 分鐘內講清楚：解決什麼問題、怎麼做、有什麼取捨。
3. 程式碼品質達到可以直接給面試官閱讀的程度：型別完整、邊界處理、資源清理、測試覆蓋。
4. 新增功能的成本低：統一的目錄結構與自動註冊，新增一個 demo 不需要修改共用程式碼。

### 非目標

- 不做完整的商業應用或後端服務；需要後端時一律以前端模擬（mock）。
- 不追求功能數量；寧可少而精。
- 不以 UI 元件庫形式發佈到 npm。

## 3. 目標使用者

| 使用者 | 需求 |
| --- | --- |
| 面試官 / 技術主管 | 快速瀏覽功能、實際操作 demo、閱讀原始碼，判斷技術深度 |
| HR / 非技術招募者 | 看得懂每個功能在做什麼，有清楚的標題與一句話說明 |
| 求職者本人 | 面試前複習講稿，面試中直接開 demo 講解 |

## 4. 使用情境

1. **履歷連結**：面試官從履歷點開網站，在首頁看到功能卡片，用標籤篩選感興趣的領域，點進去操作。
2. **線上面試螢幕分享**：求職者開啟某個 demo，邊操作邊說明設計決策，再切到原始碼。
3. **技術追問**：面試官問「資料量變成 100 萬筆會怎樣」，求職者在 demo 中調整參數，現場展示效能差異。

## 5. 功能需求

### 5.1 平台（外殼）功能

| 編號 | 需求 | 優先級 |
| --- | --- | --- |
| P-01 | 首頁以卡片列出所有功能，顯示標題、摘要、標籤、難度 | P0 |
| P-02 | 依標籤篩選功能，可多選；篩選狀態同步到 URL query，可分享連結 | P0 |
| P-03 | 每個功能有獨立路由 `/features/<slug>`，採 lazy load | P0 |
| P-04 | 功能頁顯示標題、說明、技術重點（highlights）與可互動 demo | P0 |
| P-05 | 功能頁提供原始碼連結（GitHub）與面試講稿（NOTES.md）入口 | P1 |
| P-06 | 關鍵字搜尋功能標題與摘要 | P1 |
| P-07 | 深色模式，跟隨系統並可手動切換 | P1 |
| P-08 | 中英文切換（i18n） | P2 |

### 5.2 功能展示清單

各功能的細部規格在實作前以 `/feature-spec` 產生 `src/features/<slug>/SPEC.md`。以下為第一階段規劃。

#### 第一階段（MVP，P0）

| slug | 功能 | 展示的技術點 | 常見面試考點 | 難度 |
| --- | --- | --- | --- | --- |
| `virtual-list` | 虛擬列表 | 只渲染可視範圍、固定與動態高度、捲動效能 | 大量資料渲染、reflow / repaint | advanced |
| `debounced-search` | 搜尋自動完成 | debounce、`AbortController` 取消請求、race condition、結果快取、鍵盤選取 | 非同步競態、防抖與節流 | intermediate |
| `undo-redo` | Undo / Redo 編輯器 | command pattern 與快照兩種做法比較、歷史上限 | 設計模式、不可變資料 | intermediate |
| `drag-sort` | 拖放排序 | Pointer Events、觸控支援、鍵盤排序、動畫 | 事件模型、無障礙 | intermediate |
| `accessible-modal` | 可存取的 Modal | focus trap、`Esc` 關閉、焦點還原、ARIA 屬性 | a11y、Teleport | basic |

#### 第二階段（P1）

| slug | 功能 | 展示的技術點 |
| --- | --- | --- |
| `infinite-scroll` | 無限捲動 | IntersectionObserver、分頁載入、錯誤重試 |
| `promise-pool` | 併發控制 | Promise pool、指數退避重試、進度視覺化 |
| `web-worker-sort` | Web Worker 運算 | 主執行緒與 Worker 並排比較 FPS |
| `cart-sync` | 跨分頁購物車 | Pinia 持久化、`BroadcastChannel` 同步 |
| `toast-system` | Toast 通知系統 | 佇列、自動關閉、`aria-live` |
| `form-builder` | 表單產生器 | schema 驅動、驗證、動態欄位 |

#### 第三階段（P2）

| slug | 功能 | 展示的技術點 |
| --- | --- | --- |
| `chunk-upload` | 大檔案切片上傳 | 切片、雜湊、斷點續傳（模擬後端） |
| `canvas-board` | Canvas 畫板 | 繪圖、撤銷、匯出圖片 |
| `tree-view` | 樹狀元件 | 遞迴元件、懶載入、全選與半選狀態 |
| `mini-reactive` | 迷你響應式系統 | 自己實作 `reactive` / `effect`，對照 Vue 原理 |
| `sort-visualizer` | 排序演算法動畫 | 演算法步驟產生器、動畫控制 |

### 5.3 單一功能的交付內容

每個功能完成時必須包含：

1. `meta.ts`：標題、摘要、標籤、技術重點、難度、建立日期。
2. `index.vue`：可互動的 demo，含可調整的參數（例如資料筆數），讓面試官能自己試。
3. `composables/`：核心邏輯與 UI 分離。
4. `SPEC.md`：規格與 Given-When-Then 驗收標準（`/feature-spec`）。
5. 測試：composable 單元測試與元件測試（`/add-tests`）。
6. `NOTES.md`：面試講稿，含設計取捨、複雜度、可能被追問的問題（`/interview-notes`）。

## 6. 非功能需求

| 類別 | 要求 |
| --- | --- |
| 型別 | 不使用 `any`；`npm run build`（含 `vue-tsc`）必須通過 |
| 效能 | 首頁 Lighthouse Performance ≥ 90；每個功能獨立 chunk |
| 無障礙 | 所有互動可用鍵盤操作；Lighthouse Accessibility ≥ 95 |
| RWD | 360px 寬度下可正常操作 |
| 資源清理 | 卸載時移除 listener、清除 timer、中止請求 |
| 相依套件 | 優先使用原生 API 與自行實作；新增第三方套件需說明理由 |
| 瀏覽器支援 | 最新兩版 Chrome、Edge、Firefox、Safari |

## 7. 技術架構

```
src/
  features/
    types.ts         # FeatureMeta 型別
    registry.ts      # 以 import.meta.glob 自動蒐集 meta 與路由
    <slug>/
      meta.ts
      index.vue
      components/
      composables/
      SPEC.md
      NOTES.md
  router/index.ts    # 展開 featureRoutes
  views/HomeView.vue # 功能卡片列表與篩選
```

- 新增功能只需建立 `src/features/<slug>/`，registry 自動註冊路由與首頁卡片。
- 開發流程：`/feature-spec` 寫規格，`/new-feature` 實作，`/add-tests` 補測試，`/showcase-review` 檢查，`/interview-notes` 產生講稿，`/git-commit` 提交。

## 8. 成功指標

| 指標 | 目標 |
| --- | --- |
| 第一階段功能完成數 | 5 個，每個都有測試與講稿 |
| 測試 | 每個功能的 composable 核心邏輯皆有單元測試 |
| 講解時間 | 每個功能能在 3 分鐘內講完重點 |
| 面試回饋 | 面試中被實際開啟或討論的次數 |

## 9. 里程碑

| 階段 | 內容 |
| --- | --- |
| M0 | 平台基礎架構：registry、路由、首頁卡片與標籤篩選（P-01 至 P-04） |
| M1 | 第一階段 5 個功能 |
| M2 | 部署（GitHub Pages 或 Vercel）、README 與履歷連結、平台 P1 需求 |
| M3 | 第二階段功能 |
| M4 | 第三階段功能與 i18n |

## 10. 風險與待決事項

| 項目 | 說明 | 對策 |
| --- | --- | --- |
| 範圍膨脹 | 功能越做越多，品質下降 | 每階段完成交付清單才開下一階段 |
| demo 太簡單 | 面試官看不出深度 | 每個 demo 提供 naive 版與優化版比較，或可調參數壓力測試 |
| 後端依賴 | 部分功能需要 API | 統一用 mock service 模擬延遲與錯誤 |
| 待決 | 部署平台、是否加入 E2E 測試（Playwright） | M2 前決定 |
