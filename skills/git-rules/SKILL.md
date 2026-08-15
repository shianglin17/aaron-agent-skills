---
name: git-rules
description: 個人專案的 Git 規範：分支命名、conventional commit、PR 標題格式、commit 歷史整理。用於檢查或修正分支／commit／PR 標題是否合規，或為新 repo 建立 PR 模板。與語言無關。
---

# Git Rules

遵循 Conventional Commits 與 SemVer。**以下只記錄與通則不同、或實務上最常搞錯的部分**，通則本身不重述。

## 前提：單人專案，但一樣走 PR

沒有同事會擋你，所以很容易「反正是我自己的 repo」就直接 push `main`。**預設仍然走 PR**，理由不是流程潔癖：

- PR 是自動 reviewer（Codex、Copilot、`/code-review`）唯一能介入的地方。直接 push 就等於沒有任何 review。
- PR 是 CI 的觸發點，也是日後回頭找「這段為什麼這樣寫」的唯一敘事單位。

真正該直接 push `main` 的只有一種：**還沒有任何 CI、也還沒有第一個 commit 的空 repo 初始化**。其餘一律開分支。

## Type 清單

```
build  chore  ci  docs  feat  fix  perf  refactor  revert  style  test
```

就是 Conventional Commits 標準的那一份，不自訂新 type。想加 type 之前先問：它是不是 `chore` 或 `build` 的子集？多半是。

## 分支命名

```
<type>/<name>            預設
<type>/<issue>/<name>    有對應的 GitHub issue 時
```

- 全小寫，詞之間用 `-`
- issue 段就寫 `issue-12`，不要自創票號體系

```
✅  feat/booking-cancel-reason    fix/issue-12/token-expiry    chore/bump-deps
❌  Feat/...（型別大寫）  feat/booking_cancel（底線）  feature/...（型別不在清單內）
```

合併後刪除分支，本地與遠端都要（`sync-main` 會做）。

## PR 標題：和 commit 用同一個格式

```
<type>(<scope>): <subject>          ← 與 commit 完全相同的格式
<type>(<scope>): <subject> (#12)    ← 有 issue 時
```

```
✅  feat(booking): 支援取消原因      fix: 修正 token 過期判斷 (#12)
❌  [feat] 支援取消原因              ← 括號格式是團隊 repo 的慣例，個人 repo 不用
```

三種 merge 策略對 PR 標題的處理**完全不同**，別以為它一定會進歷史：

| 策略 | PR 標題的下場 |
|---|---|
| Squash | **成為 `main` 上那筆 commit 的 subject** |
| Merge commit | subject 是 `Merge pull request #N from ...`，PR 標題掉到 body 第二行 |
| Rebase | 完全不使用，只把原本的 commit 搬過去 |

squash 還有一個容易誤判的細節：GitHub 預設 `squash_merge_commit_title` 是 `COMMIT_OR_PR_TITLE` —— PR 只有**一個** commit 時用那個 commit 的訊息，**兩個以上**才用 PR 標題。同樣按 squash，來源不一樣。

所以「格式錯會弄壞 `main` 的歷史」只在 squash 成立。一律用同一格式的理由是另外兩個：**少記一套規則**（`[feat] 摘要` 那種括號格式是團隊 repo 為了和 commit 區隔用的，個人 repo 一眼就知道自己在看什麼，區隔沒有價值），以及**repo 設定會變** —— 哪天為了壓掉一條雜亂的分支按了 squash，不會因此在 `main` 留下一筆破格的 commit。

## 選哪一種 merge 策略

**預設用 merge commit**，並在 repo 設定裡把另外兩個關掉。

關鍵在於 commit 有沒有先整理過。`open-pr` 已經要求 push 前把歷史整理成有意義的單位 —— 既然付出了那個成本，squash 就是把剛整理好的東西丟掉。merge commit 保留它，而且 `Merge pull request #N` 留下了回頭找 PR 討論與 review 留言的線索（rebase merge 沒有這個）。未來若接發版工具也一樣：它讀個別 commit，squash 之後只剩 PR 標題那一筆有效。

嫌線圖亂的話，這就是「一行一個 PR」的視圖：

```bash
git log --first-parent --oneline
```

三種策略都開著的實際風險是按錯鈕。收斂設定：

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

反過來說，**如果你不打算整理 commit**，那就該用 squash 而不是 merge commit —— 兩者是同一個問題的兩種解法，挑一個，不要都做也不要都不做。

## Commit

```
<type>(<scope>): <subject>        scope 可省略
```

- 一個 commit 一個邏輯變更
- Breaking change 用 `!` 或在 body 寫 `BREAKING CHANGE:`
- subject 中英文皆可；寫英文時用祈使句、開頭小寫
- **不寫 AI 署名**（`Co-Authored-By`、`Generated with` 之類一律不加）

### scope

用**業務模組名**，全小寫 kebab-case。指涉範圍明確時就加，改動橫跨多處就省略。

```
✅  feat(auth): ...    fix(order): ...    refactor(search-index): ...
❌  feat(Auth): ...           大寫開頭
❌  fix(OrderService): ...    類別名，改用它所屬的模組 order
❌  feat(getUserList): ...    camelCase 方法名，改用 kebab-case 的模組名
```

**同一個模組固定用同一個 scope。** 最常見的問題不是格式錯，而是同一塊東西出現長短不一或大小寫不同的兩種寫法 —— 這會讓 CHANGELOG 分散、也搜不到完整歷史。接手既有 repo 時先查它已經在用什麼：

```bash
git log --oneline -100 --pretty=%s | grep -oE '^[a-z]+\(([^)]+)\)' | sort -u
```

## 歷史整理：只在推送前

和 agent 一起做事會產生大量「試了 A、改成 B、又退回 A」的 commit。**同一個檔案被反覆決策的過程不該進 `main` 的歷史** —— 它記錄的是探索過程，不是變更。

```bash
git rebase -i origin/main
```

界線很明確：

| 分支狀態 | 可以做的 |
|---|---|
| 還沒 push（`git rev-parse --verify --quiet @{upstream}` 無輸出） | 自由 rebase、squash、reword |
| 已經 push 過 | **不改寫歷史**。要對齊 `main` 用 `git merge`，不用 rebase |

已推送的分支就算只有自己在看，force push 也會讓 PR 上既有的 review 留言失去行號錨點。不值得。

## 版本號

`feat` → MINOR，`fix`／`perf` → PATCH，breaking → MAJOR。其餘 type 不影響版本。

個人專案多半沒有裝發版工具，這時 type 的作用只剩「CHANGELOG 好不好讀」—— 但選錯還是會有代價：日後真的要接 semantic-release 時，過去所有寫成 `chore` 的功能都追不回來了。當下就選對。

## 流程

1. 判斷要做的是哪一件：驗證格式、或為 repo 建立 PR 模板。
2. 對照上面的規則檢查。
3. 格式不合時給出**改正後的具體字串**，不要只說「不符規範」。
4. 重新檢查並列出仍需人工處理的部分。

常用檢查：

```bash
git branch --show-current
git log -1 --pretty=%s
```

## 檔案

- `references/quality-checks.md` — 怎麼找出「這個專案該跑哪些檢查」
- `assets/pr-template.md` — PR 模板，複製到目標 repo 的 `.github/pull_request_template.md`
