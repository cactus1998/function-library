# Function Library

面試用的前端技術展示庫。把常見的前端難題拆成獨立、可互動的小型展示（feature demo），每個展示聚焦少數幾個技術點，搭配設計說明與測試，讓人在幾分鐘內看到實作品質。

技術棧：Vue 3（`<script setup>`）、TypeScript、Vite、Pinia、vue-router、Vitest。

## 功能展示

| 功能 | 路由 | 難度 | 重點 |
| --- | --- | --- | --- |
| 虛擬列表 | `/features/virtual-list` | 進階 | 10 萬筆資料只渲染可視範圍；動態高度以前綴和 + 二分搜尋定位，ResizeObserver 補償高度變化 |
| 指令面板 | `/features/command-palette` | 進階 | Ctrl+K 模糊搜尋、拼音首字母比對、非同步結果取消過期請求、WAI-ARIA combobox、IME 處理 |
| 拖放看板 | `/features/kanban-board` | 進階 | 自寫 Pointer Events 拖放與自動捲動、command pattern Undo / Redo、純鍵盤拖放 |
| 跨分頁購物車 | `/features/cart-sync` | 進階 | BroadcastChannel 同步、LWW + Lamport clock 收斂衝突、Web Locks 選 leader、自寫 Pinia plugin |
| 預約時段選擇器 | `/features/booking-slots` | 中等 | 不用日期套件處理時區與 DST、純函式時段計算、WAI-ARIA grid 日曆、409 衝突處理 |
| 聚餐分帳 | `/features/split-bill` | 中等 | 整數金額與最大餘數法分配、貪婪結算、自寫遞迴下降算式解析器（不用 `eval`） |
| 大頭貼上傳裁切 | `/features/avatar-cropper` | 中等 | 純函式縮放與邊界 clamp、雙指縮放、Canvas 壓縮到 200 KB 內、可取消與重試的上傳 |
| 前端面試題庫 | `/features/interview-quiz` | 基礎 | 可注入亂數的 Fisher–Yates 洗牌、推導式狀態機、帶版本號的 localStorage 持久化 |

每個功能的完整技術重點寫在各自的 `meta.ts` 的 `highlights`，也會顯示在展示頁上；需求與驗收標準見 [`docs/`](./docs/README.md)。

## 快速開始

需要 Node.js 20 以上。

```bash
npm install
npm run dev        # 開發伺服器
npm run build      # 型別檢查（vue-tsc）並建置到 dist/
npm run preview    # 預覽建置結果
npm test           # Vitest watch 模式
npm run test:run   # 執行一次全部測試
```

## 專案結構

```
src/
├── features/
│   ├── registry.ts        # 自動收集所有功能的 meta 與路由
│   ├── types.ts           # FeatureMeta 型別
│   └── <slug>/
│       ├── index.vue      # 展示頁入口
│       ├── meta.ts        # 標題、摘要、標籤、技術重點、難度
│       ├── components/
│       ├── composables/
│       ├── utils/         # 純函式（主要測試對象）
│       ├── types.ts
│       └── __tests__/
├── components/            # 共用元件（FeatureHeader、DifficultyMeter）
├── views/HomeView.vue     # 首頁功能卡片
└── router/                # 路由與頁面標題
docs/                      # 專案與各功能的 PRD
```

## 新增功能

功能透過 `import.meta.glob` 自動註冊，不需要修改共用程式碼：

1. 建立 `src/features/<slug>/`，放入 `index.vue` 與 `meta.ts`。
2. `meta.ts` 預設匯出 `FeatureMeta` 物件，`slug` 必須與資料夾名稱相同。
3. 完成後首頁會出現卡片，路由為 `/features/<slug>`，依 `createdAt` 由新到舊排序。

缺少 `index.vue` 時，`registry.ts` 會在啟動時直接拋錯。

## 開發方式：規格驅動的 AI 協作

本專案以 AI 輔助開發（Claude Code）。我的重心在**規劃與把關**：決定做哪些題目、每個題目要證明什麼，寫成規格與 skill，再由 AI 依規格實作、由測試驗證。

### 1. 規格先行

- 每個功能開工前先寫 PRD（[docs/](docs/README.md)）：目標、MoSCoW 範圍、使用情境、狀態流程、邊界情況（EC）、Given-When-Then 驗收標準（AC）。以虛擬列表為例，PRD 先列出空資料、跳到未量測的遠處索引、上方列高度改變時畫面不跳動等邊界情況，再據此寫測試。
- 每個功能的 `NOTES.md` 記錄方案比較與選擇理由，例如為什麼自己封裝 `fetch` 而不用 axios。
- 架構預先規劃成可擴充：新增功能只要建立資料夾與 `meta.ts`，`registry.ts` 自動註冊路由與首頁卡片，不必改共用程式碼。

### 2. 流程寫成 skill

`.claude/skills/` 把規劃、實作、測試、提交的流程固定下來（見下方「開發流程」）。這套 skill 之後沿用到其他專案，並依各專案的領域擴充，例如後端端點、圖表、遊戲引擎規範。

### 3. 驗收與修正

- 部署後實測發現正式站深層網址重新整理會回到首頁、長行程式碼會撐開整頁寬度，回報後修正（`b7aaab2`、`3bb70ec`）。

### 4. AI 負責的部分

- 依 PRD 與 skill 產生實作程式碼與測試。
- 所有變更都要通過型別檢查與測試才提交。

## 開發流程

專案在 `.claude/skills/` 內附有 Claude Code 技能，對應一個功能從規劃到面試準備的流程：

| 指令 | 用途 |
| --- | --- |
| `/feature-ideas` | 依目標職位推薦下一個要做的功能 |
| `/feature-spec <功能>` | 撰寫 `docs/PRD-<slug>.md`，含 Given-When-Then 驗收標準 |
| `/new-feature <名稱>` | 建立功能資料夾、元件、meta 與路由 |
| `/add-tests <slug>` | 補上單元與元件測試 |
| `/showcase-review <slug>` | 檢查型別、邊界狀態、無障礙、記憶體洩漏與 RWD |
| `/interview-notes <slug>` | 產生面試講稿 `NOTES.md` |
| `/git-commit` | 型別檢查與測試通過後，以繁體中文 Angular 規範提交 |

## 設計原則

- **邏輯與畫面分離**：演算法與狀態轉換寫成純函式放在 `utils/`，元件只負責綁定，方便測試與講解。
- **不過度依賴套件**：時區、拖放、裁切、算式解析都自行實作，展示對底層 API 的理解。
- **無障礙是預設**：鍵盤操作、ARIA 角色、live region 宣告、焦點管理。
- **資源確實清理**：事件監聽、object URL、請求（`AbortController`）在 unmount 或替換時釋放。
- **需要後端時以前端模擬**：不架設服務，但保留延遲、失敗與衝突情境。
