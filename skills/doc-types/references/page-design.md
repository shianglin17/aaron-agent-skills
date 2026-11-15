# 頁面設計

成品是頁面（HTML、artifact）時，步驟 6 照這份。起點：[assets/skeleton/](../assets/skeleton/)。頁面規格照 `artifact-design`；修飾照 `impeccable`。

## 哪些內容做成圖

| 內容 | 做成 | 交給 |
|---|---|---|
| 3 步以上有先後，或有任一個分支 | 流程圖 | `diagram-design` |
| 3 個以上的東西彼此連接 | 架構圖或結構圖 | `diagram-design` |
| 狀態隨事件改變 | 狀態圖 | `diagram-design` |
| 同一個量跨時間，或跨 3 個以上類別比較 | 長條或折線 | `dataviz` |
| 部分占整體 | 堆疊長條 | `dataviz` |
| 只是列舉，項目之間沒有連接 | 清單 | 不畫 |
| 每項欄位相同，要逐格對照 | 表格 | 不畫 |
| 2 個以內的數字 | 句子 | 不畫 |

- 一張圖回答一個問題；圖前的 `h2` 寫那個問題。圖不取代文字結論。圖放進 `.fig`；SVG 要有 `<title>`、`<desc>`。

## 每種類型用哪些元件

| 類型 | 元件 |
|---|---|
| 狀況報告 | `.brief`、`.legend`＋`.items`、`.bullets`（正常項）、`.tbl.num`（數字明細）、`.stale` |
| 方案頁 | `.brief`（結論寫建議與信心）、`.options`、`.basis`、`details.more`（明細） |
| 決策紀錄 | `.kv`（狀態、日期、決定者）、`.tbl`（考慮過的選項）、`.bullets`（得到、付出） |
| 解釋 | `.fig`（主圖）、`.bullets`、`details.more` |
| 教學、操作指南 | `.steps`（編號步驟）、`.output`（會看到的結果）、`.verify`＋`.checks`（確認做完）、`details.more`（常見問題） |
| 參考 | `.tbl.stack.fields`（一列一個欄位：名稱、型別、預設、說明）、`details.more` |

## 第一屏

- 狀況報告、方案頁依序：`.masthead`（`h1`＋日期）→ `.brief`（結論，下面左右兩欄：要讀者做的事｜風險）。
- 要做的事與風險用 `.steps` 編號，正文才能寫「第 2 件」「風險 1」回指。
- 沒有要做的事或風險：那一欄寫「不用處理」（`.none`）。
- 第一屏不放圖、表、數字摘要。其他類型：`.masthead` 後接一句結論，再照骨架。

## 版面硬規則

- 內容欄最寬 800px；內文每行最多 45 個中文字（`--measure: 45em`）。
- 字級只有 5 層：`h1`、`h2`、內文 16px、輔助 14px（`.note`、`.meta`）、標籤 12.5–13px（表頭、狀態標記）。
- 字型只用三個 token：標題 `--f-display`、內文 `--f-body`、程式碼與檔名 `--f-mono`。
- 強調色只有 `--accent`，只用在連結、要讀者做的事、建議的選項。
- 狀態色只用在狀態標記、圖例、狀態欄表頭的圓點，而且一定附文字；其他文字用 `--ink`、`--ink-2`、`--muted`。
- 區塊間距只用 `.page` 的 gap（40–56px）；元件不加外距。
- 加框線與底色的只有：`.brief`、`.items`、`.option`、`.verify`、`.tbl`、`.fig`、`details.more`。段落與清單不加框。
- 表格：文字欄最多 3 欄；數字矩陣最多 7 欄（1 個文字欄＋6 個數字欄）。超過就拆表，或收進 `details.more`。
- 390 寬：頁面不水平捲動；3 欄文字表用 `.tbl.stack`；數字矩陣整張看得到，不捲動。
- 數字欄靠右；0 加 `.zero`；合計加 `.total`。
- 有文字標籤的 SVG 可以在 `.fig .scroll` 裡橫向捲動；長條圖這類能縮放的圖加 `.fit`。
- 可點的目標（`summary`、按鈕）至少 44px 高。
- 頁面專用的樣式超過 20 行：補進樣板，不留在單頁。
- 不用：emoji、裝飾插圖、漸層背景、標題上方的小標（eyebrow）、超過 1px 的彩色側邊線。

## 從樣板起手

- 複製 `page.html`，刪掉用不到的區塊。HTML 註解寫了每個元件的用法。
- 本機檔用 `<link>` 引 `page.css`。發布成 artifact：`scripts/build_page.py` 內嵌 `page.css`，拿掉 `<!doctype>`、`<html>`、`<head>`、`<body>`。
- `page.css` 的 `shared:start`–`shared:end` 區塊跟 `architecture-site` 的 `shared.css` 相同；要改就兩邊一起改。
- 狀態用語照 [structure-rules.md](structure-rules.md)〈狀態用語〉定；每個值對一個 tone：`.st.ok`、`.st.warn`、`.st.bad`、`.st`（不確定、未開始）。
- 要讀者處理的狀態項加 `.need`，「要處理嗎」那格加 `.yes`；「資料只到某天」的標記用 `.stale`。

## 視覺驗收

先跑 `scripts/check_page.py`（title、token、深色模式、外部資源、本機路徑、emoji、連結）。再截 4 張全頁圖：寬 1280 與 390，淺色與深色。開沒有 viewport meta 的 artifact 檔時，390 寬不開手機模擬，不然會用 980 寬排版。

```
視覺驗收：
- [ ] 1280×900 第一個視窗看得到結論、要做的事、風險
- [ ] 要讀者處理的項目不讀文字也找得到（編號、.need 底色）
- [ ] 390 寬沒有水平捲動（scrollWidth 等於 clientWidth）
- [ ] 390 寬表格讀得完：數字矩陣整張可見，文字表變成卡片
- [ ] 深色模式：文字都讀得到，4 種狀態分得出來
- [ ] 字型有載入，不是系統字替代
- [ ] 收合區點得開、收得回
```

- 4 張截圖一起交給審查者，見 [review.md](review.md)。
