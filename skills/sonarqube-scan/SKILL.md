---
name: sonarqube-scan
description: 用 Docker 起本機 SonarQube、掃描當前專案、等 server 端運算完成，最後給出 dashboard URL 與結果摘要。整套自動化，不需要自己開容器、點 UI 或發 token。
when_to_use: 使用者說「跑 sonarqube」「掃一下 code smell」「看程式碼品質」，或想在開 PR 前確認 Quality Gate 有沒有過。
allowed-tools: Read Write Edit Bash
---

# SonarQube Scan

本機起 SonarQube 掃描專案。掃完站台留著，附上網址讓使用者自己點進去看。

**容器預設重用。** 重建要等 SonarQube 重新初始化，也會清掉分析歷史；要全新環境才帶 `SONAR_RECREATE=1`。

## 流程

### 1. 確認 `sonar-project.properties` 存在

沒有就建一份。它是專案自己的檔案，建一次就進版控，之後每次掃描沿用。

`sonar.projectKey`／`sonar.projectName` 用專案名；語言版本對齊該語言的設定檔（`composer.json`、`package.json` 等）；測試目錄從 `sonar.sources` 移到 `sonar.tests`。

`sonar.exclusions` 除了該生態的標準排除項（依賴目錄、建置產物、快取），這兩類容易漏：

- **圖片等二進位副檔名**（`**/*.png` 等）。不排除會被當原始碼讀取，在分析結果產生一批 UTF-8 encoding warning。
- **巢狀的依賴目錄**。依賴不一定只在根目錄，放工具、子專案或 skill 的目錄底下常常各自還有一份。

**第一次掃描不要預先加 `sonar.issue.ignore`。** 先看真實結果，確定某條規則對該專案沒意義再加，並在 properties 裡註明理由。

專案用 Tailwind 4 時，`css:S4662`（at-rules should be valid）會對 `@theme`、`@apply` 等自訂指令誤報，可直接排除。

### 2. 執行 `scripts/run-sonar.sh`

一支腳本做完：準備容器 → 等就緒 → 建專案 → 發 token → 掃描 → 等 Compute Engine 運算完 → 印出結果摘要與 dashboard URL。**在待掃描專案的根目錄執行**（腳本以 `$PWD` 為掃描範圍），路徑指向本 skill 目錄下的 `scripts/run-sonar.sh`：

```bash
bash <skill 目錄>/scripts/run-sonar.sh
```

**用 `run_in_background: true` 跑**，掃描動輒數分鐘。不要在指令尾端接 `| tail`——管線會緩衝到結束才吐字，中途看起來像當掉；要看進度就讀背景任務的 output 檔。

環境變數：`SONAR_CONTAINER`、`SONAR_IMAGE`、`SONAR_ADMIN_PASSWORD`、`SONAR_PORT_FROM`／`SONAR_PORT_TO`、`SONAR_PULL=1`（更新 image）、`SONAR_RECREATE=1`（丟掉既有容器重建）。

改腳本時，**變數後面緊接全形字元一律寫成 `${VAR}`**。macOS 內建 bash 3.2 在 `set -u` 下會把 UTF-8 位元組吃進變數名，噴 `VAR?: unbound variable` 中止。

### 3. 交付

腳本結尾已印出 Quality Gate、issue 總數、三項評等、覆蓋率與重複率。在對話裡給文字結果即可。

**評等一律讀 `software_quality_*` 系列**。SonarQube 26 預設 MQR mode，網頁顯示的是這組；舊的 `security_rating`／`reliability_rating`／`sqale_rating` 屬 standard mode，同一次掃描可能給出不同字母。

腳本沒印、但摘要該有的兩項用 `facets` 補，各一次呼叫：

```bash
# 各面向的 issue 數（腳本只印總數與評等）
curl -s -u "admin:$PW" "$SONAR_URL/api/issues/search?components=$KEY&issueStatuses=OPEN,CONFIRMED&facets=impactSoftwareQualities&ps=1"

# issue 最集中的檔案（facets.values 已依數量排序，components[] 可把 key 對回路徑）
curl -s -u "admin:$PW" "$SONAR_URL/api/issues/search?components=$KEY&issueStatuses=OPEN,CONFIRMED&facets=files&ps=1"
```

`ps=1` 是因為只要 facet 統計、不要 issue 清單本身。要看某一面向的實際條目再加 `impactSoftwareQualities=SECURITY` 並拿掉 `ps=1`。

摘要包含 Quality Gate、各面向 issue 數與評等、覆蓋率、重複率，並點出 issue 集中在哪些檔案——**知道有幾百個 issue 沒有行動意義，知道它們集中在哪幾個檔案才有**。附上 dashboard URL 與帳密。dashboard 預設停在 New Code 分頁，要看整體數字得切到 **Overall Code**。

## 疑難排解

| 症狀 | 原因 |
|---|---|
| `docker pull` 跑十幾分鐘沒動靜 | 本機已有同 tag 的舊 image，正在下載數 GB 新版 layer；tag 要等 pull 完才替換，Docker Desktop 期間仍顯示舊的。預設只在 image 不存在時才 pull。 |
| port 9000 起不來 | 9000 常被其他服務佔用（php-fpm 是常見的一個）。腳本自動往 9001+ 找，不要寫死。 |
| scanner 回 `SonarQube online: false` | 共用網路時 scanner 眼中的 server 永遠是 `http://127.0.0.1:9000`（容器內 port），與對外映射的 port 無關。 |
| API 回 `403` 或密碼錯誤 | 全新容器的 admin 是 `admin/admin` 且首次強制改密碼；重用的容器密碼已改過，腳本只在新建時改。容器若是別的流程建的，帶 `SONAR_ADMIN_PASSWORD` 或 `SONAR_RECREATE=1`。 |
| 掃完 dashboard 沒數字 | 上傳完不等於算完，要 poll `/api/ce/component` 到 `SUCCESS`。 |
| Quality Gate 變 ERROR，但 Overall Code 看起來正常 | New Code 的基準是「上一次分析」。在不同分支間來回掃同一個 project 時，相對上次等於新增了 issue，New Code 條件就會失敗。判斷實際狀態看 Overall Code。 |
