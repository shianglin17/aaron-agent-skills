# Cloudflare

最後審查日期：2026-10-31。超過 6 個月沒審查，使用前先照〈更新這份檔案〉確認。

評估含 Cloudflare 時讀這份。跨雲共通的查證順序與證據表格式見 [verification.md](verification.md)。

## 目錄

- 查證管道
- 服務文件與官方 skill
- 列候選與架構審查
- 各類事實去哪查
- 價格來源
- 計價注意事項
- 跨雲比較注意事項
- 更新這份檔案

## 查證管道

### 1. Cloudflare 文件 MCP

- 端點：`https://docs.mcp.cloudflare.com/mcp`
- 不需要 Cloudflare 帳號（2026-10-31 實測，未帶任何憑證即可呼叫）。
- 工具名稱在用戶端可能帶前綴，例如 `mcp__cloudflare-docs__search_cloudflare_documentation`。

| 工具 | 用途 |
|---|---|
| `search_cloudflare_documentation` | 搜尋文件，參數 `query`。回傳相似段落，每筆有 `url`、`title`、`text`，通常已足夠回答 |
| `migrate_pages_to_workers_guide` | Pages 遷移到 Workers 的指南。評估用不到，除非主題是遷移 |

- 搜不到結果（回傳空陣列）就換關鍵字，或改抓 Markdown 版本。
- 另有 API MCP（`https://mcp.cloudflare.com/mcp`）：需要 Cloudflare 帳號授權（OAuth），未授權回 HTTP 401。評估階段用不到，不要要求使用者授權。

使用者想安裝文件 MCP 時，給這個指令讓他自己跑，不要替他裝：

```bash
claude mcp add --transport http cloudflare-docs https://docs.mcp.cloudflare.com/mcp
```

沒裝 MCP 時，直接用 `curl` 送 JSON-RPC（不需要先 `initialize`）：

```bash
curl -s -X POST https://docs.mcp.cloudflare.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_cloudflare_documentation","arguments":{"query":"R2 pricing"}}}'
```

### 2. 文件 Markdown 與索引

`developers.cloudflare.com` 的文件頁在網址結尾加 `index.md` 就是 Markdown：

```
https://developers.cloudflare.com/workers/platform/pricing/
→ https://developers.cloudflare.com/workers/platform/pricing/index.md
```

- 全站索引：`https://developers.cloudflare.com/llms.txt`；每個產品有自己的索引，例如 `https://developers.cloudflare.com/r2/llms.txt`。
- 不是每個路徑都有 Markdown：部分頁面的 `index.md` 會回 HTML 或 404。看回應的 `content-type`；不是 `text/markdown` 就當 HTML 讀，404 就從產品索引找正確路徑。
- 不要抓 `llms-full.txt`，檔案約 70 MB。

### 3. 網頁

前兩種都失敗時，用 WebFetch 抓 HTML 頁面。

## 服務文件與官方 skill

官方 skill 只列名稱，不複製內容。

| 領域 | 服務文件起點 | 官方 skill |
|---|---|---|
| 整體架構與需求探索 | [Reference Architectures](https://developers.cloudflare.com/reference-architecture/) | `cloudflare`（依需求選產品） |
| Well-Architected 審查 | 無對應，見〈列候選與架構審查〉 | 無對應 |
| 虛擬機與輕量主機 | 無（沒有 VM；需要容器見下一列） | 無對應（沒有 VM 產品） |
| 容器與應用平台 | [Workers](https://developers.cloudflare.com/workers/)＋[靜態資源](https://developers.cloudflare.com/workers/static-assets/)、[Containers](https://developers.cloudflare.com/containers/) | `cloudflare`（Containers、Workers Static Assets 的 references）、`nextjs-on-cloudflare` |
| 無伺服器函式 | [Workers](https://developers.cloudflare.com/workers/)、[Workflows](https://developers.cloudflare.com/workflows/) | `workers-best-practices`、`wrangler`、`cf-cli` |
| 關聯式資料庫 | [D1](https://developers.cloudflare.com/d1/)、[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)（連既有 PostgreSQL／MySQL） | `cloudflare`（D1、Hyperdrive 的 references） |
| NoSQL 與快取 | [KV](https://developers.cloudflare.com/kv/)、[Durable Objects](https://developers.cloudflare.com/durable-objects/)、[Workers Cache](https://developers.cloudflare.com/workers/cache/) | `cloudflare`（KV 的 references）、`durable-objects` |
| 物件儲存與 CDN | [R2](https://developers.cloudflare.com/r2/)、[Cache／CDN](https://developers.cloudflare.com/cache/) | `cloudflare`（R2 的 references） |
| 網路與負載平衡 | [Load Balancing](https://developers.cloudflare.com/load-balancing/)、[Tunnel](https://developers.cloudflare.com/tunnel/)、[DNS](https://developers.cloudflare.com/dns/) | `cloudflare`（Tunnel 的 references） |
| 身分與安全 | [帳號權限](https://developers.cloudflare.com/fundamentals/manage-members/)、[Cloudflare One](https://developers.cloudflare.com/cloudflare-one/) | `cloudflare-one`、`cloudflare-one-migrations`、`turnstile-spin` |
| 可觀測性 | [Workers Observability](https://developers.cloudflare.com/workers/observability/) | `cloudflare`（observability、tail-workers 的 references）、`workers-profiling` |
| 訊息與串流 | [Queues](https://developers.cloudflare.com/queues/) | `cloudflare`（Queues、Workflows 的 references）、`k2` |
| 資料分析 | [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)、[R2 SQL](https://developers.cloudflare.com/r2-sql/) | `basin` |
| 生成式 AI | [Workers AI](https://developers.cloudflare.com/workers-ai/)、[AI Gateway](https://developers.cloudflare.com/ai-gateway/)、[Vectorize](https://developers.cloudflare.com/vectorize/) | `cloudflare`（Workers AI、AI Gateway、AI Search、Vectorize 的 references）、`agents-sdk` |
| 成本與帳單 | [Workers 價格](https://developers.cloudflare.com/workers/platform/pricing/) | 無對應 |
| 從其他平台遷移 | — | `cloudflare-one-migrations`（僅 Cloudflare One）、`nextjs-on-cloudflare` |

- 表外的領域：用 `search_cloudflare_documentation` 搜。
- 「無對應」表示 2026-10-31 審查時找不到同領域的官方 skill 或框架。
- 官方 skill 來源：[cloudflare/skills](https://github.com/cloudflare/skills)，授權 Apache-2.0。
- 取用方式：讀 repo 的 `skills/<名稱>/SKILL.md`，例如 `https://github.com/cloudflare/skills/blob/main/skills/<名稱>/SKILL.md`；產品筆記在 `skills/cloudflare/references/<產品>/README.md`。
- 從 `cloudflare` skill 開始：它負責「依需求選產品」，最適合當評估的起點。
- 其餘 skill（`wrangler`、`workers-best-practices`、`durable-objects` 等）偏實作。只在需要確認產品能力或限制時讀。
- 官方 skill 的產品對照表可能偏向推薦 Cloudflare 自家產品。當作線索，事實仍要查證。

## 列候選與架構審查

- 列候選：Cloudflare 沒有主機層。常見的託管光譜是：Workers 加靜態資源 → 加上儲存與資料庫繫結（R2、D1、KV） → 加上有狀態協調（Durable Objects、Queues、Workflows）。
- 架構審查：Cloudflare 沒有 Well-Architected 框架（文件站查無）。用六面向自行檢查，並參考 [Reference Architectures](https://developers.cloudflare.com/reference-architecture/)；它不是六面向審查清單。

## 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | Cloudflare 沒有「選區域」的一般概念，Workers 預設在全球網路執行。要限制資料位置時，查產品的資料位置設定（例如 [R2](https://developers.cloudflare.com/r2/reference/data-location/) 與 [D1](https://developers.cloudflare.com/d1/configuration/data-location/) 的 location hint、jurisdiction）與 [Data Localization Suite](https://developers.cloudflare.com/data-localization/)（企業方案附加功能）。查不到就標「未驗證」，不要寫「台灣區域」 |
| 配額與限制 | [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)；各產品的 `platform/limits` 頁，例如 `d1/platform/limits`、`r2/platform/limits` |
| GA 或 Preview | 該產品文件頁的標示（Beta、Closed beta 等）；[變更紀錄](https://developers.cloudflare.com/changelog/)。官方 skill 也會註明，例如 Artifacts 為 closed beta |
| 價格 | 見〈價格來源〉 |

台灣區域（2026-10-31 查證）：無。沒有以區域為單位的選擇，在全球網路上執行；資料位置用各產品的 location hint、jurisdiction 控制。來源：[Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)、[Data Localization](https://developers.cloudflare.com/data-localization/)。

## 價格來源

| 來源 | 位置 |
|---|---|
| 產品價格頁（主要來源） | 文件站各產品的 pricing 頁，見下表 |
| 機器可讀 API | 無公開的價格 API；用文件站的 Markdown 價格頁 |
| 計算機 | 無官方計算機；各價格頁附計算範例，可照公式核對。方案總覽見 [Developer Platform 方案頁](https://www.cloudflare.com/plans/developer-platform/) |
| 免費額度 | 各產品價格頁的 Free 欄；Workers Free 方案限制見 [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/) |

各產品價格頁（2026-10-31 實測皆回 Markdown，`index.md` 可抓）：

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

- 以產品獨立頁為準。總覽頁與獨立頁不一致時，兩者都記錄並標出差異。
- 價格頁的路徑每個產品不同。表外的產品（AI Search、Cache Reserve 等），從該產品的 `llms.txt` 找價格頁路徑，不要猜。
- 2026-10-31 實測，猜測的路徑常失敗：`containers/pricing/` 與 Cache Reserve 的 `index.md` 回 HTML，AI Search 的猜測路徑回 404。

## 計價注意事項

所有計法與單價都要照價格頁查證。沒有官方計算機，用價格頁的計算範例核對公式。

### 讀價格頁

- 方案（Free、Paid）、計費單位（請求數、CPU 毫秒、列讀寫、操作次數）逐項對照。
- Workers Paid 的月費底價（見 Workers 價格頁）是帳號層級，只計一次。

### 使用量假設要加的維度

在 [cost-estimation.md](cost-estimation.md) 的使用量表加上：每次請求的 CPU 毫秒、D1 每月讀寫列數、KV／R2／Queues 操作次數。

### 常漏的項目

在 cost-estimation.md 的〈常漏的費用〉之外，再逐項檢查：

- [ ] 帳號層級的月費底價（Workers Paid）：整個帳號只算一次，不要每個專案各算一次
- [ ] 免費額度的單位：有些是每日、有些是每月，換算成同一個月再比
- [ ] 請求數的計法：Workers 靜態資源請求、快取命中、service binding、WebSocket 連線是否計入，照 Workers 價格頁的腳註
- [ ] CPU 時間：等待網路與資料庫的時間不計入，但要用實際 CPU 毫秒估，不要用牆鐘時間
- [ ] D1：以列讀取、列寫入、儲存計費；每個查詢實際計入的列數，照價格頁的定義估
- [ ] R2：Class A、Class B 操作費、Infrequent Access 的資料取回費；Standard 的出站流量免費，但接到其他計費服務仍可能產生費用
- [ ] Durable Objects：請求、持續時間、儲存操作分開計；WebSocket 長連線的持續時間
- [ ] Queues、Workflows、KV：各自的操作次數（讀、寫、刪、列）
- [ ] Workers Logs、Logpush：日誌量與保存期的費用
- [ ] Containers、Workers AI、Vectorize 等：依各自價格頁的單位（vCPU 時間、神經元、向量維度）
- [ ] 其他需要付費方案的功能：自訂網域的企業功能、Data Localization Suite（企業方案附加功能）、Cache Reserve 等，確認候選用到的功能在哪個方案
- [ ] 出站流量：Workers、R2、D1 價格頁寫明不收；Containers 的出站流量要收費，且依地區分價（含台灣），不可套用「Cloudflare 不收出站流量」

## 跨雲比較注意事項

Cloudflare 的計價模型與 AWS、GCP 不同，直接並排單價會失真。`compare` 模式照下列處理。所有數字仍要查證，這裡不列任何價格。

| 項目 | 注意事項 |
|---|---|
| 計費單位 | Workers 以請求數與 CPU 時間計費，不計等待 I/O 的時間；AWS Lambda、GCP Cloud Run 的計費維度要另外查證（通常含執行時間與配置的資源）。換算成同一組使用量（請求數、每次請求的 CPU 毫秒），不要用「每百萬次呼叫單價」直接比 |
| 出站流量 | Workers、R2、D1 的價格頁寫明不收出站流量費，但 Containers 要收（依地區分價）；AWS、GCP 的出站流量費要查證後列出。流量大的工作負載要把出站流量費列為獨立一行，各家都算 |
| 帳號層級底價 | Workers Paid 有每月最低收費，屬於帳號層級、整個帳號只算一次。小用量時它佔大部分費用，大用量時可忽略；用三情境呈現 |
| 免費額度 | 免費額度的單位各產品不同（每日、每月、每次呼叫）。照價格頁的單位換算，免費額度與付費方案分開列 |
| 區域與資料位置 | Cloudflare 沒有區域選擇。資料落地要求（例如資料必須留在台灣）要查產品的 location hint、jurisdiction，以及 Data Localization Suite 是否為企業方案附加功能。查不到就在矩陣標「未驗證」，不要假設等同台灣區域 |
| 沒有 VM | 需要長時間執行的行程、非 HTTP 協定、Linux 套件，要用 Containers 或留在 AWS、GCP。這種情況寫在〈不可比的差異〉，不要把 Workers 和 VM 硬比 |
| 資料庫模型 | D1 是採用 SQLite SQL 語意的託管資料庫，以列讀寫計費；與 RDS、Cloud SQL 的託管 MySQL／PostgreSQL 在引擎、容量上限、交易與擴充方式不同。比較前先確認需求是否落在 D1 的限制內（`d1/platform/limits`），超過就改比 Hyperdrive 連既有資料庫 |
| 鎖定程度 | Workers 的繫結（R2、D1、KV、Durable Objects）是 Cloudflare 專有 API，遷出成本通常高於標準容器。R2 提供 S3 相容 API，物件層的遷出成本較低；各項是否成立要查證 |
| 官方資料偏向 | `cloudflare` skill 傾向推薦 Cloudflare 產品。把它的產品選擇當候選清單，不當結論 |

## 更新這份檔案

1. 列出官方 repo 目前的 skill 名稱：

   ```bash
   gh api "repos/cloudflare/skills/git/trees/HEAD?recursive=1" \
     --jq '.tree[].path | select(startswith("skills/") and endswith("SKILL.md"))'
   ```

2. 改名或刪除的項目更新表格。
3. 檢查表內 URL 是否還能開。
4. 更新本檔開頭的最後審查日期。
