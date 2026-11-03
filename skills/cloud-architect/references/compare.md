# 跨雲比較

多家雲時用。eval 預設比 AWS 與 GCP；使用者提到 Cloudflare 就納入。

## 服務對照

只列名稱；文件與官方 skill 見雲檔。名稱相近不代表功能、限制、計價相同。

| 領域 | AWS | GCP | Cloudflare |
|---|---|---|---|
| 虛擬機與輕量主機 | EC2、Lightsail | Compute Engine | 無 |
| 容器與應用平台 | ECS、Fargate、EKS、Elastic Beanstalk | Cloud Run、GKE | Workers＋靜態資源、Containers |
| 無伺服器函式 | Lambda | Cloud Run functions | Workers、Workflows |
| 關聯式資料庫 | RDS、Aurora | Cloud SQL、AlloyDB | D1、Hyperdrive |
| NoSQL 與快取 | DynamoDB、ElastiCache | Firestore、Memorystore | KV、Durable Objects、Workers Cache |
| 物件儲存與 CDN | S3、CloudFront | Cloud Storage、Cloud CDN | R2、Cache／CDN |
| 網路與負載平衡 | VPC、NAT gateway、ELB | VPC、Cloud NAT、Cloud Load Balancing | Load Balancing、Tunnel、DNS |
| 身分與權限 | IAM | IAM | 帳號權限、Cloudflare One |
| 可觀測性 | CloudWatch | Cloud Logging、Cloud Monitoring | Workers Observability |
| 訊息佇列 | SQS | Pub/Sub | Queues |
| 資料分析 | Athena、Redshift | BigQuery | Analytics Engine、R2 SQL |
| 生成式 AI | Bedrock | Vertex AI 生成式 AI | Workers AI、AI Gateway、Vectorize |
| IaC | CDK、CloudFormation | Application Design Center | Terraform |

## 公平性規則

1. **同一組使用量。** 同一張使用量表、同樣的三情境。
2. **同等級的區域。** 都選離使用者最近、且所需服務都有的區域；某服務不在該區域，各家都記下替代區域與延遲影響。Cloudflare 改比資料位置的控制能力。
3. **同等級的託管程度。** 託管對託管，自架對自架。
4. **同樣的可用性。** 單可用區對單可用區，多可用區對多可用區。
5. **同樣的計價方式。** 主比較用隨需牌價；承諾折扣、Spot、credits 另列一欄。
6. **同樣的費用類別。** 各家都跑完 cost-estimation.md〈常漏的費用〉。
7. **同一天的價格。** 查詢日期相同或相近，寫在報告開頭。
8. **寫出無法對齊的差異。** 列在〈不可比的差異〉。
9. **比到 Cloudflare：** 另照 cloudflare.md〈跨雲比較〉。

## 比較矩陣

每格寫結論加證據編號或「推論」，不要只打分數。

| 面向 | AWS：方案 ○ | GCP：方案 ○ | Cloudflare：方案 ○（有比才放） | 差異是否影響決定 |
|---|---|---|---|---|
| 每月費用（低／可能／高） | | | | |
| 對照預算上限 | | | | |
| 區域與資料落地 | | | | |
| 延遲 | | | | |
| 維運負擔 | | | | |
| 團隊技能適配 | | | | |
| 擴充方式與上限 | | | | |
| 可用性與備援 | | | | |
| 安全與合規 | | | | |
| 鎖定程度與遷出成本 | | | | |
| 既有技術棧相容性 | | | | |
| 交付與交接難度（接案時） | | | | |

## 不可比的差異

列在矩陣下方：

- 只有一邊有的服務或功能。
- 計費粒度、免費額度、最低費用的差異。
- 因「未驗證」而無法比較的格子。

## 加權評分（選用）

只在使用者要求，或各家差異很接近時用：

- 權重照使用者在步驟 1 給的優先順序，不要自己訂。
- 權重與分數寫進報告；分數用腳本算。

## 結論寫法

- 先寫選哪一邊，再寫翻盤條件，例如「若團隊已熟悉 Kubernetes，改選 ○○」。
- 月費差距小於 10% 且其他面向相當：寫「各家都可行」，改由團隊熟悉度或既有帳號決定。
