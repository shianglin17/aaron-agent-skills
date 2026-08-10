---
name: sync-deploy
description: PR 合併回 main 之後，把 main 同步到部署分支以觸發部署。更新本地 main、確認 merge commit 已進 main、等發版 workflow 跑完並抓回 semantic-release 的 release commit，再 merge 到部署分支並 push。
when_to_use: 使用者說「我 merge 了」「同步 deploy」「推 deploy」「上線」「發版」，或剛在 GitHub 上 merge PR 之後。要開 PR 請改用 open-pr。
argument-hint: "[PR 編號]"
disable-model-invocation: true
allowed-tools:
  - Bash(git status:*)
  - Bash(git branch:*)
  - Bash(git checkout:*)
  - Bash(git switch:*)
  - Bash(git fetch:*)
  - Bash(git pull:*)
  - Bash(git log:*)
  - Bash(git merge:*)
  - Bash(git merge-base:*)
  - Bash(git push:*)
  - Bash(gh pr view:*)
  - Bash(gh run list:*)
  - Bash(gh run watch:*)
  - Read
---

# Sync Deploy

## 前提與範圍

前提：使用者已經在 GitHub 上把 PR review 並 merge 進 `main`。

範圍到「`deploy` push 成功」為止 —— push 後印出 Deploy workflow 連結就結束，**不等部署跑完**。

`$ARGUMENTS` 若是 PR 編號則用它精準驗證；沒給就以 `main` 最新的 merge commit 為對象。

## 專案的 CI 事實

**開始前先確認這三項的實際名稱**，各專案不同，不要沿用別的專案的：

| 項目 | 怎麼確認 | 常見命名 |
|---|---|---|
| 發版 workflow（跑 `npx semantic-release`） | `gh workflow list`、`ls .github/workflows/` | `AutoVersion`、`Release` |
| 部署 workflow | 同上 | `Deploy`、`Deploy to ECS` |
| 部署分支 | `git branch -r` | `deploy`、`production` |

後續步驟中的 workflow 名稱都以此為準代入，不要照抄範例字串。

其餘與 CI 名稱無關、可直接沿用的行為：

- semantic-release 成功發版時會推一個 `chore(release): x.y.z [skip ci]` commit（同時更新 `CHANGELOG.md`、專案檔如 `composer.json`／`package.json`，以及 `VERSION`）
- `.releaserc.json` 用 commit-analyzer 預設規則：**只有 `feat` / `fix` / `perf` 會發版**。純 `chore`/`docs`/`refactor`/`style`/`test`/`ci`/`build` 的合併**不會**產生 release commit —— 這是正常情況，不要卡在那裡等

## 流程

### 1. 確認起點乾淨

```bash
git status --short
git branch --show-current
```

工作區有未提交改動就**停下回報**，不要 stash、不要丟棄。

### 2. 更新本地 main

```bash
git checkout main
git pull --ff-only
```

`--ff-only` 失敗表示本地 main 已偏離遠端，停下回報。

### 3. 驗證合併真的進了 main

給了 PR 編號：

```bash
gh pr view <PR> --json number,title,state,mergeCommit,mergedAt
git merge-base --is-ancestor <mergeCommit.oid> HEAD && echo "in main"
```

`state` 不是 `MERGED`，或 merge commit 不在 `main` 歷史上，就停下回報（可能還沒 merge、或本地 main 還沒抓到）。

沒給 PR 編號：用 `git log --oneline -5` 取最新 merge commit，在報告中說明是拿哪一筆當對象。

### 4. 等發版 workflow 跑完

```bash
gh run list --workflow="<發版 workflow>" --branch=main --limit 5 \
  --json databaseId,headSha,status,conclusion,createdAt
```

找 `headSha` 等於該 merge commit 的 run：

- 找到且還在跑 → `gh run watch <databaseId> --exit-status`
- 還沒出現（CI 剛觸發）→ 隔一小段時間重查，最多重試幾次；持續沒有就停下回報
- `conclusion` 不是 `success` → **停下回報**並附上 run 連結，不要繼續往 deploy 推

### 5. 抓回 release commit 並判斷是否發版

```bash
git pull --ff-only
git log --oneline -3
cat VERSION
```

- HEAD 是 `chore(release): x.y.z [skip ci]` → 記下版本號
- 沒有 release commit → 檢查本次合併的 commit type。全是非發版類型（`chore`/`docs`/`refactor`/`style`/`test`/`ci`/`build`）就是正常，繼續下一步，並在報告中標明「本次無新版本」
- 沒有 release commit 但本次含 `feat`/`fix`/`perf` → **停下回報**，這代表 semantic-release 有異常，要人看

### 6. 同步到 deploy

**順序不可調換：守衛在 merge 與 push 之前。** push 到 `deploy` 會立刻觸發正式部署，
一旦推出去就來不及擋了。

#### 6-1. 切到 deploy 並檢查分歧（還不要 merge）

```bash
git checkout deploy
git pull --ff-only
git log --oneline --no-merges main..deploy
git diff --stat $(git merge-base main deploy) deploy
```

最後一條是關鍵守衛：

- **輸出為空** → `deploy` 自分歧點以來沒有任何淨內容變更，可以繼續。
- **有輸出** → 有人直接在 `deploy` 上改了東西，**停下回報**。不要 merge、不要 push、不要
  force push、不要 reset。

`git log --no-merges` 列出的 commit 不必為空——歷史上的 `chore(deploy): trigger deploy`
空 commit 與一組互相抵銷的 feat/revert 都會出現，那是正常的。**判準只看內容差異那條。**

#### 6-2. merge 並驗證

```bash
git merge --no-edit main
git diff --stat main deploy   # 必須為空
```

部署分支通常**不是** `main` 的祖先，不要用 `--ff-only`。長期運作的部署分支上會累積大量
`Merge branch 'main' into deploy` 的 merge commit，歷史早已分歧，fast-forward 不可能成功。`--no-edit` 產生的訊息就是 `Merge branch 'main' into deploy`，與既有慣例一致。

`git diff --stat main deploy` 不為空就**停下回報**，不要 push。

#### 6-3. Push（此步會觸發正式部署）

```bash
git push origin deploy
```

### 7. 回報

- 這次帶上線的 PR / merge commit
- 版本號（`VERSION`），或「本次無新版本」
- `deploy` 推上去的 commit sha
- Deploy workflow 連結。**必須用剛 push 的 sha 過濾**，不可直接取第一筆：
  ```bash
  SHA=$(git rev-parse HEAD)
  gh run list --workflow="<部署 workflow>" --branch=<部署分支> --limit 5 \
    --json databaseId,status,conclusion,headSha,url \
    --jq ".[] | select(.headSha == \"$SHA\")"
  ```
  剛 push 完 GitHub 可能還沒建立 run，而**舊的 run 幾乎一定存在** —— 用 `--limit 1`
  會抓到上一次部署，回報成本次的連結。過濾後沒有結果就等幾秒重試，仍然沒有就直接給
  Actions 頁面連結，並說明 run 尚未建立。
- 目前所在分支是 `deploy`

到此結束，不追部署結果。

## 護欄

- 不對 `main` 或 `deploy` force push、不 reset、不改寫歷史
- 發版 workflow 失敗絕不繼續推部署分支
- 不 stash 或丟棄使用者未提交的改動
- 不自行 merge PR、不建新分支
- `git pull --ff-only` 失敗（本地分支偏離遠端）當成需要人判斷的訊號，停下回報
- `deploy` 上出現 `main` 沒有的**內容**（非 merge commit 造成的分歧）就停下回報
