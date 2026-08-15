# 這個專案該跑哪些檢查

**不要憑語言猜指令。** 每個專案都已經把「什麼算通過」寫在某個地方了，去讀那個地方，照著跑。

猜指令的實際代價：一個 Laravel + Inertia 專案照著「PHP 就是 `php artisan test` + `pint --test`」跑，會漏掉 TypeScript 型別檢查、前端 lint、前端測試與 build —— 而 CI 全都會跑。PR 開出去才紅，等於白開。

## 查法：由可靠到不可靠

### 1. CI workflow —— 最可靠

CI 跑什麼，本機就跑什麼。這是唯一與「PR 會不會變紅」定義完全一致的來源。

```bash
ls .github/workflows/
grep -A3 -E 'run:' .github/workflows/*.yml
```

常見結果是 CI 只呼叫一個 aggregate 指令（`composer ci:check`、`npm run ci`、`make check`），那就跑那一個，不要拆開跑。

### 2. 專案自己定義的 script

```bash
# PHP
grep -A30 '"scripts"' composer.json

# Node
grep -A30 '"scripts"' package.json

# 其他
cat Makefile justfile Taskfile.yml 2>/dev/null
```

找這幾類名稱：`ci`、`ci:check`、`check`、`test`、`lint:check`、`format:check`、`typecheck`、`types:check`。

注意 `lint` 與 `lint:check` 的差別：**帶 `:check` / `--test` / `--dry-run` 的才是唯讀版**，另一個會直接改檔案。開 PR 前要看的是「現在通不通過」，用唯讀版；確認失敗之後再跑會改檔案的那個去修。

### 3. 設定檔存在就代表該工具要跑

`phpstan.neon`、`pint.json`、`eslint.config.js`、`.prettierrc`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`、`phpunit.xml` —— 有設定檔但 script 沒有涵蓋，多半是漏了，值得回報一句。

### 4. 都找不到才用預設值

| 生態 | 預設 |
|---|---|
| Laravel／PHP | `php artisan test`、`vendor/bin/pint --test`、`vendor/bin/phpstan analyse` |
| Node／TS | `npm test`、`npm run lint`、`npx tsc --noEmit` |

用了預設值就在回報中講明「專案沒有定義檢查指令，這是推測的」。

## 昂貴的檢查怎麼辦

E2E（Playwright）、完整 build、需要起服務的整合測試會跑很久。判準是**這次的改動碰不碰得到它**：

- 只改了後端邏輯 → 不必為此跑 Playwright，讓 CI 跑
- 改了 UI、路由、build 設定 → 本機先跑，因為這幾類在 CI 失敗時最難從 log 判斷原因

略過任何一項就在 PR body 的驗證清單裡**不要勾**，並在回報中說明略過的原因。沒跑就是沒跑。

## 額外確認（與指令無關）

- 新增環境變數時同步更新 `.env.example` 或對應範本
- 有 breaking change 時確認 commit 有標記（`!` 或 `BREAKING CHANGE:`）
- migration 與用到它的程式碼放在同一個 PR，否則部署順序會出問題
- queue／scheduler 的改動要向後相容 —— 舊的 payload 可能還在佇列裡
