---
name: sync-main
description: "Wraps up after a pull request is merged: confirms the PR landed on main, fast-forwards local main, deletes merged local branches, and reports CI on main. Does not deploy. Use when the user says 「我 merge 了」「同步一下 main」「PR 合併了」 or right after merging on GitHub. To open a PR, use open-pr."
argument-hint: "[PR 編號]"
disable-model-invocation: true
allowed-tools:
  - Bash(git status:*)
  - Bash(git branch:*)
  - Bash(git switch:*)
  - Bash(git fetch:*)
  - Bash(git pull:*)
  - Bash(git log:*)
  - Bash(git merge-base:*)
  - Bash(git rev-parse:*)
  - Bash(gh pr view:*)
  - Bash(gh pr list:*)
  - Bash(gh run list:*)
  - Read
---

# Sync Main

前提：使用者已在 GitHub 上把 PR merge 進 `main`。範圍到「本地 main 更新完、分支清乾淨」為止，**不做部署**。

`$ARGUMENTS` 是 PR 編號時用它精準驗證，沒給就依步驟 3 從起點分支找出 PR。

## 1. 確認起點乾淨

```bash
git status --short
git branch --show-current   # 記下起點分支，步驟 3 用
```

有未提交改動就**停下回報**，不要 stash、不要丟棄。

## 2. 更新本地 main

```bash
git fetch origin --prune
git switch main
git pull --ff-only
```

`--ff-only` 失敗表示本地 main 已偏離遠端，停下回報。

## 3. 驗證合併真的進了 main

```bash
gh pr view <PR> --json number,title,state,mergeCommit,mergedAt,headRefName,headRefOid
git merge-base --is-ancestor <mergeCommit.oid> HEAD && echo "in main"
```

`state` 不是 `MERGED`，或 merge commit 不在 `main` 歷史上，就**停下回報**。

沒給 PR 編號時先解析出 PR，再往下做：

- 起點在 feature 分支 → `gh pr view <起點分支>`
- 起點在 `main` → `gh pr list --state merged --base main --limit 1 --json number`，並在報告中說明拿哪一筆當對象
- 找不到 PR → **停下回報**

## 4. 清理分支

只刪**已完整合併**的分支。用小寫 `-d`，它在未合併時會拒絕 —— 那個拒絕就是守衛，不要改用 `-D` 繞過。

```bash
git branch --merged main | grep -vE '^\*|main'
git branch -d <branch>
```

squash merge 的分支不會被 `--merged` 認出來（內容進了 main 但 commit 不同）。這時才可用 `-D`，須同時滿足：

- 分支名等於 PR 的 `headRefName`，且 `state` 是 `MERGED`
- `git rev-parse <branch>` 等於 PR 的 `headRefOid`

tip 不等於 `headRefOid` 表示合併後又有本地 commit，**保留分支**並回報。

遠端分支只有 repo 開了 `delete_branch_on_merge` 才會自動刪除，**該選項預設是關的**。`fetch --prune` 後 `git branch -r` 還看得到來源分支就是沒開，回報並附指令，**不要自己刪遠端分支**：

```bash
gh api -X PATCH repos/{owner}/{repo} -F delete_branch_on_merge=true
```

## 5. 回報 main 的 CI

```bash
gh run list --commit <mergeCommit.oid> --json workflowName,status,conclusion,url
```

逐一檢查回傳的每個 workflow：還在跑就附連結說明進行中，不要等；`conclusion` 不是 `success` 就明確標示失敗並附連結；沒有任何 run 表示這個 repo 的 CI 不跑在 `main` push 上，說明一句即可。

## 6. 回報

合併的 PR / merge commit、本地 `main` 目前的 commit、刪掉哪些分支與哪些沒刪的原因、CI 結果。

## 護欄

- 不對 `main` force push、不 reset、不改寫歷史
- 不 stash 或丟棄未提交的改動
- 不自行 merge PR、不建新分支、不刪遠端分支
- 不用 `-D` 刪未確認合併的分支；本地 tip 不等於 PR 的 `headRefOid` 就不刪
- `git pull --ff-only` 失敗當成需要人判斷的訊號，停下回報
