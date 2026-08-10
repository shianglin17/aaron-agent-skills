# Pre-PR 檢查

開 PR 前跑完並確認通過。每個語言只列該語言特有的指令，通用項目不重複。

## 通用

- 測試通過
- formatter／linter 檢查通過
- 新增必要環境變數時同步更新 `.env.example` 或對應範本
- 有 breaking change 時確認 commit 有標記（`!` 或 `BREAKING CHANGE:`）

## Laravel／PHP

```bash
php artisan test
vendor/bin/pint --test
php artisan migrate --pretend      # 有 schema 變更時
```

額外確認：

- queue／scheduler 的改動要向後相容 —— 舊的 payload 可能還在佇列裡
- migration 與相關程式碼要在同一個發版週期，否則部署順序會出問題

## .NET

```bash
dotnet test
dotnet format --verify-no-changes
```

## JavaScript／TypeScript

```bash
npm test
npm run lint
npx tsc --noEmit                   # 有型別的專案
```

## 新增語言時

在此檔案加一節，不要另開 skill 或改動分組 —— 命名與訊息規則本身與語言無關，只有「跑什麼指令」需要分。
