# IaC 規則

setup 模式用；任何模式要動雲端資源時都照這份。

## 變更方式

| 情況 | 規則 |
|---|---|
| 資源由 Terraform 管理 | CLI 只做唯讀操作（查狀態、列資源、看設定）。所有變更一律走 Terraform，流程見〈執行〉。 |
| 沒用 Terraform 的簡單情況 | 可以用 CLI 寫入，例如 `wrangler deploy`、`gcloud run deploy`。執行前先列出完整指令，等使用者確認。 |

- 用 Terraform 的情況：多環境，或需要版本控管、可重現的設定。
- 資源由 Terraform 管理時，不用 CLI 改動，避免產生 drift。

## IaC 工具

- 預設用 Terraform。
- 各雲原生 IaC 可以當對照；skill 名稱見雲檔的〈IaC〉列。

## 執行

用 Terraform 時：

1. 產生計畫檔，列出要新增、修改、刪除的資源：
   - 新增或修改：`terraform plan -out=tfplan`
   - 刪除全部資源：`terraform plan -destroy -out=tfplan`
2. 等使用者確認。
3. 確認後跑 `terraform apply tfplan`，只套用使用者確認過的計畫。

- 不碰正式環境，除非使用者明確指定。

## Terraform skill

只用 [hashicorp/agent-skills](https://github.com/hashicorp/agent-skills) 的這 5 個：

| Skill | 用途 |
|---|---|
| `terraform-style-guide` | 撰寫風格與檔案結構 |
| `terraform-test` | 寫與跑 `.tftest.hcl` 測試 |
| `terraform-search-import` | 找出既有資源並匯入 |
| `refactor-module` | 重構成模組 |
| `terraform-stacks` | Terraform Stacks |

- 只在有 IaC 的專案裡裝，用專案層（不加 `-g`）：

  ```bash
  npx skills add hashicorp/agent-skills/plugins/terraform/skills/<名稱>
  ```

- 授權是 MPL-2.0：不要複製進 repo。
- 不用寫 provider 的 skill（`provider-*`、`new-terraform-provider` 等）與 Packer 的 skill。
- 不預設裝 [terraform-mcp-server](https://github.com/hashicorp/terraform-mcp-server)。provider 參數常寫錯時，才在專案層加。
