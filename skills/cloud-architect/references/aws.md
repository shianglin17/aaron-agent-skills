# AWS

最後審查日期：2026-11-03。超過 6 個月沒審查，先照〈更新〉確認。

## 查證管道

### 1. AWS Knowledge MCP

- 端點：`https://knowledge-mcp.global.api.aws`，不需要 AWS 帳號。
- 工具名稱在用戶端可能帶前綴，例如 `mcp__aws-knowledge__aws___search_documentation`。

| 工具 | 用途 |
|---|---|
| `aws___search_documentation` | 搜尋文件；結果的 `context` 是原文段落 |
| `aws___read_documentation` | 讀整頁文件（Markdown） |
| `aws___get_regional_availability` | 查服務、API、CloudFormation 資源在指定區域是否可用 |
| `aws___list_regions` | 列出區域代碼與名稱 |
| `aws___retrieve_skill` | 取官方 skill；`skill_name` 從 `aws___search_documentation` 的結果照抄 |

使用者想安裝時，給這個指令讓他自己跑：

```bash
claude mcp add --transport http aws-knowledge https://knowledge-mcp.global.api.aws
```

沒裝時，用 `curl` 送 JSON-RPC 到同一個端點。參數格式不確定，先送 `"method":"tools/list"` 看 `inputSchema`：

```bash
curl -s -X POST https://knowledge-mcp.global.api.aws \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"aws___get_regional_availability","arguments":{"regions":["ap-east-2"],"resource_type":"product","filters":["Amazon RDS"]}}}'
```

### 2. 文件 Markdown

`docs.aws.amazon.com` 的網址把結尾 `.html` 換成 `.md`。

## 官方 skill 與文件

- 來源：[aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws)（Apache-2.0）。
- 取用：`aws___retrieve_skill`；或讀 repo 的 `skills/core-skills/<名稱>/SKILL.md`。
- 表外的領域：用 `aws___search_documentation` 搜。

| 領域 | 服務文件 | 官方 skill |
|---|---|---|
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
| IaC | [CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html)、[CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) | `aws-cdk`、`aws-cloudformation` |
| 成本與帳單 | [價格總覽](https://aws.amazon.com/pricing/) | `aws-billing-and-cost-management` |
| 從其他平台遷移 | — | `gcp-to-aws`、`azure-to-aws`、`heroku-to-aws` |

## 事實去哪查

| 事實 | 來源 |
|---|---|
| 區域可用性 | `aws___get_regional_availability`；[區域服務清單](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) |
| 配額與限制 | 該服務的 quotas 頁；[服務端點與配額](https://docs.aws.amazon.com/general/latest/gr/aws-service-information.html)；[Service Quotas](https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html) |
| GA 或 Preview | 該服務文件（標 "preview" 就是 Preview）；[What's New](https://aws.amazon.com/new/) |
| 價格 | 產品價格頁 `https://aws.amazon.com/<服務>/pricing/` |
| 價格（機器可讀） | [Price List Bulk API](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json)，免金鑰 |
| 計算機 | [AWS Pricing Calculator](https://calculator.aws/) |
| 免費額度 | [AWS Free Tier](https://aws.amazon.com/free/) |

- 台灣區域：`ap-east-2`，Asia Pacific (Taipei)（2026-10-31 以 `aws___list_regions` 查證）。每項服務仍要逐項查區域可用性。
- 讀 Price List Bulk API：
  1. 先抓 `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<服務代碼>/current/region_index.json`。
  2. 取該區域的檔案路徑。
  3. 用 `python3` 篩出需要的 SKU；不要整份印出 EC2、RDS 的區域檔。

## 更新

1. 列出官方 skill：`gh api "repos/aws/agent-toolkit-for-aws/git/trees/HEAD?recursive=1" --jq '.tree[].path | select(endswith("SKILL.md"))'`
2. 更新表內改名或刪除的項目，確認 URL 能開。
3. 更新開頭的審查日期。
