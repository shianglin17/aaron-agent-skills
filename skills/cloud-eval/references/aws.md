# AWS

最後審查日期：2026-10-31。超過 6 個月沒審查，使用前先照〈更新這份檔案〉確認。

評估含 AWS 時讀這份。跨雲共通的查證順序與證據表格式見 [verification.md](verification.md)。

## 目錄

- 查證管道
- 服務文件與官方 skill
- 各類事實去哪查
- 價格來源
- 計價注意事項
- 更新這份檔案

## 查證管道

### 1. AWS Knowledge MCP

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

沒裝 MCP 時，直接呼叫公開端點。用 `curl` 送 JSON-RPC：

```bash
curl -s -X POST https://knowledge-mcp.global.api.aws \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"aws___get_regional_availability","arguments":{"regions":["ap-east-2"],"resource_type":"product","filters":["Amazon RDS"]}}}'
```

參數格式不確定時，先送 `"method":"tools/list"` 看 `inputSchema`。

### 2. 文件 Markdown

`docs.aws.amazon.com` 的頁面把結尾 `.html` 換成 `.md` 就是 Markdown 版本：

```
https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html
→ https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.md
```

### 3. 網頁

前兩種都失敗時，用 WebFetch 抓 HTML 頁面。

## 服務文件與官方 skill

官方 skill 只列名稱，不複製內容。

| 領域 | 服務文件起點 | 官方 skill |
|---|---|---|
| 整體架構與需求探索 | — | `architect-for-startups`（在 `plugins/aws-startup-advisor`） |
| Well-Architected 審查 | [AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html) | `aws-well-architected-review` |
| 虛擬機與輕量主機 | [EC2](https://docs.aws.amazon.com/ec2/)、[Lightsail](https://docs.aws.amazon.com/lightsail/) | `aws-compute` |
| 容器與應用平台 | [ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)、[Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)、[EKS](https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html)、[Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html) | `aws-containers` |
| 無伺服器函式 | [Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) | `aws-serverless` |
| 關聯式資料庫 | [RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)、[Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html) | `aws-database` |
| NoSQL 與快取 | [DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)、[ElastiCache](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html) | `aws-database` |
| 物件儲存與 CDN | [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)、[CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html) | `aws-storage` |
| 網路與負載平衡 | [VPC](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html)、[NAT gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)、[ELB](https://docs.aws.amazon.com/elasticloadbalancing/) | `aws-networking` |
| 身分與安全 | [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html) | `aws-iam`、`aws-security`、`aws-secrets-manager` |
| 可觀測性 | [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html) | `aws-observability` |
| 訊息與串流 | [SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) | `aws-messaging-and-streaming` |
| 資料分析 | [Athena](https://docs.aws.amazon.com/athena/latest/ug/what-is.html)、[Redshift](https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html) | `redshift-guide`、`querying-data-lake` |
| 生成式 AI | [Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html) | `amazon-bedrock`、`aws-ai-ml` |
| 成本與帳單 | [價格總覽](https://aws.amazon.com/pricing/) | `aws-billing-and-cost-management` |
| 從其他平台遷移 | — | `gcp-to-aws`、`azure-to-aws`、`heroku-to-aws` |

- 表外的領域：用 `aws___search_documentation` 搜。
- 官方 skill 來源：[aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws)，授權 Apache-2.0。
- 取用方式：用 `aws___retrieve_skill`（先用 `aws___search_documentation` 取得 `skill_name`）；或讀 repo 的 `skills/core-skills/<名稱>/SKILL.md`。

## 各類事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | `aws___get_regional_availability`；或[區域服務清單](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) |
| 配額與限制 | 該服務文件的 quotas 頁；[服務端點與配額](https://docs.aws.amazon.com/general/latest/gr/aws-service-information.html)；[Service Quotas](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html) |
| GA 或 Preview | 該服務文件；[What's New](https://aws.amazon.com/new/)。文件標 "preview" 就是 Preview |
| 價格 | 見〈價格來源〉 |

台灣區域（2026-10-31 查證）：`ap-east-2`，Asia Pacific (Taipei)。來源：AWS Knowledge MCP `aws___list_regions`。區域存在不代表每項服務都有提供，逐項查區域可用性。

## 價格來源

| 來源 | 位置 |
|---|---|
| 產品價格頁（主要來源） | `https://aws.amazon.com/<服務>/pricing/` |
| 機器可讀 API | [Price List Bulk API](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json)，公開、免金鑰 |
| 計算機（給使用者自己核對） | [AWS Pricing Calculator](https://calculator.aws/) |
| 免費額度 | [AWS Free Tier](https://aws.amazon.com/free/) |

## 計價注意事項

- 共通的常漏費用照 [cost-estimation.md](cost-estimation.md) 的〈常漏的費用〉逐項檢查。
- 讀 Price List Bulk API：
  1. 單一服務的檔案很大，先抓 `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<服務代碼>/current/region_index.json`。
  2. 取該區域的檔案路徑。
  3. 用 `python3` 篩出需要的 SKU。EC2、RDS 的區域檔很大，不要整份印出來。

## 更新這份檔案

1. 列出官方 repo 目前的 skill 名稱：

   ```bash
   gh api "repos/aws/agent-toolkit-for-aws/git/trees/HEAD?recursive=1" \
     --jq '.tree[].path | select(endswith("SKILL.md"))'
   ```

2. 改名或刪除的項目更新表格。
3. 檢查表內 URL 是否還能開。
4. 更新本檔開頭的最後審查日期。
