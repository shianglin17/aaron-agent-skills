# 官方 skill 與文件對照

最後審查日期：2026-10-31。超過 6 個月沒審查，使用前先確認 skill 名稱還在。

只列名稱與連結。不複製官方 skill 的內容。

## 來源

| 雲 | repo | 授權 | 取用方式 |
|---|---|---|---|
| AWS | [aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws) | Apache-2.0 | AWS Knowledge MCP 的 `aws___retrieve_skill`（先用 `aws___search_documentation` 取得 `skill_name`）；或讀 repo 的 `skills/core-skills/<名稱>/SKILL.md` |
| GCP | [google/skills](https://github.com/google/skills) | Apache-2.0 | 讀 repo 的 `skills/cloud/<名稱>/SKILL.md` |

GCP 官方 skill 要求執行 `gcloud`、REST API、MCP 指令前先讀它的使用歸因說明。本 skill 只做評估、不執行這類指令；若使用者改用官方 skill 動手，提醒他照官方說明做。

## 領域對照

| 領域 | AWS 官方 skill | GCP 官方 skill | 官方文件 |
|---|---|---|---|
| 整體架構與需求探索 | `architect-for-startups`（在 `plugins/aws-startup-advisor`） | `google-cloud-solution-architecture` | 見 SKILL.md〈領域路由〉 |
| Well-Architected 審查 | `aws-well-architected-review` | `google-cloud-waf-operational-excellence`、`google-cloud-waf-security`、`google-cloud-waf-reliability`、`google-cloud-waf-performance-optimization`、`google-cloud-waf-cost-optimization`、`google-cloud-waf-sustainability` | [AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)、[Google Cloud Well-Architected](https://docs.cloud.google.com/architecture/framework) |
| 虛擬機 | `aws-compute` | `gcloud` | [EC2](https://docs.aws.amazon.com/ec2/)、[Compute Engine](https://docs.cloud.google.com/compute/docs/overview) |
| 容器與應用平台 | `aws-containers` | `cloud-run-basics`、`gke-basics` | [ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)、[Cloud Run](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) |
| 無伺服器 | `aws-serverless` | `cloud-run-basics` | [Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)、[Cloud Run functions](https://docs.cloud.google.com/run/docs/functions/comparison) |
| 資料庫 | `aws-database` | `cloud-sql-basics`、`alloydb-basics`、`spanner-basics`、`bigtable-basics`、`cloud-databases-onboarding` | [RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)、[Cloud SQL](https://docs.cloud.google.com/sql/docs/introduction) |
| 儲存 | `aws-storage` | `google-cloud-storage-basics`、`google-cloud-storage-bucket-architect` | [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)、[Cloud Storage](https://docs.cloud.google.com/storage/docs/introduction) |
| 網路 | `aws-networking` | `gke-networking`、`google-cloud-global-frontend-configuration`、`cloud-network-insights` | [VPC](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html)、[GCP VPC](https://docs.cloud.google.com/vpc/docs/overview) |
| 身分與安全 | `aws-iam`、`aws-security`、`aws-secrets-manager` | `iam-helper-for-policy-management`、`gke-platform-security` | [AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)、[GCP IAM](https://docs.cloud.google.com/iam/docs/overview) |
| 可觀測性 | `aws-observability` | `cloud-logging-configuration-basics`、`cloud-logging-finops`、`cloud-monitoring-metric-selection` | [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html)、[Cloud Logging](https://docs.cloud.google.com/logging/docs/overview) |
| 訊息與串流 | `aws-messaging-and-streaming` | 無對應 | [SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)、[Pub/Sub](https://docs.cloud.google.com/pubsub/docs/overview) |
| 資料分析 | `redshift-guide`、`querying-data-lake` | `bigquery-basics` | [Athena](https://docs.aws.amazon.com/athena/latest/ug/what-is.html)、[BigQuery](https://docs.cloud.google.com/bigquery/docs/introduction) |
| 生成式 AI | `amazon-bedrock`、`aws-ai-ml` | `gemini-api`、`agent-platform-inference` | [Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html)、[Vertex AI 生成式 AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/overview) |
| 成本與帳單 | `aws-billing-and-cost-management` | `gke-cost-analysis`、`gke-cost-optimization`、`cloud-logging-finops` | [AWS 價格](https://aws.amazon.com/pricing/)、[GCP 價格清單](https://cloud.google.com/pricing/list) |
| 從其他平台遷移 | `gcp-to-aws`、`azure-to-aws`、`heroku-to-aws` | `bigquery-migration-sql-translator`、`managed-airflow-migrations` | — |

「無對應」表示 2026-10-31 審查時找不到同領域的官方 skill。

## 台灣區域（2026-10-31 查證）

| 雲 | 區域代碼 | 名稱 | 來源 |
|---|---|---|---|
| AWS | `ap-east-2` | Asia Pacific (Taipei) | AWS Knowledge MCP `aws___list_regions` |
| GCP | `asia-east1` | 彰化縣，台灣 | [區域與可用區](https://docs.cloud.google.com/compute/docs/regions-zones) |

區域存在不代表每項服務都有提供。每項服務照 [verification.md](verification.md) 逐項查。

## 更新這份對照

1. 列出兩個 repo 目前的 skill 名稱：

   ```bash
   gh api "repos/aws/agent-toolkit-for-aws/git/trees/HEAD?recursive=1" \
     --jq '.tree[].path | select(endswith("SKILL.md"))'
   gh api "repos/google/skills/git/trees/HEAD?recursive=1" \
     --jq '.tree[].path | select(startswith("skills/cloud/") and endswith("SKILL.md"))'
   ```

2. 改名或刪除的項目更新表格。
3. 檢查表內 URL 是否還能開。
4. 更新本檔開頭的最後審查日期。
