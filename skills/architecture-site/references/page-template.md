# 頁面骨架

建頁面、抽共用檔時照這份。起點：[assets/skeleton/](../assets/skeleton/)。頁面規格（title、字型、外部 script、深色模式）照 `artifact-design`，這裡不重寫。

## 每頁的結構

依序：

| 區塊 | 內容 |
|---|---|
| `nav` | 各頁的相對連結；目前頁加 `aria-current="page"` |
| `header` | `h1`（問句或「X 怎麼 Y」）、一句說明、3–4 個大數字 |
| `section` × N | `h2`、主圖、說明面板、`<details>` |
| `footer` | 更新日期、`行號以 commit <7 碼> 為準`、數字的查詢方式、「示意」聲明 |

- 首頁另有：全景圖、主題頁清單（每項一句話、依建議閱讀順序編號）、「數字出處」表。
- 每頁一張主圖。第二張圖只在回答同一個問題的另一面時才加。
- 頁數的建議：首頁加 5–8 個主題頁。

## 共用檔

頁數超過 5 時，共用的東西抽出來：

| 檔案 | 放什麼 |
|---|---|
| `shared.css` | 色票 token、版面、nav、圖的節點與連線樣式、面板、`<details>`、表格 |
| `shared.js` | `PAGES`（頁面順序與 nav 標籤，只寫在這裡）、`render()`、圖文連動 |
| 各頁 `.html` | 頁面內容、主圖 SVG、面板資料 |

- 頁數 5 以內可以全部內嵌，但面板資料仍照下面的結構寫。
- 發布成 claude.ai artifact 時：主頁（`index.html`）不寫 `<!doctype>`、`<html>`、`<head>`、`<body>`；其他頁要寫完整的文件骨架。細節照 `artifact-design`。

## 色票 token

在 `:root` 定義，深色模式照 `artifact-design` 的三段寫法。語意色固定三組，加一組灰色給計畫中的東西：

| token | 意思 | 用在 |
|---|---|---|
| `--ours`、`--ours-ink`、`--ours-tint` | 自家程式 | 節點、連線、標籤 |
| `--ai`、`--ai-ink`、`--ai-tint` | 模型或第三方 AI | 同上 |
| `--ext`、`--ext-ink`、`--ext-tint` | 外部服務（資料庫、搜尋引擎、雲端服務） | 同上 |
| `--plan`、`--plan-tint` | 未實作、待決定 | 虛線節點、灰色標籤 |

- 元件只用 token，不寫死顏色。
- 三組語意色在淺色與深色都要能分辨；圖例一定要有。

## 面板資料

每頁的面板資料寫在一個 JSON 區塊，不要散在 HTML 各處：

```html
<script type="application/json" id="panel-data">
{
  "orders-api": {
    "eyebrow": "後端",
    "group": "ours",
    "status": "待決定",
    "title": "訂單 API",
    "lede": "建立訂單並寫進 orders 表。付款成功前，訂單狀態是 pending。",
    "kv": [{"k": "逾時", "v": "30 秒", "code": "app/config.py:ORDER_TIMEOUT"}],
    "details": "重試規則、冪等鍵的做法。",
    "src": ["app/orders.py:42"]
  }
}
</script>
```

| 欄位 | 必填 | 規則 |
|---|---|---|
| key | 是 | 跟圖上的 `data-key` 相同 |
| `eyebrow` | 否 | 所在層或區塊 |
| `group` | 是 | `ours`、`ai`、`ext` |
| `status` | 否 | 只給未實作、待決定的項目；顯示成灰色標籤 |
| `title` | 是 | 白話名稱 |
| `lede` | 是 | 最多 3 句、約 120 字 |
| `kv` | 否 | 最多 3 項；程式常數加 `code: "檔名:常數名"` |
| `details` | 否 | 點開才看的細節 |
| `src` | 否 | `檔名:行號` 的清單 |

- `render()` 只從這份資料組面板；不在 JS 裡寫內容文字。
- 預設顯示的項目：在 `<svg>` 上寫 `data-default="<key>"`。
