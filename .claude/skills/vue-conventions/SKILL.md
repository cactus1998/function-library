---
name: vue-conventions
description: 本專案 Vue 3 + TypeScript 的撰寫規範：元件與 composable 結構、Pinia 狀態管理、效能、互動與拖拽、資料持久化、國際化。撰寫或修改 src/ 下任何 .vue / .ts 檔案時套用。
---

# Vue 撰寫規範

## 元件與 composable

- 一律使用 `<script setup lang="ts">`。
- Props 與 emits 用型別宣告：`defineProps<Props>()`、`defineEmits<{ change: [value: string] }>()`。預設值用 props 解構的預設值語法。
- 雙向綁定用 `defineModel()`。
- 元件只負責畫面；邏輯放在 `useXxx` composable，回傳 `ref` / `computed`，不回傳 `reactive` 物件被解構後會失去響應性的值。
- composable 內建立的副作用（listener、timer、observer）在同一個 composable 內用 `onScopeDispose` 或 `onUnmounted` 清理。
- 模板 ref 使用 `useTemplateRef()`。
- 不使用 `any`。外部資料（API 回應、`localStorage`、`JSON.parse`）先驗證或收窄型別再使用。

## 狀態管理（Pinia）

- 只有跨元件或跨頁面共用的狀態才放 store；單一 feature 內部狀態用 composable。
- 使用 setup store 寫法（`defineStore('id', () => { ... })`）。
- 從 store 取值要保持響應性時使用 `storeToRefs`。
- 靜態資料（選項清單、設定）啟動時載入一次並快取，不要在 `computed` 或 render 中重複 `fetch` / `JSON.parse`。

## 效能

- 大量列表：固定 `:key`（不用 index）；超過約 1000 筆考慮虛擬化。
- 高頻事件（`scroll`、`resize`、`pointermove`、`input`）使用 debounce、throttle 或 `requestAnimationFrame`。
- 大型且不需深層響應的資料使用 `shallowRef` / `markRaw`。
- 頻繁建立又銷毀的元素（通知、粒子、列表項目）考慮重用，而不是每次都重建。
- 重頁面與重元件用 `defineAsyncComponent` 或路由 lazy load。
- CPU 密集運算移到 Web Worker。
- 宣稱「更快」時要有量測：`performance.now()`、DevTools Performance 面板，或在頁面上顯示數據。

## 互動與拖拽

- 可點擊元素使用 `<button>`，連結使用 `<a>` / `RouterLink`。
- 拖拽優先使用 Pointer Events（`pointerdown` / `pointermove` / `pointerup` + `setPointerCapture`），同時支援滑鼠與觸控；並提供鍵盤替代操作。
- 拖曳中只更新 `transform`，避免觸發 layout。
- Modal、Dropdown 要處理 focus trap、`Esc` 關閉，關閉後焦點回到觸發元素。
- 動畫尊重 `prefers-reduced-motion`。

## 資料持久化

- 存入 `localStorage` 的資料包含版本號（例如 `{ version: 1, data }`）；讀取時版本不符就遷移或捨棄，不要讓舊資料弄壞畫面。
- 讀取時用 `try/catch` 包住 `JSON.parse`，失敗時回到預設值。
- 寫入頻繁時做 debounce；在 `pagehide` / `visibilitychange` 時補存最後一次狀態。
- 跨分頁同步使用 `storage` event 或 `BroadcastChannel`。

## 國際化

- 需要多語系的 demo，文案抽成 key-value，不寫死在模板中。
- 動態變數用插值（`t('key', { count })`），不要字串拼接。
- 日期、數字、貨幣、相對時間使用 `Intl` API。

## 樣式

- 使用 scoped CSS 與 CSS 變數；主題色集中定義在 `:root`。
- 以 mobile-first 撰寫，最小支援寬度約 400px。
