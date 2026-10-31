---
name: cloud-eval
description: "Evaluates cloud architectures on AWS and Google Cloud (GCP) before anything is built: discovers requirements and constraints, shortlists services, verifies pricing, quotas, GA status and regional availability against official sources, estimates monthly cost in three scenarios, and writes a sourced report. Use for service selection, cost estimates, architecture reviews, or AWS vs GCP comparisons, not for deploying or operating resources. 雲端評估、選型、估價、架構審查、AWS GCP 比較。"
argument-hint: "[aws|gcp|compare] [專案或主題]"
---

# Cloud Eval

評估 AWS、GCP 上的架構：選型、估價、架構審查、跨雲比較。產出是一份附來源的評估報告。

不做：建立、修改、刪除雲端資源；部署；套用 IaC。使用者要求這些時，說明本 skill 只做評估。

## 1. 解析參數

輸入：`$ARGUMENTS`

第一個詞決定模式，其餘是專案或主題。

| 第一個詞 | 模式 | 做法 |
|---|---|---|
| `aws` | 單雲 | 只評估 AWS |
| `gcp` | 單雲 | 只評估 Google Cloud |
| `compare` | 跨雲 | 兩朵雲各出方案，再照 [references/compare.md](references/compare.md) 比較 |
| 其他或空白 | 未定 | 從主題與對話推斷；推斷不出就在步驟 1 一併問 |

- 主題空白：先問要評估什麼，不要自己挑題目。
- 使用者給的是既有架構（圖、IaC、帳單）：當成架構審查，步驟 2 的候選包含「維持現狀」。

## 2. 評估流程

複製這份清單，逐步打勾：

```
評估進度：
- [ ] 1. 釐清需求與限制（問完停下，等回答）
- [ ] 2. 列候選
- [ ] 3. 逐項查證
- [ ] 4. 估成本
- [ ] 5. 比較與風險
- [ ] 6. 出報告
```

### 步驟 1：釐清需求與限制

讀 [references/discovery.md](references/discovery.md)，照它的題庫問。

- 這一步**不提方案、不提服務名稱**。
- 已經從對話得知的項目不再問，列為「已知」。
- 只問會改變決定的題目，一次問完，最多 10 題，每題附預設選項。
- 問完就停下，等使用者回答。不要在同一則回覆裡接著做步驟 2。
- 使用者說「先用假設」或「直接做」：用題庫的預設值，逐條標「假設」，繼續。

### 步驟 2：列候選

- 每朵雲列 2–3 個候選架構，涵蓋不同的託管程度，例如：單機或輕量主機 → 容器託管 → 全託管服務組合。
- 一定要有一個「最簡單可行」的候選。
- 每個候選寫一行理由，連回步驟 1 的哪個限制。
- 不符合硬限制（預算上限、資料落地、區域）的候選直接淘汰，寫出淘汰原因。
- 服務的官方起點查下面的〈領域路由〉。

### 步驟 3：逐項查證

讀 [references/verification.md](references/verification.md)。

- 把候選裡每個事實宣稱列進證據表：宣稱、來源 URL、查詢日期、狀態。
- 事實宣稱包括：價格、配額、GA 狀態、區域可用性、服務限制。
- 先查會淘汰候選的事實：區域可用性、硬限制、最大的幾個費用項目。
- 已淘汰的候選，只查到足以確認淘汰為止，不用把每個單價查完。
- 照下面的〈查證規則〉處理。

### 步驟 4：估成本

讀 [references/cost-estimation.md](references/cost-estimation.md)。

- 先寫使用量假設，再查單價，最後用腳本算。
- 出低／可能／高三個情境。
- 對照步驟 1 的預算上限，超過就標出來。

### 步驟 5：比較與風險

- 逐個候選檢查 Well-Architected 六面向：營運、安全、可靠性、效能、成本、永續。官方框架見 [references/upstream-map.md](references/upstream-map.md)。
- 每個候選寫出主要風險與緩解方式，包括鎖定程度、團隊技能落差、維運人力。
- `compare` 模式：讀 [references/compare.md](references/compare.md)，照公平性規則填比較矩陣。

### 步驟 6：出報告

讀 [references/report-template.md](references/report-template.md)，照骨架寫。

- 用繁體中文（台灣用語），結論先講。
- 附證據表、未驗證清單、計算腳本。
- 「未驗證」對結論的影響要寫清楚：會不會改變推薦、會不會超過預算。
- 使用者沒指定存檔位置時，直接在對話中輸出。

## 3. 查證規則

這些規則沒有例外。

1. **不憑記憶**：價格、配額、GA 狀態（含 Preview）、區域可用性、服務限制，每次評估都重新查。
2. **附來源**：每個事實附官方來源 URL 與查詢日期（`YYYY-MM-DD`）。
3. **事實與推論分開**：事實有來源；推論標「推論」，寫出根據哪幾個事實。
4. **查不到就標「未驗證」**：寫出查過哪裡。不要填一個看起來合理的數字。
   - 來源有歧義（不確定是哪個區域、方案、級距的數字）也標「未驗證」，不要寫「推定」後標已查證。
   - 用其他區域的價格代替時，標「推論」，寫出代替的區域。
5. **算術用腳本**：金額與用量一律用 `python3` 算，腳本附在報告裡。
6. **只用官方來源當證據**：AWS 與 Google 的文件、價格頁、API、官方 skill 與 MCP。第三方文章只能當線索。
7. **標區域與幣別**：單價寫明區域與 USD；換算台幣時，匯率附來源與日期。

## 4. 領域路由

先查 [references/upstream-map.md](references/upstream-map.md) 找對應的官方 skill；文件起點如下。查法見 [references/verification.md](references/verification.md)。

| 領域 | AWS | GCP |
|---|---|---|
| 虛擬機與輕量主機 | [EC2](https://docs.aws.amazon.com/ec2/)、[Lightsail](https://docs.aws.amazon.com/lightsail/) | [Compute Engine](https://docs.cloud.google.com/compute/docs/overview) |
| 容器與應用平台 | [ECS／Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)、[EKS](https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html)、[Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html) | [Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run)、[GKE](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview) |
| 無伺服器函式 | [Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) | [Cloud Run functions](https://docs.cloud.google.com/run/docs/functions/comparison) |
| 關聯式資料庫 | [RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)、[Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) | [Cloud SQL](https://docs.cloud.google.com/sql/docs/introduction)、[AlloyDB](https://docs.cloud.google.com/alloydb/docs/overview) |
| NoSQL 與快取 | [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)、[ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html) | [Firestore](https://docs.cloud.google.com/firestore/native/docs/overview)、[Memorystore](https://docs.cloud.google.com/memorystore/docs/redis/memorystore-for-redis-overview) |
| 物件儲存與 CDN | [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)、[CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) | [Cloud Storage](https://docs.cloud.google.com/storage/docs/introduction)、[Cloud CDN](https://docs.cloud.google.com/cdn/docs/overview) |
| 網路與負載平衡 | [VPC](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html)、[NAT gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)、[ELB](https://docs.aws.amazon.com/elasticloadbalancing/) | [VPC](https://docs.cloud.google.com/vpc/docs/overview)、[Cloud NAT](https://docs.cloud.google.com/nat/docs/overview)、[Cloud Load Balancing](https://docs.cloud.google.com/load-balancing/docs/load-balancing-overview) |
| 身分與權限 | [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html) | [IAM](https://docs.cloud.google.com/iam/docs/overview) |
| 可觀測性 | [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html) | [Cloud Logging](https://docs.cloud.google.com/logging/docs/overview)、[Cloud Monitoring](https://docs.cloud.google.com/monitoring/docs/monitoring-overview) |
| 訊息佇列 | [SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) | [Pub/Sub](https://docs.cloud.google.com/pubsub/docs/overview) |
| 資料分析 | [Athena](https://docs.aws.amazon.com/athena/latest/ug/what-is.html)、[Redshift](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html) | [BigQuery](https://docs.cloud.google.com/bigquery/docs/introduction) |
| 生成式 AI | [Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html) | [Vertex AI 生成式 AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview) |
| 區域、配額、上市階段 | [區域服務清單](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/)、[Service Quotas](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html) | [區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones)、[配額](https://docs.cloud.google.com/docs/quotas/overview)、[上市階段](https://docs.cloud.google.com/products/product-launch-stages) |
| 價格 | [價格總覽](https://aws.amazon.com/pricing/)、[Pricing Calculator](https://calculator.aws/) | [價格清單](https://cloud.google.com/pricing/list)、[Pricing Calculator](https://cloud.google.com/products/calculator) |

表外的領域：AWS 用 `aws___search_documentation` 搜；GCP 搜 `docs.cloud.google.com`。

## 5. 參考檔

| 檔案 | 何時讀 |
|---|---|
| [references/discovery.md](references/discovery.md) | 步驟 1 |
| [references/verification.md](references/verification.md) | 步驟 3，或任何要查證的時候 |
| [references/cost-estimation.md](references/cost-estimation.md) | 步驟 4 |
| [references/compare.md](references/compare.md) | `compare` 模式的步驟 5 |
| [references/report-template.md](references/report-template.md) | 步驟 6 |
| [references/upstream-map.md](references/upstream-map.md) | 找官方 skill、Well-Architected 框架 |

## 6. 護欄

- 不執行任何會建立、修改、刪除雲端資源的指令。
- 不複製 AWS、Google 官方 skill 的內容；需要時用連結或 MCP 即時取用。
- 不在報告裡寫帳號 ID、金鑰、內部網址；使用者提供的也要遮蔽。
- 使用者的硬限制（預算上限、資料落地）與推薦衝突時，明說衝突，不要默默放寬。
