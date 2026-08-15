# aaron-agent-skills

個人專案開發流程的 agent skills。遵循 [Agent Skills](https://agentskills.io) 開放標準，可用於 Claude Code、Codex、OpenCode 等支援該格式的工具。

工作上的流程在 `menai-skills`，兩邊刻意不共用 —— 公司流程綁著票號體系、部署分支、semantic-release 與 SonarQube。

## Skills

一個 PR 的完整生命週期，四個互相引用，一起裝：

| Skill | 用途 |
|---|---|
| `git-rules` | 分支命名、commit 格式、PR 標題、merge 策略、歷史整理的界線 |
| `open-pr` | 開分支 → 跑專案的品質檢查 → 整理 commit → 依模板開 PR |
| `verify-review-findings` | 逐條核實 reviewer 的 finding，再決定要不要改 |
| `sync-main` | PR 合併後更新 main、清理分支、回報 CI |

**不含部署。** 部署分支、發版工具、環境設定各專案差異太大，寫成通用 skill 只會逼你每接一個新專案就先改 skill 本體。

## 安裝

```bash
npx skills add shianglin17/aaron-agent-skills -a claude-code -a codex -a opencode
```

skill 會落在 `.agents/skills/`（實體檔案）與各工具自己的目錄（Claude Code 是 `.claude/skills/`，symlink 指向前者）。

單人專案建議把 `.agents/` 與 `skills-lock.json` 進版控，換機器不必重裝；多人專案才 gitignore 掉、各自跑 `npx skills experimental_install`。

Claude Code 另有 plugin 路徑（只在 Claude Code 有效）：

```bash
/plugin marketplace add shianglin17/aaron-agent-skills
/plugin install gitflow@aaron-skills
```

## 兩個設計決定

**檢查指令從專案讀，不寫死在 skill 裡。** 順序是 `.github/workflows/` → `composer.json` / `package.json` scripts → 設定檔存在性 → 才是預設值。寫死一份跨語言對照表會漏 —— Laravel + Inertia 專案照著「PHP 就跑 `artisan test` + `pint`」會漏掉型別檢查與整個前端，而 CI 都會跑。

**檢查往前挪到 commit 之前。** 團隊 repo 裡 reviewer 是最後一道防線，個人 repo 沒有，所以 `open-pr` 檢查失敗就不繼續。

## skill 命名

改名的代價遠高於改分組：分組只要改 `marketplace.json` 一行，改名要動所有互相引用處，而且 `npx skills update` 遇到改名只做一半 —— 它會警告舊 skill 在 upstream 不存在，但不會裝上新名字的那個。

所以**名稱一次想好，分組可以先粗**。目前全部在 `gitflow` 一組，等某領域多到 5、6 個再拆，不預先開空分組。語言專屬的 skill 用最小範圍的技術當前綴（`filament-*` 而非 `laravel-*`）。

## `disable-model-invocation` 只在 Claude Code 生效

`open-pr` 與 `sync-main` 用它確保只有使用者明確輸入才執行 —— 它們會 commit、push、刪分支。

這是 Claude Code 擴充，不在 Agent Skills 標準的六個欄位內（`name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`）。其他工具上不生效，agent 有可能自行觸發。
