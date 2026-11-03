---
name: cloud-architect
description: "One entry for AWS, Google Cloud (GCP), and Cloudflare: learn a service, evaluate and price options, design an architecture, set up resources with Terraform or IaC. 雲端服務了解、選型估價、架構設計、設定；AWS GCP Cloudflare。"
argument-hint: "[learn|eval|design|setup] [aws|gcp|cloudflare] <主題>"
---

# Cloud Architect

AWS、GCP、Cloudflare 的單一入口。分四個模式：了解服務、評估、設計、設定。

## 1. 解析參數

輸入：`$ARGUMENTS`，格式 `[模式] [雲] <主題>`。

- 模式：`learn`、`eval`、`design`、`setup`。沒寫就從描述推斷；推斷不出就問。
- 雲：`aws`、`gcp`、`cloudflare`，可列多家。沒寫就從主題推斷。
- 主題空白：先問要做什麼，不要自己挑題目。

## 2. 路由

1. 讀該雲的雲檔。雲檔是官方 skill 與文件的目錄：只列名稱、用途、連結。
2. 先讀該雲負責選型的入口，再依領域查雲檔的目錄。

| 雲 | 選型入口 | 取用方式 | 雲檔 |
|---|---|---|---|
| AWS | `architect-for-startups` | AWS Knowledge MCP：`aws___search_documentation` 找 `skill_name`，再 `aws___retrieve_skill` | [aws.md](references/aws.md) |
| GCP | `google-cloud-solution-architecture` | 讀 repo 連結，見雲檔 | [gcp.md](references/gcp.md) |
| Cloudflare | `cloudflare`（依需求選產品） | 讀 repo 連結，見雲檔 | [cloudflare.md](references/cloudflare.md) |

- 官方 skill 依需要讀取，不安裝。例外：Terraform skill，見 [iac.md](references/iac.md)。
- 官方 skill 當線索；事實照 [verification.md](references/verification.md) 查證。
- 多家雲：每家各讀雲檔，對應服務查 [compare.md](references/compare.md) 的〈服務對照〉。

## 3. 模式

### learn：了解服務

照這個格式回答：

| 項目 | 內容 |
|---|---|
| 用途 | |
| 限制 | 配額、區域、GA 或 Preview |
| 計價方式 | 計費單位與免費額度；不需要算總額 |
| 常見的坑 | |
| 其他雲的對應服務 | 查 compare.md〈服務對照〉 |

Aaron 要保存時，用 `log-knowledge` 存進 `~/aaron-hq/knowledge/`。

### eval：評估、選型、估價

複製這份清單，逐步打勾：

```
評估進度：
- [ ] 1. 釐清需求與限制：照 discovery.md 問；問完停下，等回答
- [ ] 2. 列候選
- [ ] 3. 逐項查證：照 verification.md
- [ ] 4. 估成本：照 cost-estimation.md
- [ ] 5. 比較與風險
- [ ] 6. 出報告：照 report-template.md
```

- 列候選：
  - 每家 2–3 個，涵蓋不同託管程度。雲檔另有光譜時照雲檔。
  - 一定要有「最簡單可行」的候選。
  - 每個候選寫一行理由，連回步驟 1 的限制。
  - 不符合硬限制的候選直接淘汰，寫出原因。
  - 使用者給既有架構（圖、IaC、帳單）時，候選包含「維持現狀」。
- 比較與風險：
  - 逐個候選檢查 Well-Architected 六面向：營運、安全、可靠性、效能、成本、永續。
  - 寫出主要風險與緩解：鎖定程度、團隊技能落差、維運人力。
  - 多家雲：照 compare.md。

### design：架構設計

1. 照 [design.md](references/design.md) 的清單，每項寫出設計，或寫明不需要的理由。
2. 跑該雲的 Well-Architected 審查 skill（見雲檔），把發現的問題改回清單。
3. 用 `diagram-design` 畫架構圖。

### setup：設定資源

照 [iac.md](references/iac.md)。

## 4. 護欄

- 每個模式都照 [iac.md](references/iac.md) 的規則操作雲端資源；官方 skill 的指令也一樣。
- 不複製官方 skill 的內容；用連結或 MCP 即時取用。
- 不在輸出裡寫帳號 ID、金鑰、內部網址；使用者提供的也要遮蔽。
- 使用者的硬限制（預算上限、資料落地）與建議衝突時，明說衝突，不要默默放寬。
- 輸出用繁體中文（台灣用語），結論先講。

## 5. 參考檔

| 檔案 | 何時讀 |
|---|---|
| [aws.md](references/aws.md)、[gcp.md](references/gcp.md)、[cloudflare.md](references/cloudflare.md) | 每個模式，涉及該雲時 |
| [verification.md](references/verification.md) | 要寫出任何事實時 |
| [compare.md](references/compare.md) | 多家雲；learn 的對應服務 |
| [discovery.md](references/discovery.md) | eval 步驟 1 |
| [cost-estimation.md](references/cost-estimation.md) | eval 步驟 4 |
| [report-template.md](references/report-template.md) | eval 步驟 6 |
| [design.md](references/design.md) | design |
| [iac.md](references/iac.md) | setup |
