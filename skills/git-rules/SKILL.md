---
name: git-rules
description: 團隊的 Git 工作流規範：分支命名、conventional commit、PR 標題與模板、rebase 整理、semantic-release 設定。用於檢查或修正分支／commit／PR 標題是否合規，或為新 repo 建立 PR 模板與發版設定。與語言無關，各語言差異只在 Pre-PR 檢查指令。
---

# Git Rules

遵循 Conventional Commits 與 SemVer。**以下只記錄與通則不同、或實務上最常搞錯的部分**，通則本身不重述。

## Type 清單

```
build  chore  ci  docs  feat  fix  perf  refactor  revert  style  test  infra
```

`infra` 是自訂（基礎設施、部署設定），不在 Conventional Commits 標準內。

分支流程另有 `hotfix`，僅用於緊急上線；它不是 commit type。

## 分支命名

```
<type>/<project-ticket>/<name>     有票號
<type>/<name>                      無票號
```

- 全小寫，詞之間用 `-`
- 票號格式 `xx-90`（專案代號小寫 + 連字號 + 數字）

```
✅  feat/xx-1/backstage-header      fix/xx-2/button-is-missing      chore/adjust-ci
❌  Feat/xx-1/...（型別大寫）  feat/XX-1/...（票號大寫）  feat/xx_1/...（底線）
```

合併後刪除分支，不要留著累積。

## PR 標題

```
[<type> TICKET-ID] 摘要      有票號
[<type>] 摘要                無票號
```

**type 與 commit 用同一份清單**，不另設一套詞彙。

```
✅  [feat XX-90] 新增登入端點      [fix] 修正 token 過期判斷      [chore] 升級依賴
```

括號是刻意的：它標示這是 PR 標題而非 commit message。semantic-release 讀的是 commit，不讀 PR 標題，兩者不衝突。

## Commit

```
<type>(<scope>): <subject>        scope 可省略
```

- 一個 commit 一個邏輯變更
- 開 PR 前用 interactive rebase 把歷史整理成可 review、可回溯的單位
- Breaking change 用 `!` 或在 body 寫 `BREAKING CHANGE:` —— 這會觸發 MAJOR，確認真的要跳大版號再用
- subject 中英文皆可；寫英文時用祈使句、開頭小寫

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

`chore(release)` 是 semantic-release 自動產生的，不要手寫。

## 發版對應

`feat` → MINOR，`fix`／`perf` → PATCH，breaking → MAJOR。其餘 type 不發版。

選 type 時記得這件事：把該發版的改動寫成 `chore` 會導致版本不動。

版本號在兩個地方格式不同，容易搞錯：

```
git tag    v1.2.3      帶 v 前綴（semantic-release 的 tagFormat 預設）
VERSION    1.2.3       不帶 v，純 semver
```

## 流程

1. 判斷要做的是哪一件：驗證格式、建立 PR 模板、或設定 semantic-release。
2. 對照上面的規則檢查。
3. 格式不合時給出**改正後的具體字串**，不要只說「不符規範」。
4. 重新檢查並列出仍需人工處理的部分。

常用檢查：

```bash
git branch --show-current
git log -1 --pretty=%s
```

## 檔案

- `references/pre-pr-checklist.md` — 開 PR 前要跑的檢查，依語言分節
- `references/semantic-release.md` — semantic-release 設定，含各語言的版本號寫入方式
- `assets/pr-template.md` — PR 模板，複製到目標 repo 的 `.github/pull_request_template.md`
