# 這個專案該跑哪些檢查

**不要憑語言猜指令。** 猜的代價：Laravel + Inertia 專案照著「PHP 就跑 `artisan test` + `pint --test`」會漏掉型別檢查、前端 lint、前端測試與 build，而 CI 全都跑，PR 開出去才紅。

## 查法：由可靠到不可靠

**1. CI workflow** —— 與「PR 會不會變紅」定義完全一致。

```bash
ls .github/workflows/
grep -E 'run:' -A3 .github/workflows/*.yml
```

CI 常只呼叫一個 aggregate 指令（`composer ci:check`、`npm run ci`、`make check`），跑那一個就好，不要拆開。

**2. 專案定義的 script**

```bash
grep -A30 '"scripts"' composer.json package.json
cat Makefile justfile Taskfile.yml 2>/dev/null
```

找 `ci`、`ci:check`、`check`、`test`、`lint:check`、`format:check`、`typecheck`。

**帶 `:check` / `--test` / `--dry-run` 的才是唯讀版**，另一個會直接改檔案。要知道「現在通不通過」用唯讀版，確認失敗後再跑會改檔案的去修。

**3. 設定檔存在就代表該工具要跑** —— `phpstan.neon`、`pint.json`、`eslint.config.js`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`。有設定檔但 script 沒涵蓋多半是漏了，回報一句。

**4. 都找不到才用預設值**，並在回報中標明是推測的：

| 生態 | 預設 |
|---|---|
| Laravel／PHP | `php artisan test`、`vendor/bin/pint --test`、`vendor/bin/phpstan analyse` |
| Node／TS | `npm test`、`npm run lint`、`npx tsc --noEmit` |

## 昂貴的檢查

E2E、完整 build、需要起服務的整合測試，判準是這次改動碰不碰得到：只改後端邏輯就讓 CI 跑 Playwright；改了 UI、路由、build 設定就本機先跑，因為這幾類在 CI 失敗時最難從 log 判斷原因。

略過的項目在 PR 驗證清單裡不要勾，並說明原因。

## 額外確認

- 新增環境變數時同步更新 `.env.example`
- breaking change 的 commit 有標記（`!` 或 `BREAKING CHANGE:`）
- migration 與用到它的程式碼放同一個 PR
- queue／scheduler 的改動要向後相容，舊 payload 可能還在佇列裡
