# 跨雲比較

`compare` 模式用：步驟 2 查〈服務對照〉，步驟 5 照〈公平性規則〉填〈比較矩陣〉。目標：各家在同樣的條件下比。預設比 AWS 與 GCP；使用者要比 Cloudflare 時，三家一起比，或兩兩比較。

比到 Cloudflare 時，另讀 [cloudflare.md](cloudflare.md) 的〈跨雲比較注意事項〉。

## 服務對照

列候選時用來找各家的對應服務。只列名稱；文件連結與官方 skill 見各雲檔。名稱相近不代表功能、限制、計價相同，逐項查證。

| 領域 | AWS | GCP | Cloudflare |
|---|---|---|---|
| 虛擬機與輕量主機 | EC2、Lightsail | Compute Engine | 無（沒有 VM） |
| 容器與應用平台 | ECS、Fargate、EKS、Elastic Beanstalk | Cloud Run、GKE | Workers＋靜態資源、Containers |
| 無伺服器函式 | Lambda | Cloud Run functions | Workers、Workflows |
| 關聯式資料庫 | RDS、Aurora | Cloud SQL、AlloyDB | D1、Hyperdrive（連既有 PostgreSQL／MySQL） |
| NoSQL 與快取 | DynamoDB、ElastiCache | Firestore、Memorystore | KV、Durable Objects、Workers Cache |
| 物件儲存與 CDN | S3、CloudFront | Cloud Storage、Cloud CDN | R2、Cache／CDN |
| 網路與負載平衡 | VPC、NAT gateway、ELB | VPC、Cloud NAT、Cloud Load Balancing | Load Balancing、Tunnel、DNS |
| 身分與權限 | IAM | IAM | 帳號權限、Cloudflare One |
| 可觀測性 | CloudWatch | Cloud Logging、Cloud Monitoring | Workers Observability |
| 訊息佇列 | SQS | Pub/Sub | Queues |
| 資料分析 | Athena、Redshift | BigQuery | Analytics Engine、R2 SQL |
| 生成式 AI | Bedrock | Vertex AI 生成式 AI | Workers AI、AI Gateway、Vectorize |

## 公平性規則

1. **同一組使用量假設。** 各家用同一張使用量表、同樣的三情境。
2. **同等級的區域。** 預設都選離使用者最近、且所需服務都有提供的區域。台灣使用者先查 AWS、GCP 的台灣區域；某服務在台灣區域沒有，各家都記下替代區域與延遲影響。Cloudflare 沒有區域選擇，改比資料位置的控制能力（見 [cloudflare.md](cloudflare.md)〈跨雲比較注意事項〉）。
3. **同等級的託管程度。** 託管對託管、自架對自架。不要拿 AWS 的 VM 自架資料庫比 GCP 的全託管資料庫。
4. **同樣的可用性。** 單可用區對單可用區，多可用區對多可用區。
5. **同樣的計價方式。** 主比較用隨需（on-demand）牌價。承諾折扣、Spot、credits 另列一欄，不混進主比較。
6. **同樣的費用類別。** 各家都跑完 cost-estimation.md 的〈常漏的費用〉，一邊算了 NAT，其他邊也要算或寫「不需要」。
7. **同一天的價格。** 各家價格的查詢日期要相同或相近，寫在報告開頭。
8. **無法對齊的差異要寫出來。** 例如計費粒度不同（每秒 vs 每小時）、免費額度不同、某服務只有一邊有。列在矩陣下方的〈不可比的差異〉。

## 比較矩陣

每格寫結論加證據編號或「推論」，不要只打分數。

| 面向 | AWS：方案 ○ | GCP：方案 ○ | Cloudflare：方案 ○（有比才放） | 差異是否影響決定 |
|---|---|---|---|---|
| 每月費用（低／可能／高） | | |  | |
| 對照預算上限 | | |  | |
| 區域與資料落地 | | |  | |
| 延遲（到主要使用者） | | |  | |
| 維運負擔（人力、需要的技能） | | |  | |
| 團隊技能適配 | | |  | |
| 擴充方式與上限 | | |  | |
| 可用性與備援 | | |  | |
| 安全與合規 | | |  | |
| 鎖定程度與遷出成本 | | |  | |
| 既有技術棧相容性 | | |  | |
| 交付與交接難度（接案時） | | |  | |

## 加權評分（選用）

只在使用者要求，或各家差異很接近時用：

- 權重來自步驟 1 使用者給的優先順序，不要自己訂。
- 權重與分數寫進報告，讓使用者能改權重重算。
- 分數計算用腳本。

## 不可比的差異

矩陣下方列出：

- 只有一邊有的服務或功能（例如 Cloudflare 沒有 VM）。
- 計費粒度、免費額度、最低費用的差異。
- 某邊有「未驗證」項目，導致該格無法比較。

## 結論寫法

- 先寫在使用者的限制下選哪一邊，再寫翻盤條件，例如「若團隊已熟悉 Kubernetes，結論改為 ○○」。
- 差異在誤差內（例如月費差距小於 10%，且其他面向相當）：明說「各家都可行」，改由團隊熟悉度或既有帳號決定。
