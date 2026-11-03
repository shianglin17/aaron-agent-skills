# Cloudflare

最後審查日期：2026-11-03。超過 6 個月沒審查，先照〈更新〉確認。

## 查證管道

### 1. Cloudflare 文件 MCP

- 端點：`https://docs.mcp.cloudflare.com/mcp`，不需要帳號。
- 工具名稱在用戶端可能帶前綴，例如 `mcp__cloudflare-docs__search_cloudflare_documentation`。
- 主要工具：`search_cloudflare_documentation`，參數 `query`。搜不到就換關鍵字。
- 不要求使用者授權 API MCP（`https://mcp.cloudflare.com/mcp`，需要 OAuth）。

使用者想安裝時，給這個指令讓他自己跑：

```bash
claude mcp add --transport http cloudflare-docs https://docs.mcp.cloudflare.com/mcp
```

沒裝時，用 `curl` 送 JSON-RPC，不需要先 `initialize`：

```bash
curl -s -X POST https://docs.mcp.cloudflare.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_cloudflare_documentation","arguments":{"query":"R2 pricing"}}}'
```

### 2. 文件 Markdown

- `developers.cloudflare.com` 的網址結尾加 `index.md`。
- 回應的 `content-type` 不是 `text/markdown`：當 HTML 讀。404：從產品索引找正確路徑。
- 索引：全站 `https://developers.cloudflare.com/llms.txt`；產品 `https://developers.cloudflare.com/<產品>/llms.txt`。
- 不要抓 `llms-full.txt`（約 70 MB）。

## 官方 skill 與文件

- 來源：[cloudflare/skills](https://github.com/cloudflare/skills)（Apache-2.0）。
- 取用：讀 `https://github.com/cloudflare/skills/blob/main/skills/<名稱>/SKILL.md`；產品筆記在 `skills/cloudflare/references/<產品>/README.md`。
- 表外的領域：用 `search_cloudflare_documentation` 搜。
- 「無對應」：2026-10-31 審查時找不到同領域的官方 skill 或框架。
- `cloudflare` skill 偏向推薦自家產品：當候選清單，不當結論。

| 領域 | 服務文件 | 官方 skill |
|---|---|---|
| 架構參考 | [Reference Architectures](https://developers.cloudflare.com/reference-architecture/) | 無對應（沒有 Well-Architected 框架） |
| 虛擬機與輕量主機 | 無（沒有 VM，需要容器見下一列） | 無對應 |
| 容器與應用平台 | [Workers](https://developers.cloudflare.com/workers/)＋[靜態資源](https://developers.cloudflare.com/workers/static-assets/)、[Containers](https://developers.cloudflare.com/containers/) | `cloudflare`、`nextjs-on-cloudflare` |
| 無伺服器函式 | [Workers](https://developers.cloudflare.com/workers/)、[Workflows](https://developers.cloudflare.com/workflows/) | `workers-best-practices`、`wrangler`、`cf-cli` |
| 關聯式資料庫 | [D1](https://developers.cloudflare.com/d1/)、[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)（連既有 PostgreSQL／MySQL） | `cloudflare` |
| NoSQL 與快取 | [KV](https://developers.cloudflare.com/kv/)、[Durable Objects](https://developers.cloudflare.com/durable-objects/)、[Workers Cache](https://developers.cloudflare.com/workers/cache/) | `cloudflare`、`durable-objects` |
| 物件儲存與 CDN | [R2](https://developers.cloudflare.com/r2/)、[Cache／CDN](https://developers.cloudflare.com/cache/) | `cloudflare` |
| 網路與負載平衡 | [Load Balancing](https://developers.cloudflare.com/load-balancing/)、[Tunnel](https://developers.cloudflare.com/tunnel/)、[DNS](https://developers.cloudflare.com/dns/) | `cloudflare` |
| 身分與安全 | [帳號權限](https://developers.cloudflare.com/fundamentals/manage-members/)、[Cloudflare One](https://developers.cloudflare.com/cloudflare-one/) | `cloudflare-one`、`cloudflare-one-migrations`、`turnstile-spin` |
| 可觀測性 | [Workers Observability](https://developers.cloudflare.com/workers/observability/) | `cloudflare`、`workers-profiling` |
| 訊息與串流 | [Queues](https://developers.cloudflare.com/queues/) | `cloudflare`、`k2` |
| 資料分析 | [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)、[R2 SQL](https://developers.cloudflare.com/r2-sql/) | `basin` |
| 生成式 AI | [Workers AI](https://developers.cloudflare.com/workers-ai/)、[AI Gateway](https://developers.cloudflare.com/ai-gateway/)、[Vectorize](https://developers.cloudflare.com/vectorize/) | `cloudflare`、`agents-sdk` |
| IaC | [Terraform](https://developers.cloudflare.com/terraform/) | 無對應 |
| 成本與帳單 | [Workers 價格](https://developers.cloudflare.com/workers/platform/pricing/) | 無對應 |
| 從其他平台遷移 | — | `cloudflare-one-migrations`（僅 Cloudflare One）、`nextjs-on-cloudflare` |

- 表中的 `cloudflare` 指該 skill 的產品 references，例如 `references/r2/`。
- 列候選的託管光譜：Workers 加靜態資源 → 加儲存與資料庫繫結（R2、D1、KV） → 加有狀態協調（Durable Objects、Queues、Workflows）。
- Well-Architected 審查：用 SKILL.md 的六面向自行檢查，參考 Reference Architectures。

## 事實去哪查

| 事實 | 來源 |
|---|---|
| 區域與資料位置 | 沒有選區域的概念，Workers 在全球網路執行。查產品的資料位置設定（[R2](https://developers.cloudflare.com/r2/reference/data-location/)、[D1](https://developers.cloudflare.com/d1/configuration/data-location/) 的 location hint、jurisdiction）與 [Data Localization Suite](https://developers.cloudflare.com/data-localization/)（企業方案附加功能）。查不到標「未驗證」，不要寫「台灣區域」 |
| 配額與限制 | [Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)；各產品的 `platform/limits` 頁 |
| GA 或 Preview | 文件頁的標示（Beta、Closed beta）；[變更紀錄](https://developers.cloudflare.com/changelog/) |
| 價格 | 各產品價格頁，見下表；沒有價格 API |
| 計算機 | 沒有官方計算機；用價格頁的計算範例核對公式。方案總覽見 [Developer Platform 方案頁](https://www.cloudflare.com/plans/developer-platform/) |
| 免費額度 | 各產品價格頁的 Free 欄 |

| 產品 | 價格頁（`https://developers.cloudflare.com/` 之後的路徑） |
|---|---|
| Workers 總覽（含多數產品的段落） | `workers/platform/pricing/` |
| R2 | `r2/pricing/` |
| D1 | `d1/platform/pricing/` |
| KV | `kv/platform/pricing/` |
| Durable Objects | `durable-objects/platform/pricing/` |
| Queues | `queues/platform/pricing/` |
| Workflows | `workflows/reference/pricing/` |
| Workers AI | `workers-ai/platform/pricing/` |
| Hyperdrive | `hyperdrive/platform/pricing/` |
| Vectorize | `vectorize/platform/pricing/` |
| Images | `images/pricing/` |
| Stream | `stream/pricing/` |
| Pages Functions | `pages/functions/pricing/` |
| Containers | `containers/platform/pricing/` |

- 以產品獨立頁為準；與總覽頁不一致時，兩者都記並標出差異。
- 表外的產品：從該產品的 `llms.txt` 找價格頁路徑，不要猜。

## 計價注意事項

使用量表另加：每次請求的 CPU 毫秒、D1 每月讀寫列數、KV／R2／Queues 操作次數。

在 cost-estimation.md〈常漏的費用〉之外，再逐項檢查：

- [ ] Workers Paid 月費底價：帳號層級，整個帳號只算一次
- [ ] 免費額度的單位：每日或每月，換算成同一個月
- [ ] 請求數：靜態資源請求、快取命中、service binding、WebSocket 是否計入，照價格頁腳註
- [ ] CPU 時間：用實際 CPU 毫秒估，不用牆鐘時間；等待 I/O 不計
- [ ] D1：列讀取、列寫入、儲存；每個查詢計入的列數照價格頁定義
- [ ] R2：Class A、Class B 操作費；Infrequent Access 的取回費
- [ ] Durable Objects：請求、持續時間、儲存操作分開計；WebSocket 長連線的持續時間
- [ ] Queues、Workflows、KV：各自的操作次數
- [ ] Workers Logs、Logpush：日誌量與保存期
- [ ] Containers、Workers AI、Vectorize：照各自價格頁的單位
- [ ] 需要付費方案的功能：Data Localization Suite、Cache Reserve 等
- [ ] 出站流量：Workers、R2、D1 不收，但接到其他計費服務仍可能產生費用；Containers 要收，且依地區分價（含台灣）

## 跨雲比較

| 項目 | 規則 |
|---|---|
| 計費單位 | 換算成同一組使用量（請求數、每次請求的 CPU 毫秒）再比；不要直接比「每百萬次呼叫單價」 |
| 沒有 VM | 需要長時間行程、非 HTTP 協定、Linux 套件時，寫進〈不可比的差異〉，不要拿 Workers 硬比 VM |
| 資料庫 | D1 是 SQLite 語意、以列計費；先確認需求在 `d1/platform/limits` 內，超過就改比 Hyperdrive 連既有資料庫 |
| 鎖定程度 | Workers 繫結是專有 API；R2 有 S3 相容 API。逐項查證 |

## 更新

1. 列出官方 skill：`gh api "repos/cloudflare/skills/git/trees/HEAD?recursive=1" --jq '.tree[].path | select(startswith("skills/") and endswith("SKILL.md"))'`
2. 更新表內改名或刪除的項目，確認 URL 能開。
3. 更新開頭的審查日期。
