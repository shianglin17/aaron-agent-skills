# aaron-agent-skills

個人專案開發流程的 agent skills。遵循 [Agent Skills](https://agentskills.io) 開放標準，可用於 Claude Code、Codex、OpenCode 等支援該格式的工具。

工作上的流程在另一個 repo（`menai-skills`），兩邊**刻意不共用** —— 公司流程綁著票號體系、部署分支、semantic-release 與 SonarQube，那些放進個人 repo 只會變成永遠用不到的雜訊。

## 涵蓋範圍

一個 PR 的完整生命週期，四個 skill：

| Skill | 用途 |
|---|---|
| `git-rules` | 分支命名、commit 格式、PR 標題、歷史整理的界線 |
| `open-pr` | 開分支 → 跑專案的品質檢查 → 整理 commit → 依模板開 PR |
| `verify-review-findings` | 逐條核實 reviewer 的 finding，再決定要不要改 |
| `sync-main` | PR 合併後更新 main、清理分支、回報 CI |

四個互相引用，一起裝。

**不含部署。** 部署分支、發版工具、環境設定各專案差異太大，寫成通用 skill 只會逼你每次接新專案都先改 skill 本體 —— 那放在專案自己的文件裡更好。

## 安裝

### 任何支援 Agent Skills 的工具

```bash
npx skills add shianglin17/aaron-agent-skills
```

指定工具用 `-a`：

```bash
npx skills add shianglin17/aaron-agent-skills -a claude-code -a codex -a opencode
```

安裝後 skill 落在 `.agents/skills/`（實體檔案）與各工具自己的目錄（Claude Code 是 `.claude/skills/`，以 symlink 指向前者）。

**單人專案建議把 `.agents/` 與 `skills-lock.json` 進版控**：換一台機器就直接有，不必記得重裝，也不會出現兩台機器行為不一致。多人專案才傾向 gitignore 掉、各自跑：

```bash
npx skills experimental_install
```

### Claude Code（plugin 方式）

```bash
/plugin marketplace add shianglin17/aaron-agent-skills
/plugin install gitflow@aaron-skills
```

之後用 `/plugin marketplace update` 拉最新版。只在 Claude Code 有效，跨工具請用上面的 `npx skills`。

## 設計取向

### 檢查指令從專案讀，不寫死在 skill 裡

早期版本在 skill 內維護一份「Laravel 跑這些、.NET 跑這些」的對照表。實際用起來會漏 —— 一個 Laravel + Inertia 專案照著「PHP 就是 `artisan test` + `pint`」跑，會漏掉 TypeScript 型別檢查、前端 lint、前端測試與 build，而 CI 全都會跑，PR 開出去才紅。

現在的做法是讀專案自己的定義，順序是 `.github/workflows/` → `composer.json` / `package.json` scripts → 設定檔存在性 → 才是預設值。細節在 `git-rules/references/quality-checks.md`。

### 沒有同事，所以檢查往前挪

團隊 repo 裡 reviewer 是最後一道防線，`open-pr` 可以不跑測試就把 PR 丟出去。個人 repo 沒有那道防線，所以 `open-pr` **在 commit 之前就跑專案的檢查**，失敗不繼續。

同理，PR 本身不是形式 —— 它是自動 reviewer（Codex、Copilot、`/code-review`）唯一能介入的地方。直接 push `main` 等於完全沒有 review。

### PR 標題用 conventional commit 格式，不用 `[type]` 括號

團隊 repo 用 `[feat XX-90] 摘要` 是為了和 commit 區隔。個人 repo 反過來：**squash merge 會拿 PR 標題當 commit message**，標題破格，`main` 的歷史就跟著破。兩邊格式一致，squash 與 merge commit 都不會出事。

### 命名比分組重要

skill 改名的代價遠高於改分組：

| | 改起來的代價 |
|---|---|
| 分組 | 改 `marketplace.json` 一行，重裝一次 |
| skill 名稱 | 要改所有互相引用的 skill，且每個裝過的人都得手動遷移 |

而且 `npx skills update` 遇到改名**只能做到一半**：它會警告該 skill 在 upstream 已不存在，但不會裝上改名後的新 skill（它不知道新名字），得再跑一次 `npx skills add`。清理行為也不可靠 —— 實測 `update -y` 印出 `Skipping deletion in non-interactive mode` 卻仍把舊目錄刪了。

所以**名稱一次想好，分組可以先粗**。目前全部塞在 `gitflow` 一組；等某個領域的 skill 多到 5、6 個再拆。不預先開空分組。

新增語言專屬的 skill 時，用**最小範圍**的技術 stack 當前綴（Filament 的東西叫 `filament-*` 而不是 `laravel-*`），因為那才精確描述「我什麼時候需要它」。

## 注意：`disable-model-invocation` 只在 Claude Code 生效

`open-pr` 與 `sync-main` 用 `disable-model-invocation: true` 確保只有使用者明確輸入才會執行 —— 它們會 commit、push、刪分支。

這個欄位是 Claude Code 擴充，**不在 Agent Skills 標準的六個欄位內**（`name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`）。在其他工具上它不會生效，agent 有可能自行觸發。在那些環境使用時請留意。
