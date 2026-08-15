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
  - Bash(git checkout:*)
  - Bash(git fetch:*)
  - Bash(git pull:*)
  - Bash(git log:*)
  - Bash(git merge-base:*)
  - Bash(gh pr view:*)
  - Bash(gh run list:*)
  - Read
---

# Sync Main

## 前提與範圍

前提：使用者已經在 GitHub 上把 PR merge 進 `main`。

範圍到「本地 main 更新完、分支清乾淨」為止。**不做部署**：需要部署分支同步、semantic-release、等 deploy workflow 的專案，那是專案自己的流程，不在這個 skill 裡。

`$ARGUMENTS` 若是 PR 編號則用它精準驗證；沒給就以 `main` 最新的 merge commit 為對象。

## 流程

### 1. 確認起點乾淨

```bash
git status --short
git branch --show-current
```

工作區有未提交改動就**停下回報**，不要 stash、不要丟棄。

### 2. 更新本地 main

```bash
git fetch origin --prune
git switch main
git pull --ff-only
```

- `--prune` 會清掉「遠端已刪、本地還留著」的 remote-tracking 分支（GitHub merge 後多半已自動刪除來源分支）
- `--ff-only` 失敗表示本地 main 已偏離遠端，**停下回報**

### 3. 驗證合併真的進了 main

給了 PR 編號：

```bash
gh pr view <PR> --json number,title,state,mergeCommit,mergedAt,headRefName
git merge-base --is-ancestor <mergeCommit.oid> HEAD && echo "in main"
```

`state` 不是 `MERGED`，或 merge commit 不在 `main` 歷史上，就**停下回報**（可能還沒 merge、或本地 main 還沒抓到）。

沒給 PR 編號：用 `git log --oneline -5` 取最新的 merge／squash commit，在報告中說明是拿哪一筆當對象。

### 4. 清理分支

只刪**已完整合併進 main** 的分支。用 `-d`（小寫），它在未合併時會拒絕 —— 這個拒絕就是守衛，不要改用 `-D` 繞過。

```bash
git branch --merged main | grep -vE '^\*|main'   # 先列出候選
git branch -d <branch>
```

squash merge 的分支不會被 `--merged` 認出來（內容進了 main，但 commit 不同）。這時用 PR 的 `headRefName` 對照，確認 `gh pr view` 的 `state` 是 `MERGED` 再刪：

```bash
git branch -D <headRefName>   # 僅限已確認 MERGED 的 squash 分支
```

遠端分支通常已由 GitHub 自動刪除；`git branch -r` 還看得到就表示沒開自動刪除，回報一句讓使用者去 repo 設定開啟，**不要自己刪遠端分支**。

### 5. 回報 main 的 CI 狀態

```bash
gh run list --branch=main --limit 3 --json workflowName,status,conclusion,headSha,url
```

找 `headSha` 等於這次 merge commit 的 run：

- 還在跑 → 附連結說明進行中，不要等
- `conclusion` 不是 `success` → 明確標示**失敗**並附連結，這是合併後才會發現的問題，要讓使用者知道
- 沒有任何 run → 這個 repo 的 CI 沒有跑在 `main` push 上，說明一句即可，不是錯誤

### 6. 回報

- 這次合併的 PR / merge commit
- 本地 `main` 目前的 commit
- 刪掉哪些分支、哪些沒刪及原因
- main 上的 CI 結果或連結

## 護欄

- 不對 `main` force push、不 reset、不改寫歷史
- 不 stash 或丟棄使用者未提交的改動
- 不自行 merge PR、不建新分支
- 不刪遠端分支
- 不用 `git branch -D` 刪未確認合併的分支
- `git pull --ff-only` 失敗（本地分支偏離遠端）當成需要人判斷的訊號，停下回報
