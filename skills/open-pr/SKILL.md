---
name: open-pr
description: 把當前工作成果從最新 main 開分支、commit、push，並依 .github/PULL_REQUEST_TEMPLATE.md 開好 PR，最後回傳 PR 連結交給使用者自行 review/merge。
when_to_use: 使用者說「開 PR」「送 PR」「幫我提 PR」「這樣可以開 PR 了」，或改動完成要進入審查流程時。合併之後要同步到 deploy 請改用 sync-deploy。
argument-hint: "[PR 標題或補充說明]"
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
  - Bash(git push:*)
  - Bash(gh pr create:*)
  - Bash(gh pr view:*)
  - Read
---

# Open PR

## 授權範圍

使用者顯式呼叫 `/open-pr` 即為本輪 commit、push、開 PR 的授權，中途不需再確認。此授權**只限本次呼叫**，不延伸到其他輪次（平常仍然不主動 commit）。

`$ARGUMENTS` 若有值，視為使用者對 PR 標題或描述的補充，優先採用其語意。

## 命名與訊息規範

分支命名、commit type、PR 標題格式一律沿用 `git-rules` skill，不在此重複定義。只記住三件事：

- type 限 `build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test|infra`，分支與 scope 用小寫 kebab-case
- **PR 標題是 `[<type>] 摘要`（有票號則 `[<type> TICKET-ID] 摘要`）**，type 與 commit 同一份清單；括號只是標示這是 PR 標題。semantic-release 讀 commit 不讀 PR 標題
- **commit 訊息與 PR body 都不得出現任何 AI 署名**（不加 `Co-Authored-By`、不加 `Generated with` 之類的結尾）

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

- **目前在 `main` 或 `deploy`**：從最新 `origin/main` 開分支，未提交的改動會一起帶過去。
  ```bash
  git switch -c <type>/<kebab-summary> origin/main
  ```
  分支名由改動內容推導（例：`feat/booking-cancel-reason`）。
  例外：若 `main`/`deploy` 上已存在本地未推送的 commit，**停下回報**，不要自行搬移歷史。

- **目前已在 feature 分支**：沿用該分支。

### 3. Commit

用 `git status --porcelain` 列出實際改動，**逐一列出檔案路徑 add**：

```bash
git add path/to/file-a.php path/to/file-b.php
git commit -m "feat(booking): 支援取消原因"
```

禁止 `git add .`、`git add -A`、`git add <目錄>`。add 之前先確認清單裡沒有不該進版控的檔案（本機設定、暫存腳本、`.env`）；有就排除並在最後報告中說明。

若改動橫跨多個不相關的邏輯變更，拆成多個 commit。

### 4. 對齊最新 main

commit 完成後，若分支落後 `origin/main`，**先確認分支有沒有推送過**：

```bash
git log --oneline HEAD..origin/main          # 落後哪些 commit
git rev-parse --verify --quiet @{upstream}   # 有輸出＝已推送過
```

- **沒有 upstream（本輪新開的分支）**：可以 rebase。
  ```bash
  git rebase origin/main
  ```

- **已有 upstream（分支之前推過）**：**不要 rebase** —— 那會改寫已推送的歷史，接著的 `git push` 會被拒絕（non-fast-forward），而本 skill 禁止 force push。改用 merge：
  ```bash
  git merge --no-edit origin/main
  ```

兩種情況有衝突都 `--abort` 並停下回報，讓使用者決定，不要自行解衝突。

### 5. Push

```bash
git push -u origin HEAD
```

### 6. 開 PR

標題用 `[<type>] 摘要`（多 commit 時概括成一句），type 取自上面「命名與訊息規範」那份清單。body 依 `.github/PULL_REQUEST_TEMPLATE.md` 結構填寫，寫到暫存檔再帶入：

- **變更類型**：勾一個最貼切的
- **描述**：條列這次改了什麼、為什麼，寫給 reviewer 看，不要複製 commit 清單
- **合併前檢查清單**：只勾真的做到的。本輪沒有跑過測試，就不要勾「我已經在本機端測試過」
- **補充說明**：有需要 reviewer 特別注意的風險或後續待辦才寫，否則留空

```bash
gh pr create --base main --title "[refactor] 摘要" --body-file <tmpfile>
```

### 7. 回報

輸出 PR 連結，並列出：分支名、commit 清單、被排除沒 add 的檔案（若有）、檢查清單中沒勾的項目與原因。

明確告知使用者接下來由他自己上 GitHub review 與 merge；merge 完成後再呼叫 `/sync-deploy`。

## 護欄

- 不 force push，不改寫已推送的歷史
- 不直接 push 到 `main` 或 `deploy`
- 不自行 merge PR、不加 auto-merge
- 任何需要判斷的異常（本地 main 有 commit、rebase 衝突、工作區有不明檔案）都停下回報，不猜測補救
