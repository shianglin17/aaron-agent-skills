---
name: sync-main
description: PR 合併之後的收尾：確認 PR 真的進了 main、更新本地 main、清掉合併完的分支、回報 main 上的 CI 結果。不負責部署。
when_to_use: 使用者說「我 merge 了」「同步一下 main」「PR 合併了」，或剛在 GitHub 上 merge PR 之後。要開 PR 請改用 open-pr。
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
  - Bash(gh pr view:*)
  - Bash(gh run list:*)
  - Read
---

# Sync Main

前提：使用者已在 GitHub 上把 PR merge 進 `main`。範圍到「本地 main 更新完、分支清乾淨」為止，**不做部署**。

`$ARGUMENTS` 是 PR 編號時用它精準驗證，沒給就以 `main` 最新的 merge commit 為對象。

## 1. 確認起點乾淨

```bash
git status --short
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
gh pr view <PR> --json number,title,state,mergeCommit,mergedAt,headRefName
git merge-base --is-ancestor <mergeCommit.oid> HEAD && echo "in main"
```

`state` 不是 `MERGED`，或 merge commit 不在 `main` 歷史上，就**停下回報**。

沒給 PR 編號時用 `git log --oneline -5` 取最新的 merge／squash commit，並在報告中說明拿哪一筆當對象。

## 4. 清理分支

只刪**已完整合併**的分支。用小寫 `-d`，它在未合併時會拒絕 —— 那個拒絕就是守衛，不要改用 `-D` 繞過。

```bash
git branch --merged main | grep -vE '^\*|main'
git branch -d <branch>
```

squash merge 的分支不會被 `--merged` 認出來（內容進了 main 但 commit 不同）。這時對照 PR 的 `headRefName`，確認 `state` 是 `MERGED` 才能用 `-D`。

遠端分支只有 repo 開了 `delete_branch_on_merge` 才會自動刪除，**該選項預設是關的**。`fetch --prune` 後 `git branch -r` 還看得到來源分支就是沒開，回報並附指令，**不要自己刪遠端分支**：

```bash
gh api -X PATCH repos/{owner}/{repo} -F delete_branch_on_merge=true
```

## 5. 回報 main 的 CI

```bash
gh run list --branch=main --limit 3 --json workflowName,status,conclusion,headSha,url
```

找 `headSha` 等於這次 merge commit 的 run：還在跑就附連結說明進行中，不要等；`conclusion` 不是 `success` 就明確標示失敗並附連結；沒有任何 run 表示這個 repo 的 CI 不跑在 `main` push 上，說明一句即可。

## 6. 回報

合併的 PR / merge commit、本地 `main` 目前的 commit、刪掉哪些分支與哪些沒刪的原因、CI 結果。

## 護欄

- 不對 `main` force push、不 reset、不改寫歷史
- 不 stash 或丟棄未提交的改動
- 不自行 merge PR、不建新分支、不刪遠端分支
- 不用 `-D` 刪未確認合併的分支
- `git pull --ff-only` 失敗當成需要人判斷的訊號，停下回報
