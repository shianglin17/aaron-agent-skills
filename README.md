# aaron-agent-skills

個人維護的 agent skills。遵循 [Agent Skills](https://agentskills.io) 開放標準，可用於 Claude Code、Codex、Cursor 等支援該格式的工具。

## 安裝

### 任何支援 Agent Skills 的工具

```bash
npx skills add shianglin17/aaron-agent-skills
```

私有 repo 用同一個指令即可，認證會依序嘗試 Git credentials → `gh repo clone` → SSH。指定工具用 `-a`：

```bash
npx skills add shianglin17/aaron-agent-skills -a claude-code -a codex
```

安裝後 skill 落在 `.agents/skills/`（實體檔案）與各工具自己的目錄（Claude Code 是 `.claude/skills/`，以 symlink 指向前者）。這些路徑通常在 `.gitignore` 內，由各使用者自行安裝。

要讓協作者裝到相同版本，把 `npx skills` 產生的 `skills-lock.json` 進版控，其他人跑：

```bash
npx skills experimental_install
```

### Claude Code（plugin 方式，可分組安裝與更新）

```bash
/plugin marketplace add shianglin17/aaron-agent-skills
/plugin install gitflow@aaron-skills
```

之後用 `/plugin marketplace update` 拉最新版。

## 分組方式

判準是「**這個 skill 換到別的語言還能用嗎**」—— 能，就用功能命名；不能，就用語言命名。

| Plugin | Skill | 用途 |
|---|---|---|
| `gitflow` | `git-rules` | 分支命名、commit type、PR 標題格式、發版對應 |
| | `open-pr` | 開分支、commit、依模板開 PR |
| | `verify-review-findings` | 逐條核實 PR 上 reviewer 的 finding 再決定要不要改 |
| | `sync-deploy` | PR 合併後把 main 同步到部署分支 |
| `code-quality` | `sonarqube-scan` | Docker 起本機 SonarQube 掃描專案 |
| `php` | `filament-operating-manual` | Playwright 批次截圖 + 寫入 Google Doc 的操作手冊 |

`gitflow` 涵蓋一個 PR 的完整生命週期：開 PR → 處理 review 留言 → 合併 → 同步部署。其中 `git-rules`、`open-pr`、`sync-deploy` 互相引用，要一起裝。

### 分組用原生語言，不用框架

新增語言時開新 plugin（`dotnet`、`javascript`、`python`…）；語言無關的歸到現有的功能分組。**不要用框架當分組名**（不開 `laravel`、`react` 這種）：

- **框架會換，語言不會。** 一個 PHP 專案可能用 Laravel 也可能用 Symfony，但 `composer`、`pint`、`phpstan` 是共通的。分組用框架會讓兩組重複一堆同語言的通用 skill。
- **分組不需要精細。** skill 的 `description` 一直在 context（很短），`body` 只在真正使用時才載入 —— 裝到用不上的 skill 成本很低。粗分組加好命名比細分組容易維護。

### skill 名稱用最小範圍的技術 stack 當前綴

```
plugin:  php                          ← 原生語言
skill:   filament-operating-manual    ← 最小範圍：Filament 而非 Laravel
```

前綴取**最小範圍**，因為那才精確描述「我什麼時候需要它」。Filament 是 Laravel 的套件，比 Laravel 更小，所以用 `filament-`。

命名比分組重要得多：

| | 改起來的代價 |
|---|---|
| 分組 | 改 `marketplace.json` 一行，使用者重裝一次 |
| skill 名稱 | 要改所有互相引用的 skill，且每個裝過的人都得手動遷移 |

改名之後 `npx skills update` **只能做到一半**：它會警告該 skill 在 upstream 已不存在，但不會裝上改名後的新 skill（它不知道新名字）。所以每個人都得跑兩步：

```bash
npx skills update                              # 互動模式才會問要不要清掉舊的
npx skills add <owner>/<repo>                  # 裝改名後的新 skill
```

清理行為也不可靠 —— 實測 `update -y` 印出 `Skipping deletion in non-interactive mode` 卻仍把舊目錄刪了，之後 `skills remove` 又回報 `No matching skills found`。所以**名稱要一次想好，分組可以先粗**。等某個框架的 skill 多到 5、6 個，再拆出獨立分組即可。也因此不必預先開空的 `dotnet`、`react` 分組 —— 空分組沒有意義。

## 各語言的差異怎麼處理

**不為每個語言開一份 skill。** 命名與訊息規則本身與語言無關，只有「要跑什麼指令」需要分 —— 那寫成同一份文件裡的語言分節：

```
git-rules/references/pre-pr-checklist.md
  ## 通用
  ## Laravel／PHP
  ## .NET
  ## JavaScript／TypeScript
```

新增語言就加一節，不動 skill 結構、不動分組。`semantic-release.md` 同樣以分節處理各語言的版本號寫入方式。

## 接到新專案時要調整的地方

- **`sync-deploy`** — 開始前要先確認該專案的發版 workflow 名稱、部署 workflow 名稱、部署分支，skill 內有對照表說明怎麼查。不要沿用別的專案的名稱。
- **`git-rules`** — commit type 與 PR 標題格式是既定慣例，要改就改 skill 本體。
- **`sonarqube-scan`** — `sonar-project.properties` 是各專案自己的檔案，第一次掃描時建立並進該專案版控。

## 注意：`disable-model-invocation` 只在 Claude Code 生效

`open-pr` 與 `sync-deploy` 用 `disable-model-invocation: true` 確保只有使用者明確輸入才會執行 —— 它們會 commit、push、觸發部署。

這個欄位是 Claude Code 擴充，**不在 Agent Skills 標準的六個欄位內**（`name`、`description`、`license`、`compatibility`、`metadata`、`allowed-tools`）。在其他工具上它不會生效，agent 有可能自行觸發。在那些環境使用時請留意。
