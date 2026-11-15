---
name: doc-types
description: "Sets the content structure of a document, decision record (ADR), proposal, comparison, status report, or single page meant to be read, before writing or when restructuring one: reader and task, one doc type, skeleton, acceptance questions, reviewer check. Not for wording, diagrams, visual design, dashboards, or multi-page architecture sites. 寫文件、ADR、方案頁、比較、狀況報告前先定類型與骨架。"
argument-hint: "[類型] <主題>"
---

# Doc Types

寫文件、決策紀錄或做頁面之前，先定四件事：讀者要完成什麼、哪一種類型、骨架、驗收題。寫完派審查者用驗收題檢查，再發布。

這個 skill 只管內容結構：放什麼、照什麼順序、怎麼驗收。

## 何時用

| 情況 | 用什麼 |
|---|---|
| 寫給人讀的文件、決策紀錄、方案頁、狀況報告、單頁 artifact | 這個 skill |
| 把既有程式碼做成多頁架構說明站 | `architecture-site` |
| 只改寫用詞、句子，結構不動 | `iso-24495` |
| 架構、流程、時序、ER 等圖 | `diagram-design` |
| 資料圖表 | `dataviz` |
| 版面、色彩、字型、互動 | 各自的設計 skill |

## 流程

複製這份清單，逐步打勾：

```
文件進度：
- [ ] 1. 讀者與任務：一句話；不到 5 件事就用對話回覆
- [ ] 2. 類型：選一種，照骨架
- [ ] 3. 驗收題：3–5 題
- [ ] 4. 寫：照結構規則
- [ ] 5. 自查：照結構規則的檢查表
- [ ] 6. 審查：派只看得到成品的審查者
- [ ] 7. 修一輪，發布
```

### 步驟 1：讀者與任務

動筆前寫下這一句：

> 讀者是＿＿，打開這份東西要完成＿＿。

- 任務只寫一件。寫不出來，先問使用者，不要動筆。
- 數一數讀者要看的事：每個結論、每件要他做的事、每個風險、每個選項，各算一件。
- 不到 5 件事：用對話回覆，不做頁面、不開文件。使用者指定要文件或頁面時照做。
- 列出要用到的事實與數字。手上沒有的：先問使用者或去查；還是沒有，就寫「沒有紀錄」，並在結論旁標信心程度（高／中／低）。
- 重做或更新既有文件：數字從明細重算，不照抄舊版。跟既有版本不同時，在明細旁寫一句差在哪。

### 步驟 2：選一種類型

一份只做一種。別的類型的內容放連結，或收進可收合的區塊。

| 類型 | 讀者要完成的事 |
|---|---|
| 教學 | 照著做一遍，學會一件新事 |
| 操作指南 | 已經會基本操作，要完成一件具體的事 |
| 參考 | 查一個事實：參數、欄位、設定、限制 |
| 解釋 | 理解為什麼這樣設計、背景是什麼 |
| 決策紀錄 | 知道選了什麼、為什麼、付出什麼 |
| 方案頁 | 在幾個選項裡做決定 |
| 狀況報告 | 知道現在怎樣、哪裡要他處理 |

- 前四型來自 Diátaxis，出處與界線見 types.md。
- 每型的使用時機、骨架、不放什麼：讀 [types.md](references/types.md)。
- 決策紀錄的模板與標準：讀 [decision-record.md](references/decision-record.md)。

### 步驟 3：驗收題

寫 3–5 題讀者讀完應該答得出來的問題。

- 題目從步驟 1 的任務推出來，例如「要選哪個方案、代價是什麼？」「這週哪兩件事要我處理？」。
- 每題的答案要在成品裡找得到，而且說得出在哪一節。
- 不用「全部涵蓋」當驗收。

### 步驟 4–5：寫與自查

寫之前讀 [structure-rules.md](references/structure-rules.md)，寫完照它的檢查表逐條打勾。規則涵蓋：第一屏、章節順序、同一層的項目、不放過程、一個事實只出現一次、狀態用語。

- 第一屏只放結論、要讀者做的事、還沒解決的風險。
- 章節照讀者的問題排，不照做事的順序排。
- 格式與發布的地方照使用者指定。這個 skill 不選格式；版面交給設計 skill。

### 步驟 6–7：審查與修改

派一個審查者（另一個 agent 或人），只給它成品，不給對話、草稿或你的說明。

- 給它：成品、步驟 1 的那句話、驗收題。
- 照它的回報修一輪，再發布。
- 給什麼、不給什麼、指示範本、沒辦法另派審查者時怎麼做：讀 [review.md](references/review.md)。

## 護欄

- 數字附出處與日期；沒量過寫「沒有紀錄」，不要估。
- 不寫秘密、帳密、個資、本機路徑。
- 用詞與句子交給 `iso-24495`。

## 參考檔

| 檔案 | 何時讀 |
|---|---|
| [types.md](references/types.md) | 步驟 2：選類型、照骨架 |
| [decision-record.md](references/decision-record.md) | 類型是決策紀錄時 |
| [structure-rules.md](references/structure-rules.md) | 步驟 4–5：寫與自查 |
| [review.md](references/review.md) | 步驟 6：派審查者 |
