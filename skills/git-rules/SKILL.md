---
name: git-rules
description: 個人專案的 Git 規範：分支命名、conventional commit、PR 標題格式、commit 歷史整理。用於檢查或修正分支／commit／PR 標題是否合規，或為新 repo 建立 PR 模板。與語言無關。
---

# Git Rules

遵循 Conventional Commits 與 SemVer。**以下只記錄與通則不同、或實務上最常搞錯的部分。**

## 一律走 PR

單人專案沒人擋你直接 push `main`，但 PR 是自動 reviewer（Codex、Copilot、`/code-review`）唯一能介入的地方，也是 CI 的觸發點。例外只有空 repo 的初始化。

## Type

```
build  chore  ci  docs  feat  fix  perf  refactor  revert  style  test
```

標準清單，不自訂新 type。

## 分支命名

```
<type>/<name>            預設
<type>/<issue>/<name>    有對應 GitHub issue 時，寫 issue-12
```

全小寫，詞之間用 `-`。合併後刪除分支。

```
✅  feat/booking-cancel-reason    fix/issue-12/token-expiry
❌  Feat/...    feat/booking_cancel    feature/...
```

## PR 標題

與 commit 同一個格式，有 issue 時結尾加 `(#12)`：

```
✅  feat(booking): 支援取消原因      fix: 修正 token 過期判斷 (#12)
❌  [feat] 支援取消原因
```

`[type]` 括號格式是團隊 repo 為了和 commit 區隔用的，個人 repo 不需要。

統一格式的另一個作用是防 squash：squash merge 會拿 PR 標題當 commit subject（PR 只有一個 commit 時例外，GitHub 改用該 commit 的訊息）。merge commit 與 rebase 則不使用 PR 標題。

## Commit

```
<type>(<scope>): <subject>        scope 可省略
```

- 一個 commit 一個邏輯變更
- Breaking change 用 `!` 或 body 寫 `BREAKING CHANGE:`
- subject 中英文皆可；英文用祈使句、開頭小寫
- **不寫 AI 署名**

### scope

業務模組名，全小寫 kebab-case。範圍明確就加，橫跨多處就省略。

```
✅  feat(auth): ...    fix(order): ...    refactor(search-index): ...
❌  feat(Auth)         fix(OrderService)         feat(getUserList)
```

**同一個模組固定用同一個 scope。** 出現長短不一或大小寫不同的兩種寫法會讓 CHANGELOG 分散、歷史搜不全。接手既有 repo 先查它在用什麼：

```bash
git log --oneline -100 --pretty=%s | grep -oE '^[a-z]+\(([^)]+)\)' | sort -u
```

## 歷史整理：只在推送前

和 agent 做事會留下「試了 A、改成 B、又退回 A」的 commit，那是探索過程，不該進 `main`。

| 分支狀態（`git rev-parse --verify --quiet @{upstream}`） | 可以做的 |
|---|---|
| 無輸出，還沒 push | `git rebase -i origin/main` 自由整理 |
| 有輸出，已 push 過 | 不改寫歷史。對齊 `main` 用 `git merge` |

force push 會讓 PR 上既有的 review 留言失去行號錨點。

## Merge 策略

**預設 merge commit**，並關掉另外兩個：

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

理由是 push 前已經整理過 commit，squash 會把整理結果丟掉；merge commit 保留它，且 `Merge pull request #N` 留下回查 PR 討論的線索。線圖用 `git log --first-parent --oneline` 看成一行一個 PR。

反過來，**不打算整理 commit 就該用 squash** —— 兩者是同一問題的兩種解法，不要都做也不要都不做。

## 版本號

`feat` → MINOR，`fix`／`perf` → PATCH，breaking → MAJOR，其餘不影響。

沒裝發版工具時 type 只影響 CHANGELOG 可讀性，但寫成 `chore` 的功能日後接 semantic-release 時追不回來。

## 檔案

- `references/quality-checks.md` — 怎麼找出這個專案該跑的檢查
- `assets/pr-template.md` — PR 模板，複製到 `.github/pull_request_template.md`
