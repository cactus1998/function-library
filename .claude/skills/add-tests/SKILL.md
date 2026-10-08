---
name: add-tests
description: 為某個功能展示加上單元與元件測試（Vitest + @vue/test-utils），第一次使用時會先安裝並設定測試環境。使用時機：/add-tests <slug>，或使用者說「幫這個功能寫測試」「補測試」。
argument-hint: <feature slug>
---

# 加測試

有測試的功能才能放心修改與展示。測試要驗證行為，不是驗證實作細節。

## 首次設定（`package.json` 沒有 vitest 時）

1. 先告知使用者即將安裝的套件，再安裝：
   ```
   npm i -D vitest @vue/test-utils jsdom
   ```
2. 在 `vite.config.ts` 加入測試設定（在檔案頂端加上 `/// <reference types="vitest/config" />`）：
   ```ts
   test: {
     environment: 'jsdom',
     include: ['src/**/*.test.ts'],
   },
   ```
3. 在 `package.json` scripts 加入 `"test": "vitest"` 與 `"test:run": "vitest run"`。
4. 確認 `tsconfig.app.json` 的型別檢查不會因測試檔失敗；必要時在 `types` 加上 `vitest/globals`，或在測試檔明確 import `describe/it/expect`（建議明確 import）。

## 撰寫測試

檔案位置：`src/features/<slug>/__tests__/*.test.ts`。

有 `docs/PRD-<slug>.md` 時，每條 AC 與 EC 至少對應一個測試。

優先順序：
1. **Composables / 純函式**：最容易測，也最能展示邏輯正確性。涵蓋正常情況、邊界值（空陣列、0、極大值）與錯誤輸入。
2. **元件行為**：用 `mount` 模擬使用者操作（`trigger('click')`、`setValue`），斷言畫面結果與 emit 事件。
3. **非同步與時間**：用 `vi.useFakeTimers()` 測 debounce / throttle，用 `vi.fn()` / `vi.spyOn` mock `fetch`，並測試 race condition（例如較舊的請求比較晚回來）。
4. **清理**：unmount 後確認 listener / timer 已移除。

原則：
- 測試名稱用行為描述，例如 `it('only calls search once after typing stops for 300ms')`。
- 不測 Vue 本身的功能，不做大量 snapshot。
- 每個測試獨立，不共用可變狀態。

## 驗證

執行 `npx vitest run src/features/<slug>`，全部通過後再執行 `npm run build` 確認型別無誤。回報測試數量與涵蓋的情境。若發現產品程式碼有 bug，先回報並詢問是否修正，不要為了讓測試通過而改掉斷言。
