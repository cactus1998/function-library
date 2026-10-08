---
name: new-feature
description: 在 function library 專案新增一個功能展示（feature demo）：建立 src/features/<slug>/ 資料夾、元件、meta、路由與首頁卡片。使用時機：使用者說「新增功能」「做一個 XX demo」「加一個 XX 元件展示」或 /new-feature <名稱>。
argument-hint: <功能名稱或描述>
---

# 新增功能展示

本專案是前端技術展示庫（Vue 3 + TypeScript + Vite + Pinia + vue-router）。每個功能都是獨立、可單獨展示的 demo，並且要能讓人一眼看出技術重點。

## 目錄慣例

```
src/features/
  registry.ts            # 自動蒐集所有 feature 的 meta 與路由
  <slug>/
    meta.ts              # FeatureMeta（標題、摘要、標籤、技術重點）
    index.vue            # demo 進入點（路由載入這個元件）
    components/          # 只給此 feature 用的子元件（可選）
    composables/         # use* 邏輯，與 UI 分離，方便測試（可選）
    NOTES.md             # 設計筆記
```

- `slug` 使用 kebab-case，例如 `virtual-list`、`debounced-search`。
- 路由路徑固定為 `/features/<slug>`。
- 功能 PRD 放 `docs/PRD-<slug>.md`（由 `/feature-spec` 產生），不放在 `src/features/<slug>/`。

## 步驟

1. **確認基礎架構存在。** 若 `src/features/registry.ts` 不存在，先建立它（見下方「基礎架構」），並接上 router 與首頁。這一步只在第一次做。
2. **釐清需求。** 先讀 `docs/PRD-<slug>.md`，存在時以其 Must 範圍為準，不額外擴充。沒有 PRD 時，從參數判斷功能與想展示的技術點。範圍太模糊時，提出 2–3 種實作方向（各自展示的技術重點不同），請使用者選一個。
3. **檢查重複。** 讀 `src/features/*/meta.ts`，若已有相近功能，告知使用者並詢問要擴充舊的還是新建。
4. **建立檔案。**
   - `meta.ts`：填好 `FeatureMeta`。
   - `index.vue`：`<script setup lang="ts">`，頁首放標題與一句話說明，下方放可互動的 demo。
   - 可重用的邏輯抽成 `composables/useXxx.ts`，並明確標注型別。
5. **品質要求（展示用，比一般專案嚴格）：**
   - 不使用 `any`；props / emits 用型別宣告（`defineProps<...>()`、`defineEmits<...>()`）。
   - 處理邊界狀態：空資料、載入中、錯誤、極端輸入。
   - 基本無障礙：語意化標籤、可用鍵盤操作、互動元素有 label / `aria-*`。
   - 在副作用中清理資源（`onUnmounted` 移除 listener、清掉 timer、呼叫 `AbortController.abort()`）。
   - 優先使用原生 API 與自己的實作；只有在展示整合能力時才加入第三方套件，且要先問使用者。
   - 樣式使用 scoped CSS，並支援窄螢幕。
6. **驗證。** 執行 `npm run build`（內含 `vue-tsc -b` 型別檢查）。有錯誤就修到通過。
7. **回報。** 列出新增的檔案、路由路徑，以及 2–3 個技術亮點。提醒使用者可以接著跑 `/add-tests <slug>`。

## 基礎架構（首次才建立）

`src/features/types.ts`：

```ts
export type Difficulty = 'basic' | 'intermediate' | 'advanced'

export interface FeatureMeta {
  slug: string
  title: string
  summary: string
  tags: string[]          // 例如 ['performance', 'composable', 'a11y']
  highlights: string[]    // 要強調的技術點
  difficulty: Difficulty
  createdAt: string       // YYYY-MM-DD
}
```

`src/features/registry.ts`：

```ts
import type { RouteRecordRaw } from 'vue-router'
import type { FeatureMeta } from './types'

const metaModules = import.meta.glob<{ default: FeatureMeta }>('./*/meta.ts', { eager: true })
const viewModules = import.meta.glob('./*/index.vue')

export const features: FeatureMeta[] = Object.values(metaModules)
  .map((m) => m.default)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const featureRoutes: RouteRecordRaw[] = features.map((meta) => {
  const loader = viewModules[`./${meta.slug}/index.vue`]
  if (!loader) throw new Error(`Feature "${meta.slug}" is missing index.vue`)
  return {
    path: `/features/${meta.slug}`,
    name: `feature-${meta.slug}`,
    component: loader,
    meta: { title: meta.title },
  }
})
```

接著：
- 在 `src/router/index.ts` 的 `routes` 展開 `...featureRoutes`。
- 把 `HomeView.vue` 改成功能卡片列表（讀取 `features`，顯示標題、摘要、tags，並可用 tag 篩選），取代 template 預設的 `HelloWorld`。
