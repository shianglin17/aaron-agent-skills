# Google Cloud（GCP）

最後審查日期：2026-11-03。超過 6 個月沒審查，先照〈更新〉確認。

## 查證管道

沒有列 GCP 的文件 MCP。直接抓文件 Markdown：

- `docs.cloud.google.com` 的文件網址後加 `.md.txt`。
- 回 404：先抓不加 `.md.txt` 的頁面，找正確路徑。
- 價格頁沒有 Markdown 版，抓 HTML。

## 官方 skill 與文件

- 來源：[google/skills](https://github.com/google/skills)（Apache-2.0）。
- 取用：讀 `https://github.com/google/skills/blob/main/skills/cloud/<名稱>/SKILL.md`。
- 表外的領域：搜 `docs.cloud.google.com`。
- 「無對應」：2026-10-31 審查時找不到同領域的官方 skill。
- 照官方 skill 執行 `gcloud`、REST API、MCP 指令前，先讀它的使用歸因說明。

| 領域 | 服務文件 | 官方 skill |
|---|---|---|
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
| IaC | [Application Design Center](https://docs.cloud.google.com/application-design-center/docs/overview) | `application-design-center-design-deploy` |
| 成本與帳單 | [價格清單](https://cloud.google.com/pricing/list) | `gke-cost-analysis`、`gke-cost-optimization`、`cloud-logging-finops` |
| 從其他平台遷移 | — | `bigquery-migration-sql-translator`、`managed-airflow-migrations` |

## 事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | 該產品的 locations 頁，例如 `run/docs/locations`；[區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones) |
| 配額與限制 | 該產品的 quotas 頁，例如 `run/quotas`；[配額總覽](https://docs.cloud.google.com/docs/quotas/overview) |
| GA 或 Preview | 文件頁的上市階段標示；[上市階段定義](https://docs.cloud.google.com/products/product-launch-stages) |
| 價格 | 產品價格頁 `https://cloud.google.com/<產品>/pricing` |
| 價格（機器可讀） | [Cloud Billing Catalog API](https://docs.cloud.google.com/billing/docs/how-to/get-pricing-information-api)，需要 API 金鑰 |
| 計算機 | [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator) |
| 免費額度 | [Google Cloud Free](https://cloud.google.com/free) |

- 台灣區域：`asia-east1`，彰化縣（2026-10-31 以[區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones)查證）。每項服務仍要逐項查區域可用性。
- 價格頁的數字要對得上區域、版本（例如 Enterprise）、級距；對不上就標「未驗證」。

## 更新

1. 列出官方 skill：`gh api "repos/google/skills/git/trees/HEAD?recursive=1" --jq '.tree[].path | select(startswith("skills/cloud/") and endswith("SKILL.md"))'`
2. 更新表內改名或刪除的項目，確認 URL 能開。
3. 更新開頭的審查日期。
