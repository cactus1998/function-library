---
name: git-commit
description: Git Commit 流程（Vue 版）：執行型別檢查與測試預檢，生成繁體中文 Angular 規範的 commit 訊息並提交。使用時機：/git-commit，或使用者說「幫我 commit」「提交變更」。
---

# Git Commit（Vue 版）

## 安全規則

- 預檢失敗就停止，回報錯誤，不要 commit。
- 不使用 `--no-verify`，也不跳過 hooks。
- 不自動 `git push`。只有使用者明確要求時才推送。
- 不把 `.env*`、金鑰、`dist/`、`node_modules/` 加進 commit。發現這類檔案時先警告使用者。

## 步驟

### 1. 檢查狀態

1. 執行 `git status` 與 `git branch --show-current`。
2. 本專案為個人專案，只用單一分支：一律直接 commit 在目前分支，不論分支名稱為何，不詢問、不開新分支，也不在回報中提及分支選擇。

### 2. 預檢

依序執行，任一步失敗就停止：

1. `npm run build`：包含 `vue-tsc -b` 型別檢查與 Vite 打包。
2. `package.json` 有 `test:run` script 時，執行 `npm run test:run`。
3. `package.json` 有 `lint` script 時，執行 `npm run lint`。

只改了文件或 `.claude/` 設定、沒有改 `src/` 時，可以跳過預檢，並在回報中說明。

### 3. 暫存變更

檢查暫存區。沒有已暫存的變更時，列出變更檔案，詢問使用者要暫存全部還是特定檔案。暫存時列出具體檔名，不要盲目 `git add .`。

### 4. 生成 commit 訊息

讀取 `git diff --staged`，撰寫符合 Angular 規範的繁體中文訊息：

- type：`feat`、`fix`、`refactor`、`perf`、`style`、`test`、`docs`、`build`、`chore`
- scope：功能名稱，優先使用 feature slug（例如 `virtual-list`），跨功能時用模組名稱（例如 `router`、`skills`）
- 標題不超過 50 字，不加句號
- 列表使用 `-`
- 內文說明「為什麼」改，不只是「改了什麼」

格式：

```text
<type>(<scope>): <功能說明>

摘要：
<一到兩句說明這次變更的目的>

主要變更內容：
- <變更 1>
- <變更 2>

影響範圍：
- <受影響的頁面、元件或模組>
```

小變更（單一檔案、意圖明顯）只寫標題即可。依系統指示附上 `Co-Authored-By` trailer。

### 5. 提交

用 heredoc 傳入訊息，避免跳脫問題：

```bash
git commit -F - <<'EOF'
<訊息>
EOF
```

提交後執行 `git log --oneline -1` 確認，並回報 commit hash 與標題。
