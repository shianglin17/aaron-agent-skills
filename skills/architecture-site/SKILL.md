---
name: architecture-site
description: "Turns an existing system (a repo with code) into a multi-page, diagram-led architecture site or artifact: one reader question per page, linked diagram and side panel, conclusions only, code line refs pinned to a commit. Use only for a multi-page explainer of an existing codebase; for a single architecture diagram use diagram-design. 架構說明站、多頁架構頁、系統導覽、把 repo 做成架構說明。"
argument-hint: "[new|update] <repo 或主題>"
---

# Architecture Site

把既有系統做成多頁、以圖為主的架構說明站：每頁回答讀者一個問題，圖和說明面板連動，只放現況與結論。

## 何時用

| 情況 | 用什麼 |
|---|---|
| 把有程式碼的系統做成多頁說明站或 artifact | 這個 skill |
| 更新已發布的架構說明站 | 這個 skill（`update`） |
| 只要一張架構圖、流程圖、時序圖、ER 圖 | `diagram-design` |
| 只要一張資料圖表 | `dataviz` |
| 還沒有程式碼的新系統設計 | 不用這個 skill |

## 1. 解析參數

輸入：`$ARGUMENTS`，格式 `[模式] <repo 或主題>`。

- `new`：第一次做。從步驟 2 開始。
- `update`：程式或資料模型改了，要更新既有站。跳到步驟 7。
- 沒寫模式：找得到既有站就是 `update`，否則 `new`。
- 先問讀者是誰（工程師、主管、承辦人），問完停下等回答。

## 2. 流程

複製這份清單，逐步打勾：

```
架構說明站進度：
- [ ] 1. 讀者問題清單：5–8 題，每題一頁
- [ ] 2. 一頁原型：給使用者確認方向，停下等回答
- [ ] 3. 全做：照 page-template.md 與 content-rules.md
- [ ] 4. 檢查：跑 scripts/check_site.py 與 scripts/smoke.py
- [ ] 5. 審查：獨立 reviewer，工程師與主管各一次
- [ ] 6. 發布：照 verification.md〈發布〉
- [ ] 7. 維護：程式改了就更新受影響的頁
```

### 步驟 1：讀者問題清單

- 列讀者要回答的 5–8 個問題，每題一頁。
- 頁標題用問句或「X 怎麼 Y」，例如「一則訊息怎麼走？」「資料怎麼進來？」。
- 首頁是全景圖加主題頁清單：每項一句話，標出建議閱讀順序。
- 每題寫下驗收句：「讀完這頁，讀者能回答＿＿」。
- 讀程式碼找答案；只讀跟這些問題有關的部分。

### 步驟 2：一頁原型

- 第一次做或大改版：先做首頁或最重要的一頁，給使用者看。
- 確認方向（問題、圖的種類、詳細程度）後才全做。
- 從 [assets/skeleton/](assets/skeleton/) 複製骨架開始。

### 步驟 3：全做

- 內容照 [content-rules.md](references/content-rules.md)。
- 頁面結構照 [page-template.md](references/page-template.md)。
- 圖與互動照 [diagrams-and-interaction.md](references/diagrams-and-interaction.md)。

### 步驟 4–7

照 [verification.md](references/verification.md)。

## 3. 引用分工

這些事交給其他 skill，不在這裡重寫：

| 事項 | skill |
|---|---|
| 架構、流程、時序、ER、狀態等圖 | `diagram-design` |
| 資料圖表：筆數、延遲、費用、token | `dataviz` |
| 頁面規格：title、色票、深色模式、外部 script、手機寬度 | `artifact-design`、`artifact-diagramming` |
| UI 修飾、無障礙審查 | `impeccable` |
| 白話改寫 | `iso-24495` |

## 4. 護欄

- 只寫現況與結論；過程、歷程、決定編號放決策文件，頁面連過去。
- 不在頁面寫個資、帳密、金鑰、內部網址、本機路徑、session ID。發布前照全域規則逐行掃一次。
- 數字都要有出處與查詢日期；沒量過寫「沒有紀錄」，不要估一個數字填進去。
- 現況與計畫分開；待決定、未實作用灰色標籤。
- 不做 3D、不做無限畫布；用「點一下往下一層」。
- 大改版或第一次做，先給原型，不要直接全做。
- 已發布的站固定發布到同一個網址；發布前先讀線上現版。
- 輸出用繁體中文（台灣用語），結論先講。

## 5. 參考檔

| 檔案 | 何時讀 |
|---|---|
| [content-rules.md](references/content-rules.md) | 步驟 1、3：寫任何文字或數字時 |
| [page-template.md](references/page-template.md) | 步驟 2、3：建頁面、抽共用檔 |
| [diagrams-and-interaction.md](references/diagrams-and-interaction.md) | 步驟 2、3：選圖的種類、做圖文連動 |
| [verification.md](references/verification.md) | 步驟 4–7 |
| [assets/skeleton/](assets/skeleton/) | 步驟 2：複製當起點 |
| [scripts/check_site.py](scripts/check_site.py) | 步驟 4：內容檢查 |
| [scripts/smoke.py](scripts/smoke.py) | 步驟 4、6：瀏覽器檢查 |
