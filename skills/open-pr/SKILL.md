---
name: open-pr
description: 把當前工作成果從最新 main 開分支、跑專案的品質檢查、整理 commit、push，並依專案的 PR 模板開好 PR，最後回傳 PR 連結交給使用者自行 review/merge。
when_to_use: 使用者說「開 PR」「送 PR」「幫我提 PR」「這樣可以開 PR 了」，或改動完成要進入審查流程時。PR 合併之後的收尾請改用 sync-main。
argument-hint: "[PR 標題或補充說明；--draft 開草稿 PR]"
disable-model-invocation: true
allowed-tools:
  - Bash(git status:*)
  - Bash(git branch:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git fetch:*)
  - Bash(git switch:*)
  - Bash(git add:*)
  - Bash(git commit:*)
  - Bash(git rebase:*)
  - Bash(git merge:*)
  - Bash(git rev-parse:*)
  - Bash(git push:*)
  - Bash(gh pr create:*)
  - Bash(gh pr view:*)
  - Read
  - Glob
---

# Open PR

## 授權範圍

使用者顯式呼叫 `/open-pr` 即為本輪 commit、push、開 PR 的授權，中途不需再確認。此授權**只限本次呼叫**，不延伸到其他輪次（平常仍然不主動 commit）。

`$ARGUMENTS` 若有值，視為使用者對 PR 標題或描述的補充，優先採用其語意。含 `--draft` 時開草稿 PR（見步驟 7）。

## 命名與訊息規範

分支命名、commit type、PR 標題格式一律沿用 `git-rules` skill，不在此重複定義。只記住三件事：

- type 限 `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test`，分支與 scope 用小寫 kebab-case
- **PR 標題與 commit 用同一個格式**：`<type>(<scope>): <subject>`，有 issue 時結尾加 `(#12)`。squash merge 會拿它當 commit message，格式破了 `main` 的歷史就跟著破
- **commit 訊息與 PR body 都不得出現任何 AI 署名**

## 流程

### 1. 蒐集現況

```bash
git branch --show-current
git status --short
git fetch origin main --quiet
git log --oneline -1 origin/main
git log --oneline origin/main..HEAD   # 分支上已完成但還沒開 PR 的 commit
```

最後一條不可省略：`git status` 只看得到工作區的改動，看不出分支是否已有 commit。少了它會把「已 commit、只是還沒 push」的分支誤判為沒東西可做。

**只有在**工作區乾淨**且** `origin/main..HEAD` 為空時，才停下告知使用者沒有東西可以開 PR。

### 2. 決定分支

- **目前在 `main`**：從最新 `origin/main` 開分支，未提交的改動會一起帶過去。
  ```bash
  git switch -c <type>/<kebab-summary> origin/main
  ```
  分支名由改動內容推導（例：`feat/booking-cancel-reason`）。
  例外：若 `main` 上已存在本地未推送的 commit，**停下回報**，不要自行搬移歷史。

- **目前已在 feature 分支**：沿用該分支。

### 3. 跑專案的品質檢查

**這一步不可略過。** 個人專案沒有同事幫你擋，CI 紅了才發現等於白開一次 PR。

先照 `git-rules/references/quality-checks.md` 找出這個專案實際定義的檢查指令 —— 優先讀 `.github/workflows/`，其次是 `composer.json` / `package.json` 的 scripts。**不要憑語言猜指令。**

跑唯讀版（`lint:check`、`--test`、`--dry-run`），不要跑會自動改檔案的那個 —— 現在要知道的是「通不通過」。

- **通過** → 繼續。
- **失敗** → 判斷是不是本次改動造成的：
  - 是 → 修掉再繼續，修正併入本次 commit
  - 不是（既有的失敗）→ **停下回報**，讓使用者決定要不要在這個 PR 一起處理。不要默默擴大範圍
- **昂貴的檢查**（E2E、完整 build）→ 依改動範圍決定跑不跑，略過的在步驟 7 的驗證清單裡不要勾，並在回報中說明。

### 4. 整理 commit

用 `git status --porcelain` 列出實際改動，**逐一列出檔案路徑 add**：

```bash
git add path/to/file-a.php path/to/file-b.php
git commit -m "feat(booking): 支援取消原因"
```

禁止 `git add .`、`git add -A`、`git add <目錄>`。add 之前先確認清單裡沒有不該進版控的檔案（本機設定、暫存腳本、`.env`）；有就排除並在最後報告中說明。

若改動橫跨多個不相關的邏輯變更，拆成多個 commit。

**分支上已有的 commit 也要一起看。** 和 agent 來回做事很容易留下「加了 A、改成 B、又退回 A」這種同一個檔案被反覆決策的歷史 —— 那記錄的是探索過程，不是變更，不該進 `main`。

```bash
git rev-parse --verify --quiet @{upstream}   # 有輸出＝已推送過
```

- **沒有 upstream（本輪新開的分支）** → 該壓成一個或數個有意義的 commit 就壓：
  ```bash
  git rebase -i origin/main
  ```
  非互動環境無法開編輯器時，改用 `git reset --soft origin/main` 後重新 commit，效果相同。
- **已有 upstream（分支之前推過）** → **不整理**，維持原歷史。改寫已推送的歷史會讓 PR 上既有的 review 留言失去行號錨點，而本 skill 禁止 force push。

### 5. 對齊最新 main

commit 完成後，若分支落後 `origin/main`：

```bash
git log --oneline HEAD..origin/main          # 落後哪些 commit
```

- **沒有 upstream** → `git rebase origin/main`
- **已有 upstream** → **不要 rebase**（會被 non-fast-forward 拒絕），改用 `git merge --no-edit origin/main`

兩種情況有衝突都 `--abort` 並停下回報，讓使用者決定，不要自行解衝突。

### 6. Push

```bash
git push -u origin HEAD
```

### 7. 開 PR

先找出這個 repo 的 PR 模板 —— **檔名大小寫各專案不同**，不要只試一種：

```bash
ls .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE.md \
   .github/PULL_REQUEST_TEMPLATE/*.md docs/pull_request_template.md 2>/dev/null
```

- **找到** → 照它的章節結構填，不要自創欄位
- **沒有** → 用 `git-rules/assets/pr-template.md` 的結構（摘要／變更／驗證／補充），並在回報中建議把它加進這個 repo

填寫原則：

- **摘要／描述**：寫這次改了什麼、為什麼，寫給 reviewer 看，不要複製 commit 清單
- **驗證清單**：只勾步驟 3 真的跑過且通過的。略過的項目留空，在補充說明原因
- **補充**：有風險、取捨或後續待辦才寫，否則留空

body 寫到暫存檔再帶入：

```bash
gh pr create --base main --title "<type>(<scope>): 摘要" --body-file <tmpfile>
```

`$ARGUMENTS` 含 `--draft` 時加上 `--draft`。適用時機：想先讓 CI 與自動 reviewer 跑過再定稿。個人專案預設不開草稿 —— 沒有別人會被打擾，多一步 ready for review 只是多一步。

### 8. 回報

輸出 PR 連結，並列出：

- 分支名、commit 清單（有整理過就說明整理成什麼）
- **檢查結果**：跑了哪些指令、通過與否、略過哪些及原因
- 被排除沒 add 的檔案（若有）
- 驗證清單中沒勾的項目與原因

最後提示接下來的 review 途徑，讓使用者挑：

- 等 PR 上的自動 reviewer（Codex／Copilot）留言，之後用 `/verify-review-findings` 逐條核實
- 或在本機直接跑 `/code-review`

merge 完成後呼叫 `/sync-main` 收尾。

## 護欄

- 不 force push，不改寫已推送的歷史
- 不直接 push 到 `main`
- 不自行 merge PR、不加 auto-merge
- 品質檢查失敗不繼續開 PR；既有的失敗先問過使用者
- 任何需要判斷的異常（本地 main 有 commit、rebase 衝突、工作區有不明檔案）都停下回報，不猜測補救
