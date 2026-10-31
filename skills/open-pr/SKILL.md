---
name: open-pr
description: "Opens a pull request for the current work: branches from the latest main, runs the project's own quality checks, tidies unpushed commits, pushes, and fills the repo's PR template, then returns the PR link for the user to review and merge. Use when the user says 「開 PR」「送 PR」「幫我提 PR」 or a change is ready for review. For cleanup after a merge, use sync-main."
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
  - Bash(git reset:*)
  - Bash(git merge-base:*)
  - Bash(git rev-parse:*)
  - Bash(git push:*)
  - Bash(gh pr create:*)
  - Bash(gh pr view:*)
  - Read
  - Glob
---

# Open PR

## 授權範圍

使用者顯式呼叫 `/open-pr` 即為本輪 commit、push、開 PR 的授權，中途不需再確認。**只限本次呼叫**，不延伸到其他輪次。

`$ARGUMENTS` 有值時視為對 PR 標題或描述的補充，優先採用其語意；含 `--draft` 則開草稿 PR。

命名與訊息格式一律沿用 `git-rules`，此處不重複。只提醒：**commit 訊息與 PR body 不得出現任何 AI 署名。**

## 1. 蒐集現況

```bash
git branch --show-current
git status --short
git fetch origin main --quiet
git log --oneline origin/main..HEAD   # 已完成但還沒開 PR 的 commit
```

最後一條不可省略：`git status` 看不出分支是否已有 commit，少了它會把「已 commit、只是還沒 push」誤判為沒事可做。

工作區乾淨**且** `origin/main..HEAD` 為空，才停下告知沒有東西可開 PR。

## 2. 決定分支

- **在 `main`**：從最新 `origin/main` 開分支，未提交的改動會一起帶過去。

  ```bash
  git switch -c <type>/<kebab-summary> origin/main
  ```

  例外：`main` 上已有本地未推送的 commit，**停下回報**。

- **已在 feature 分支**：沿用。

## 3. 跑品質檢查

**不可略過。** 個人專案沒有同事擋，CI 紅了才發現等於白開一次 PR。

依 [references/quality-checks.md](references/quality-checks.md) 找出專案實際定義的指令，跑唯讀版。

- 失敗且是本次改動造成 → 修掉，修正併入本次 commit
- 失敗但是既有問題 → **停下回報**，不要默默擴大範圍
- 昂貴的檢查依改動範圍決定跑不跑，略過的記下來

## 4. 整理 commit

逐一列出檔案路徑 add，**禁止** `git add .`、`-A`、整個目錄：

```bash
git add path/to/file-a.php path/to/file-b.php
git commit -m "feat(booking): 支援取消原因"
```

add 前確認沒有不該進版控的檔案（本機設定、暫存腳本、`.env`），有就排除並在回報中說明。改動橫跨多個不相關的邏輯變更就拆成多個 commit。

分支上已有的 commit 也要看：

```bash
git rev-parse --verify --quiet @{upstream}   # 有輸出＝已推送過
```

- **無輸出** → 該壓就壓：`git rebase -i origin/main`。非互動環境改用 `git reset --soft "$(git merge-base HEAD origin/main)"` 後重新 commit（不可直接 reset 到 `origin/main`，會把 main 新增的改動反向帶進 commit）
- **有輸出** → 維持原歷史，不整理

## 5. 對齊最新 main

分支落後 `origin/main` 時：

- **無 upstream** → `git rebase origin/main`
- **有 upstream** → `git merge --no-edit origin/main`（rebase 會被 non-fast-forward 拒絕）

有衝突一律 `--abort` 並停下回報，不自行解衝突。

對齊帶進新 commit 時，回步驟 3 重跑品質檢查，通過才 push。

## 6. Push

```bash
git push -u origin HEAD
```

## 7. 開 PR

先找 PR 模板，**檔名大小寫各專案不同**：

```bash
ls .github/pull_request_template.md .github/PULL_REQUEST_TEMPLATE.md \
   .github/PULL_REQUEST_TEMPLATE/*.md docs/pull_request_template.md 2>/dev/null
```

找到就照它的章節填，不自創欄位；沒有就用 `git-rules` skill 的 `assets/pr-template.md` 結構，並建議把它加進這個 repo。

- **描述**：寫改了什麼、為什麼，給 reviewer 看，不要複製 commit 清單
- **驗證清單**：只勾步驟 3 真的跑過且通過的，略過的說明原因

```bash
gh pr create --base main --title "<type>(<scope>): 摘要" --body-file <tmpfile>
```

`--draft` 只在 `$ARGUMENTS` 指定時加。

## 8. 回報

- PR 連結、分支名、commit 清單（有整理過就說明整理成什麼）
- 跑了哪些檢查、通過與否、略過哪些及原因
- 被排除沒 add 的檔案
- 驗證清單沒勾的項目

接著提示 review 途徑：等 PR 上的自動 reviewer 留言後用 `/verify-review-findings` 核實，或本機直接跑 `/code-review`。merge 完成後呼叫 `/sync-main`。

## 護欄

- 不 force push、不改寫已推送的歷史
- 不直接 push 到 `main`
- 不自行 merge PR、不加 auto-merge
- 品質檢查失敗不繼續開 PR
- 需要判斷的異常（本地 main 有 commit、衝突、不明檔案）都停下回報，不猜測補救
