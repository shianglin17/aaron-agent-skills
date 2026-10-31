# 查證方法

步驟 3 用，任何要查證的時候都可以用。

## 目錄

- 查證管道的順序
- AWS
- GCP
- Cloudflare
- 價格來源
- 證據表格式

## 查證管道的順序

1. 官方 MCP 工具（有裝的話）：AWS Knowledge MCP、Cloudflare 文件 MCP。
2. 直接抓官方文件的 Markdown 版本（WebFetch 或 `curl`）。
3. 抓官方 HTML 頁面（WebFetch）。
4. 都失敗：標「未驗證」，寫出試過哪些 URL。

MCP 沒裝不是停下的理由，直接用第 2、3 種。

## AWS

### AWS Knowledge MCP

- 端點：`https://knowledge-mcp.global.api.aws`
- 不需要 AWS 帳號。
- 工具名稱在用戶端可能帶前綴，例如 `mcp__aws-knowledge__aws___search_documentation`。

| 工具 | 用途 |
|---|---|
| `aws___search_documentation` | 搜尋文件。結果的 `context` 是頁面原文段落，通常已足夠回答 |
| `aws___read_documentation` | 讀整頁文件（Markdown） |
| `aws___get_regional_availability` | 查服務、API、CloudFormation 資源在指定區域是否可用 |
| `aws___list_regions` | 列出所有區域代碼與名稱 |
| `aws___retrieve_skill` | 取 AWS 官方 skill。`skill_name` 要從 `aws___search_documentation` 的結果照抄，不要猜 |

使用者想安裝時，給這個指令讓他自己跑，不要替他裝：

```bash
claude mcp add --transport http aws-knowledge https://knowledge-mcp.global.api.aws
```

### 沒有 MCP 時

**方法 A：直接呼叫 MCP 端點。** 端點是公開的，用 `curl` 送 JSON-RPC：

```bash
curl -s -X POST https://knowledge-mcp.global.api.aws \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"aws___get_regional_availability","arguments":{"regions":["ap-east-2"],"resource_type":"product","filters":["Amazon RDS"]}}}'
```

參數格式不確定時，先送 `"method":"tools/list"` 看 `inputSchema`。

**方法 B：抓文件 Markdown。** `docs.aws.amazon.com` 的頁面把結尾 `.html` 換成 `.md` 就是 Markdown 版本：

```
https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html
→ https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.md
```

### AWS 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | `aws___get_regional_availability`；或[區域服務清單](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) |
| 配額與限制 | 該服務文件的 quotas 頁；[服務端點與配額](https://docs.aws.amazon.com/general/latest/gr/aws-service-information.html)；[Service Quotas](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html) |
| GA 或 Preview | 該服務文件；[What's New](https://aws.amazon.com/new/)。文件標 "preview" 就是 Preview |
| 價格 | 見〈價格來源〉 |

## GCP

### 文件 Markdown

`docs.cloud.google.com` 的文件頁在網址後加 `.md.txt` 就是 Markdown：

```
https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
→ https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run.md.txt
```

- 價格頁（`cloud.google.com/<產品>/pricing`）沒有 Markdown 版，用 WebFetch 抓 HTML。
- 回 404 時，先用 WebFetch 抓不加 `.md.txt` 的頁面，找正確路徑。

### 官方 skill

`google/skills` repo 有 Google Cloud 官方 skill，名稱見 [upstream-map.md](upstream-map.md)。只讀、只引用名稱與連結，不複製內容。讀法：

```
https://github.com/google/skills/blob/main/skills/cloud/<skill 名稱>/SKILL.md
```

### GCP 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | 該產品的 locations 頁，例如 `run/docs/locations`、`sql/docs/mysql/locations`；[區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones) |
| 配額與限制 | 該產品的 quotas 頁，例如 `run/quotas`、`sql/docs/quotas`；[配額總覽](https://docs.cloud.google.com/docs/quotas/overview) |
| GA 或 Preview | 產品文件頁上的上市階段標示；[上市階段定義](https://docs.cloud.google.com/products/product-launch-stages) |
| 價格 | 見〈價格來源〉 |

## Cloudflare

### Cloudflare 文件 MCP

- 端點：`https://docs.mcp.cloudflare.com/mcp`
- 不需要 Cloudflare 帳號（2026-10-31 實測，未帶任何憑證即可呼叫）。
- 工具名稱在用戶端可能帶前綴，例如 `mcp__cloudflare-docs__search_cloudflare_documentation`。

| 工具 | 用途 |
|---|---|
| `search_cloudflare_documentation` | 搜尋文件，參數 `query`。回傳相似段落，每筆有 `url`、`title`、`text`，通常已足夠回答 |
| `migrate_pages_to_workers_guide` | Pages 遷移到 Workers 的指南。評估用不到，除非主題是遷移 |

- 搜不到結果（回傳空陣列）就換關鍵字，或改抓下面的 Markdown 版本。
- 另有 API MCP（`https://mcp.cloudflare.com/mcp`）：需要 Cloudflare 帳號授權（OAuth），未授權回 HTTP 401。評估階段用不到，不要要求使用者授權。

使用者想安裝文件 MCP 時，給這個指令讓他自己跑，不要替他裝：

```bash
claude mcp add --transport http cloudflare-docs https://docs.mcp.cloudflare.com/mcp
```

沒有 MCP 時，直接用 `curl` 送 JSON-RPC（不需要先 `initialize`）：

```bash
curl -s -X POST https://docs.mcp.cloudflare.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_cloudflare_documentation","arguments":{"query":"R2 pricing"}}}'
```

### 文件 Markdown 與索引

`developers.cloudflare.com` 的文件頁在網址結尾加 `index.md` 就是 Markdown：

```
https://developers.cloudflare.com/workers/platform/pricing/
→ https://developers.cloudflare.com/workers/platform/pricing/index.md
```

- 全站索引：`https://developers.cloudflare.com/llms.txt`；每個產品有自己的索引，例如 `https://developers.cloudflare.com/r2/llms.txt`。
- 不是每個路徑都有 Markdown：部分頁面的 `index.md` 會回 HTML 或 404。看回應的 `content-type`；不是 `text/markdown` 就當 HTML 讀，404 就從產品索引找正確路徑。
- 價格頁的路徑每個產品不同，先從產品索引找，不要猜。
- 不要抓 `llms-full.txt`，檔案約 70 MB。

### 官方 skill

`cloudflare/skills` repo 有 Cloudflare 官方 skill，名稱見 [upstream-map.md](upstream-map.md)。只讀、只引用名稱與連結，不複製內容。讀法：

```
https://github.com/cloudflare/skills/blob/main/skills/<skill 名稱>/SKILL.md
```

### Cloudflare 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | Cloudflare 沒有「選區域」的一般概念，Workers 預設在全球網路執行。要限制資料位置時查產品的資料位置設定（例如 [R2](https://developers.cloudflare.com/r2/reference/data-location/) 與 [D1](https://developers.cloudflare.com/d1/configuration/data-location/) 的 location hint、jurisdiction）與 [Data Localization Suite](https://developers.cloudflare.com/data-localization/)（企業方案附加功能）。查不到就標「未驗證」，不要寫「台灣區域」 |
| 配額與限制 | [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)；各產品的 `platform/limits` 頁，例如 `d1/platform/limits`、`r2/platform/limits` |
| GA 或 Preview | 該產品文件頁的標示（Beta、Closed beta 等）；[變更紀錄](https://developers.cloudflare.com/changelog/)。官方 skill 也會註明，例如 Artifacts 為 closed beta |
| 價格 | 見〈價格來源〉 |

## 價格來源

| 來源 | AWS | GCP | Cloudflare |
|---|---|---|---|
| 產品價格頁（主要來源） | `https://aws.amazon.com/<服務>/pricing/` | `https://cloud.google.com/<產品>/pricing` | 文件站各產品的 pricing 頁（見下表） |
| 機器可讀 API | [Price List Bulk API](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json)，公開、免金鑰；單一服務的檔案很大，先用 `region_index.json` 縮到單一區域 | [Cloud Billing Catalog API](https://docs.cloud.google.com/billing/docs/how-to/get-pricing-information-api)，需要 API 金鑰；沒有就用價格頁 | 無公開的價格 API；用文件站的 Markdown 價格頁 |
| 計算機（給使用者自己核對） | [AWS Pricing Calculator](https://calculator.aws/) | [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) | 無官方計算機；各價格頁附計算範例，可照公式核對。方案總覽見 [Developer Platform 方案頁](https://www.cloudflare.com/plans/developer-platform/) |
| 免費額度 | [AWS Free Tier](https://aws.amazon.com/free/) | [Google Cloud Free](https://cloud.google.com/free) | 各產品價格頁的 Free 欄；Workers Free 方案限制見 [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/) |

Cloudflare 各產品價格頁（2026-10-31 實測皆回 Markdown，`index.md` 可抓）：

| 產品 | 價格頁 |
|---|---|
| Workers 總覽頁（同頁含 Workers Logs、KV、Hyperdrive、Queues、Workflows、D1、Durable Objects、Vectorize、R2、Containers 的段落） | `https://developers.cloudflare.com/workers/platform/pricing/` |
| R2 | `https://developers.cloudflare.com/r2/pricing/` |
| D1 | `https://developers.cloudflare.com/d1/platform/pricing/` |
| KV | `https://developers.cloudflare.com/kv/platform/pricing/` |
| Durable Objects | `https://developers.cloudflare.com/durable-objects/platform/pricing/` |
| Queues | `https://developers.cloudflare.com/queues/platform/pricing/` |
| Workflows | `https://developers.cloudflare.com/workflows/reference/pricing/` |
| Workers AI | `https://developers.cloudflare.com/workers-ai/platform/pricing/` |
| Hyperdrive | `https://developers.cloudflare.com/hyperdrive/platform/pricing/` |
| Vectorize | `https://developers.cloudflare.com/vectorize/platform/pricing/` |
| Images | `https://developers.cloudflare.com/images/pricing/` |
| Stream | `https://developers.cloudflare.com/stream/pricing/` |
| Pages Functions | `https://developers.cloudflare.com/pages/functions/pricing/` |
| Containers | `https://developers.cloudflare.com/containers/platform/pricing/` |

以產品獨立頁為準；總覽頁與獨立頁不一致時，兩者都記錄並標出差異。其他產品（AI Search、Cache Reserve 等）：從該產品的 `llms.txt` 找價格頁路徑。2026-10-31 實測：猜測的路徑常失敗：`containers/pricing/` 與 Cache Reserve 的 `index.md` 回 HTML，AI Search 的猜測路徑回 404。

### 讀價格的注意事項

- **AWS Price List**：先抓 `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<服務代碼>/current/region_index.json`，取該區域的檔案路徑，再用 `python3` 篩出需要的 SKU。EC2、RDS 的區域檔很大，不要整份印出來。
- **GCP 價格頁**：WebFetch 的摘要可能讀錯表格。抓到的數字要對得上區域（例如 `asia-east1`）、版本（例如 Enterprise）、級距；對不上就標「未驗證」。
- 價格頁的級距或區域分組看不懂時，不要猜，標「未驗證」並寫出疑點。

規則：

- 價格頁常有多個區域與方案。記下抓的是哪個區域、哪個方案（隨需、承諾使用、Spot）。
- 計算機只能給使用者核對，不能當證據；agent 無法可靠操作計算機頁面。
- 免費額度與 credits 另列一行，不要直接扣進月費。
- **Cloudflare**：價格頁的方案（Free、Paid）、計費單位（請求數、CPU 毫秒、列讀寫、操作次數）逐項對照；Workers Paid 的月費底價（見 Workers 價格頁）是帳號層級，只計一次。

## 證據表格式

步驟 3 起維護這張表，最後放進報告：

| # | 宣稱 | 狀態 | 來源 | 查詢日期 |
|---|---|---|---|---|
| GCP-E1 | Cloud SQL for MySQL 在 asia-east1 提供 | 已查證 | https://docs.cloud.google.com/sql/docs/mysql/locations | 2026-10-31 |
| AWS-E1 | ○○ 服務在 ap-east-2 的單價 | 未驗證：價格頁沒有該區域，Bulk API 逾時 | 試過：（URL） | 2026-10-31 |

- 編號依雲分開、連續編：`AWS-E1`、`AWS-E2`、`GCP-E1`、`CF-E1`。單雲模式可省略前綴。
- 狀態只有兩種：已查證、未驗證。
- 推論不進這張表，寫在報告本文，標「推論」並引用證據編號，例如「推論（根據 GCP-E1、GCP-E3）」。
- 範例列是格式示意，不是查證結果。
