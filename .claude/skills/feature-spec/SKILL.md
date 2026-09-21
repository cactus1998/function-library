---
name: feature-spec
description: 在實作功能展示前先寫精簡規格：目標、範圍、狀態流程、邊界情況與 Given-When-Then 驗收標準，存成 docs/PRD-<slug>.md，供 /new-feature 與 /add-tests 使用。使用時機：/feature-spec <功能>，或使用者說「先規劃這個功能」「寫個規格」「需求拆解」。
argument-hint: <功能名稱或描述>
---

# 功能規格

規格要短：一頁內寫完，重點是讓實作與測試有明確依據。面試時也能拿來說明「我怎麼拆需求」。

## 存放位置（必守）

- PRD 一律寫在 `docs/PRD-<slug>.md`，並在 `docs/README.md` 的文件清單加一列。
- 不要寫在 `src/features/<slug>/`，也不要產生 `SPEC.md`；`src/` 只放程式碼、測試與 `NOTES.md`。
- 若發現舊的 `src/features/<slug>/SPEC.md`，用 `git mv` 搬到 `docs/PRD-<slug>.md` 再繼續。

## 原則

- **明確**：不寫「適當的延遲」「流暢的動畫」，要寫具體數值（例如 debounce 300ms、列表 10 萬筆時捲動維持 60fps）。
- **涵蓋邊界**：除了正常流程，一定要列出錯誤、空資料、極端輸入、快速重複操作、網路中斷。
- **可驗收**：每個需求對應至少一條驗收標準，驗收標準要能直接寫成測試。
- **先澄清**：需求只有一句話時，先列出 3–5 個關鍵決策與建議選項（例如「搜尋要打 API 還是本地過濾？」），跟使用者確認後再寫。

## 步驟

1. 確認需求，必要時提出關鍵決策問題。
2. 決定 slug（kebab-case），寫入 `docs/PRD-<slug>.md`（使用下方模板），並在 `docs/README.md` 文件清單加一列（狀態 Draft）。
3. 有狀態轉換（載入、錯誤、重試等）時，附 Mermaid 狀態圖。
4. 回報規格摘要，建議接著執行 `/new-feature <slug>`。

## 模板

```markdown
# PRD：<功能名稱>（<slug>）

## 目標
<這個 demo 要展示什麼技術、解決什麼問題（2–3 句）>

## 範圍
- **Must**：<沒有就不能展示的功能>
- **Should**：<時間允許就做>
- **Won't**：<明確不做，避免範圍膨脹>

## 使用情境
- 身為 <使用者>，我想要 <操作>，以便 <目的>。

## 狀態與流程
\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : 使用者輸入
    Loading --> Success : 回應成功
    Loading --> Error : 回應失敗
    Error --> Loading : 重試
\`\`\`

## 資料與介面
- Props / Emits：<型別>
- Composable 介面：<例如 `useSearch(query: Ref<string>) => { results, loading, error }`>

## 邊界情況
| 編號 | 情境 | 預期行為 |
|------|------|----------|
| EC-01 | 快速連續輸入 | 只送出最後一次請求，舊回應被丟棄 |

## 非功能需求
- 效能：<數值目標>
- 無障礙：<鍵盤操作、ARIA>
- RWD：<最小寬度 400px>

## 驗收標準
- [ ] AC-01：Given <前置條件>，When <操作>，Then <預期結果>
- [ ] AC-02：邊界情況 EC-01 通過
```

## 與其他 skill 的關係

- `/new-feature`：實作時以 `docs/PRD-<slug>.md` 的 Must 範圍為準，不額外擴充。
- `/add-tests`：每條 AC 與 EC 至少對應一個測試。
- `/showcase-review`：檢查時對照 `docs/PRD-<slug>.md`，列出未完成的 AC。
