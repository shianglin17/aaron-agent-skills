# Google Cloud（GCP）

最後審查日期：2026-10-31。超過 6 個月沒審查，使用前先照〈更新這份檔案〉確認。

評估含 GCP 時讀這份。跨雲共通的查證順序與證據表格式見 [verification.md](verification.md)。

## 目錄

- 查證管道
- 服務文件與官方 skill
- 各類事實去哪查
- 價格來源
- 計價注意事項
- 更新這份檔案

## 查證管道

### 1. MCP

本檔沒有列 GCP 的文件 MCP。直接用第 2 種。

### 2. 文件 Markdown

`docs.cloud.google.com` 的文件頁在網址後加 `.md.txt` 就是 Markdown：

```
https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
→ https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run.md.txt
```

- 價格頁（`cloud.google.com/<產品>/pricing`）沒有 Markdown 版，用 WebFetch 抓 HTML。
- 回 404 時，先用 WebFetch 抓不加 `.md.txt` 的頁面，找正確路徑。

### 3. 網頁

前兩種都失敗時，用 WebFetch 抓 HTML 頁面。

## 服務文件與官方 skill

官方 skill 只列名稱，不複製內容。

| 領域 | 服務文件起點 | 官方 skill |
|---|---|---|
| 整體架構與需求探索 | — | `google-cloud-solution-architecture` |
| Well-Architected 審查 | [Google Cloud Well-Architected](https://docs.cloud.google.com/architecture/framework) | `google-cloud-waf-operational-excellence`、`google-cloud-waf-security`、`google-cloud-waf-reliability`、`google-cloud-waf-performance-optimization`、`google-cloud-waf-cost-optimization`、`google-cloud-waf-sustainability` |
| 虛擬機與輕量主機 | [Compute Engine](https://docs.cloud.google.com/compute/docs/overview) | `gcloud` |
| 容器與應用平台 | [Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)、[GKE](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview) | `cloud-run-basics`、`gke-basics` |
| 無伺服器函式 | [Cloud Run functions](https://docs.cloud.google.com/run/docs/functions/comparison) | `cloud-run-basics` |
| 關聯式資料庫 | [Cloud SQL](https://docs.cloud.google.com/sql/docs/introduction)、[AlloyDB](https://docs.cloud.google.com/alloydb/docs/overview) | `cloud-sql-basics`、`alloydb-basics`、`spanner-basics`、`cloud-databases-onboarding` |
| NoSQL 與快取 | [Firestore](https://docs.cloud.google.com/firestore/native/docs/overview)、[Memorystore](https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview) | `bigtable-basics`、`cloud-databases-onboarding` |
| 物件儲存與 CDN | [Cloud Storage](https://docs.cloud.google.com/storage/docs/introduction)、[Cloud CDN](https://docs.cloud.google.com/cdn/docs/overview) | `google-cloud-storage-basics`、`google-cloud-storage-bucket-architect` |
| 網路與負載平衡 | [VPC](https://docs.cloud.google.com/vpc/docs/overview)、[Cloud NAT](https://docs.cloud.google.com/nat/docs/overview)、[Cloud Load Balancing](https://docs.cloud.google.com/load-balancing/docs/load-balancing-overview) | `gke-networking`、`google-cloud-global-frontend-configuration`、`cloud-network-insights` |
| 身分與安全 | [IAM](https://docs.cloud.google.com/iam/docs/overview) | `iam-helper-for-policy-management`、`gke-platform-security` |
| 可觀測性 | [Cloud Logging](https://docs.cloud.google.com/logging/docs/overview)、[Cloud Monitoring](https://docs.cloud.google.com/monitoring/docs/monitoring-overview) | `cloud-logging-configuration-basics`、`cloud-logging-finops`、`cloud-monitoring-metric-selection` |
| 訊息與串流 | [Pub/Sub](https://docs.cloud.google.com/pubsub/docs/overview) | 無對應 |
| 資料分析 | [BigQuery](https://docs.cloud.google.com/bigquery/docs/introduction) | `bigquery-basics` |
| 生成式 AI | [Vertex AI 生成式 AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview) | `gemini-api`、`agent-platform-inference` |
| 成本與帳單 | [價格清單](https://cloud.google.com/pricing/list) | `gke-cost-analysis`、`gke-cost-optimization`、`cloud-logging-finops` |
| 從其他平台遷移 | — | `bigquery-migration-sql-translator`、`managed-airflow-migrations` |

- 表外的領域：搜 `docs.cloud.google.com`。
- 「無對應」表示 2026-10-31 審查時找不到同領域的官方 skill。
- 官方 skill 來源：[google/skills](https://github.com/google/skills)，授權 Apache-2.0。
- 取用方式：讀 repo 的 `skills/cloud/<名稱>/SKILL.md`，例如 `https://github.com/google/skills/blob/main/skills/cloud/<名稱>/SKILL.md`。
- GCP 官方 skill 要求執行 `gcloud`、REST API、MCP 指令前，先讀它的使用歸因說明。本 skill 只做評估，不執行這類指令。使用者改用官方 skill 動手時，提醒他照官方說明做。

## 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | 該產品的 locations 頁，例如 `run/docs/locations`、`sql/docs/mysql/locations`；[區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones) |
| 配額與限制 | 該產品的 quotas 頁，例如 `run/quotas`、`sql/docs/quotas`；[配額總覽](https://docs.cloud.google.com/docs/quotas/overview) |
| GA 或 Preview | 產品文件頁上的上市階段標示；[上市階段定義](https://docs.cloud.google.com/products/product-launch-stages) |
| 價格 | 見〈價格來源〉 |

台灣區域（2026-10-31 查證）：`asia-east1`，彰化縣，台灣。來源：[區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones)。區域存在不代表每項服務都有提供，逐項查區域可用性。

## 價格來源

| 來源 | 位置 |
|---|---|
| 產品價格頁（主要來源） | `https://cloud.google.com/<產品>/pricing` |
| 機器可讀 API | [Cloud Billing Catalog API](https://docs.cloud.google.com/billing/docs/how-to/get-pricing-information-api)，需要 API 金鑰；沒有就用價格頁 |
| 計算機（給使用者自己核對） | [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) |
| 免費額度 | [Google Cloud Free](https://cloud.google.com/free) |

## 計價注意事項

- 共通的常漏費用照 [cost-estimation.md](cost-estimation.md) 的〈常漏的費用〉逐項檢查。
- WebFetch 的摘要可能讀錯價格頁的表格。抓到的數字要對得上區域（例如 `asia-east1`）、版本（例如 Enterprise）、級距；對不上就標「未驗證」。

## 更新這份檔案

1. 列出官方 repo 目前的 skill 名稱：

   ```bash
   gh api "repos/google/skills/git/trees/HEAD?recursive=1" \
     --jq '.tree[].path | select(startswith("skills/cloud/") and endswith("SKILL.md"))'
   ```

2. 改名或刪除的項目更新表格。
3. 檢查表內 URL 是否還能開。
4. 更新本檔開頭的最後審查日期。
