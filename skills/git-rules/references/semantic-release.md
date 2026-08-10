# Semantic-release 設定

發版由 commit type 決定（`feat`→MINOR、`fix`／`perf`→PATCH、breaking→MAJOR），語言差別只在「版本號要寫進哪個檔案」。

## 1. 安裝

```bash
npm init -y
npm install --save-dev \
  semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/changelog \
  @semantic-release/git \
  semantic-release-multi-lang
```

`semantic-release-multi-lang` 是把版本號同步寫進非 JS 專案檔（`composer.json`、`.csproj` 等）的插件，純 JS 專案不需要它。

## 2. `.releaserc.json`

共同骨架：

```json
{
  "branches": ["main", "develop"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { "changelogFile": "CHANGELOG.md" }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "VERSION"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\\n\\n${nextRelease.notes}"
    }]
  ]
}
```

各語言把版本號寫進自己的專案檔，插件與 `assets` 依語言調整：

### Laravel／PHP

在 `@semantic-release/git` 之前插入：

```json
["semantic-release-multi-lang", {
  "composerFile": "./composer.json",
  "versionFile": "./VERSION"
}]
```

`assets` 改為 `["CHANGELOG.md", "composer.json", "VERSION"]`。`composer.json` 不在 repo 根目錄時調整 `composerFile`。

### .NET

版本號寫進 `.csproj` 的 `<Version>`，用 `@semantic-release/exec` 搭配 `dotnet` 或 sed 更新，並把該 `.csproj` 加進 `assets`。

### JavaScript／TypeScript

用 `@semantic-release/npm`（要不要真的發佈到 registry 由 `npmPublish` 決定），版本號直接寫進 `package.json`，`assets` 加 `package.json`。

## 3. `VERSION` 檔（選用）

只有設了 `versionFile` 才需要，首次發版前要先建立：

```bash
echo "0.1.0" > VERSION
```

用純 semver，不加 `v` 前綴。

## 4. GitHub Actions

```yaml
name: Release

on:
  push:
    branches: [main, develop]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`fetch-depth: 0` 不可省略 —— semantic-release 要讀完整 tag 歷史才能算出下一版。

Workflow 的 `name` 會成為 `gh run list --workflow=<name>` 的查詢依據，取名後就固定下來，`sync-deploy` 之類依賴它的流程會用到。

## 5. 判斷 breaking change

以下情況即使程式碼相容也該視為 breaking：

- API 合約變更（欄位移除、型別改變、必填新增）
- queue job 的 payload 或 signature 變更（舊 payload 還在佇列裡）
- 需要手動介入才能升級（改設定、跑資料修補）

migration 與相關程式碼要放在同一個發版週期，否則部署順序會出問題。
