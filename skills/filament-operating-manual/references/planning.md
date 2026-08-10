# Planning — how to build `plan.yaml`

`plan.yaml` is the single source of truth for the manual; the Google Doc is a render of it. This file is the **judgment layer** — what to document and how to structure it. Read the **Manual structure model** and **Voice & vocabulary** in `SKILL.md` first; they define the four levels, the "special" test, and how to write for the reader.

This file is used both when building `plan.yaml` from scratch and when editing it during an incremental change. The orchestration around it — when it runs and how it reaches the Doc — lives in `build.md` and `edit.md`.

## How to plan a resource's H2s and H3s

The **Manual structure model** in `SKILL.md` defines the four levels and the "special" test. This is the *procedure* for applying it to each resource.

For every resource (H1), produce its tree in two passes:

**Pass 1 — screens → H2 (mechanical, from the Resource code).** List every navigable screen the resource actually has, in order:

1. 列表頁 — always.
2. 編輯頁 — when the resource has an edit form (create reuses it; plain 新增 is stock, not its own H2).
3. 關聯子頁 — one H2 per separate related-records manager (`RelationManager` / custom `ManageRelatedRecords` page with its own table + 附加/新增/移除).
4. 檢視頁 — only when it exists and hosts special data or actions (some resources expose a view page instead of an edit page).
5. Workflow/action screen — when create, or some action, is a non-trivial multi-step workflow, make it its own H2, named by the action.

A `Tabs` component **inside** the edit form is **not** an H2 — special fields in those tabs become H3 cases under 編輯頁.

**Pass 2 — cases → H3 (judgment, the "special" test).** For each screen, add one H3 per teachable special point: special data semantics, a conditional field, a backend↔frontend correspondence, or a resource-specific button-action with its own modal.

- **Plain screen → no H3.** A standard 列表頁 / standard 編輯頁 with nothing non-obvious gets one clean screenshot directly under the H2 and stops there.
- **Don't** make stock CRUD (新增/編輯/刪除/搜尋/排序/分頁) an H3.
- One distinct point = one H3. Don't bundle two unrelated rules into one H3, and don't split one rule across two.

**Naming:** name the H2 by the screen plainly (「列表頁」「編輯頁」「<關聯項目>(子頁)」), or by the action when the screen is a workflow (「新增<項目>」). Name the H3 by the rule/action it teaches (「<某狀態>→前台不顯示」「<某動作>」「<某筆紀錄>作為其他紀錄的預設來源」). Don't repeat the resource name — H1 already carries it.

**Number every level.** H1, H2 **and H3** all carry a `N. ` sort-number prefix that restarts within its parent (H2 restarts per H1; H3 restarts per H2): `### H1: 1. 據點管理` → `#### H2: 2. 編輯頁` → `##### H3: 1. <第一個案例>` `##### H3: 2. <第二個案例>`. This keeps the Doc outline scannable and referenceable at every level. (Image-folder slugs are a separate matter — those carry no sort prefix; see "Image folder structure".)

## What a SUBTITLE says

**Every plain H2 and every H3 has a SUBTITLE — required. A "container" H2 that only groups H3 cases omits it** (a SUBTITLE wedged between an H2 and its first H3 floats like a mini-title and competes with the headings; the H3 children carry the specifics). **The one exception** is a screen-wide scope fact — 此頁無新增鈕、只能檢視與取消 — which no H3 can host because it belongs to the whole screen and no screenshot can show an absent button. A container H2 with such a fact carries a SUBTITLE stating just that, in one short clause. One concise sentence; never a description of layout. What it says, in **priority order**:

1. **If the screen's data surfaces on the public frontend** (a public API / page consumes it) → state that correspondence: 「對應前台『X』」/「管理前台『X』的內容」. **Confirm it against real evidence** (the API routes / the rendered public page) — never guess a frontend mapping from a field or model name.
2. **If it's backend-only** (no frontend correspondence) → state its **purpose**: what you manage here.
3. **Append the operation scope when it deviates from standard full CRUD** (「…不可刪除」「只有檢視與取消」). Restrictions are the high-value part — an absent button can't be seen in the screenshot. Listing the stock operations that *are* present (可新增/編輯/刪除) is allowed but low-value.

Under an **H3**, the SUBTITLE states the specific rule that case teaches.

**Login-screen exception — record the capture source.** The first screen (登入畫面 / entry screen) is the one place capture-source meta is allowed in reader-facing prose. Its SUBTITLE records where the manual was shot and the test account, in the form: `測試網址：<ADMIN_URL>；測試帳號：<帳號>；密碼請向管理者取得`. Never write a password into `plan.yaml` or the Doc. Every other SUBTITLE stays free of capture meta per the voice rules in `SKILL.md`.

**SUBTITLE vs annotation — different layers, never duplicate the same sentence:**
- **SUBTITLE** = the purpose/rule in prose, read in the document flow; not tied to a screen location.
- **Annotation** = a short spatial pointer on the screenshot, tied to an element; only for special / non-obvious things — **never for stock CRUD buttons**.

Good:
- 「對應前台『<X>』列表;停用後前台不顯示。」
- 「管理後台登入帳號;不可刪除系統管理員。」
- 「『<某筆>』是其他紀錄欄位空白時的預設來源。」

Bad (describes the screen / layout):
- 「這個畫面是一個列表，可以新增和編輯。」
- 「上方有 Tab，下方有保存按鈕。」

**When SUBTITLE describes conditional behaviour, be specific about the condition.** Generic「可取消狀態」、「特定情況下」 doesn't teach anything; the user has to guess. Write the actual rule:

- ❌ 「只能在『特定狀態下』執行」
- ✅ 「只能在『未被處理過』且『日期晚於今天』時執行」

If you can't state the rule precisely, read the source / form schema until you can.

**Don't hard-list frontend content values** as if they were part of the manual rule:

- ❌ 「前台分類選單寫死為固定三類（A / B / C）」
- ✅ 「前台分類選單為固定三類」（讀者看畫面就知道是哪三類；內容也可能改）

The manual teaches the **rule**, the screenshot shows the **current data**.

## Ground every claim — never infer (the evidence gate)

The structure is built from **evidence**, not inference. This is the main guard against hallucination, because the model won't read deep and will happily invent significance for things it only saw in passing.

- **H2 (screens) are enumerated from code** — `getPages`, RelationManagers, form `Tabs`. These are facts. Don't add a screen that isn't registered.
- **Every H3 (special case) must cite its evidence** — a concrete code construct (a disabled/added action, a custom action class, a `->visible()` / conditional, a relationship, a validation rule) **OR** a behaviour you actually saw in the browser. **A form tab or field merely existing is NOT evidence that it's special** — most tabs are ordinary editing and earn no H3.
- **Frontend-correspondence claims (「→ 前台 X」, and the frontend half of a SUBTITLE) must be confirmed against the actual frontend** — its API routes or the rendered public page — never inferred from a field/model name.
- **A claim must be grounded before it enters `plan.yaml`.** Code proves structure; for anything code can't show — what actually renders, what a tab really contains, whether/where data surfaces on the frontend — **open the browser and confirm first**. Nobody checks the plan before it is rendered, so an unverified claim goes straight into the finished manual — grounding is the only thing standing between a guess and the reader.
- If you can't ground a claim, **verify it or leave it out — never assert it.**

## Annotations

Annotations are red callouts on screenshots, labelled with **operational instruction or non-obvious explanation**.

**Box the conceptual unit, not the bare label.** An annotation frames the **smallest thing that fully contains its subject and nothing unrelated**: one field's wrapper (label + input together) for a field-level note, the common section / fieldset for a set of fields that act as one unit, or the whole section for an area-level note. Boxing the bare label reads as noise (too small); boxing across unrelated content misleads (too big); when unsure, prefer the enclosing container over the inner element. The **concrete target expression for each tier lives in `screenshots.md → Box extent`** — that is where box extent is actually decided. Keep this (planning) layer free of framework selectors.

**Never annotate:**

- Filament-stock UI: 列表的 新增 / 編輯 / 搜尋 / 排序 / 篩選 / 分頁、頁面標題、breadcrumb、Tab 列本身
- Form labels that already display their own text. Standing 「名稱欄位」on a field labelled 「名稱」 is noise.
- A whole section just because it exists. The header text already labels it.
- The fact that something is a Tab / Section / Repeater. Users have eyes.

**Annotate only when** one of these is true:

- The mark explains a **step** in a workflow: 「① 先選<某選項>」「② 從這裡搜尋」.
- The mark points at an action / element with **non-obvious effect**: 「取消此格，該角色看不到此資源」「拖拉這個會改前台顯示順序」.
- The mark **maps backend ↔ frontend**: write the frontend reference in user terms, not a templated URL.
- The mark identifies an element that **only appears under certain conditions**: 「頂層分類才有此欄位」.

If you can't write a one-line reason that's not "this is where X is", drop the annotation.

## Multi-shot patterns

One shot per H2/H3 is the default. Use multiple only when the story is genuinely sequential or comparative:

| Pattern | Shots |
|---|---|
| **Sequenced workflow** | ① 入口按鈕；② 表單畫面（多個 step annotation）；③ 確認頁 |
| **Cause → effect** | ① 後台設定；② 前台呈現 |
| **Action confirmation** | ① action 按鈕位置；② 確認彈窗 |
| **Apply template** | ① 套用按鈕；② 套用後表單已填好 |
| **Permission demo** | ① 權限編輯頁標出某 toggle；② 取消勾選後的側邊欄/列表變化；③ 不同 toggle 對應的不同變化 |

If two ideas share the same screen state, one screenshot with two annotations beats two screenshots.

## Image folder structure

```
{IMAGE_DIR}/<h1-slug>/<h2-slug>/[<h3-slug>/]NN.png
```

- A **plain screen** (H2, no H3) puts shots at `<h1-slug>/<h2-slug>/NN.png`. A screen **with H3 cases** puts each case's shots under its own `<h3-slug>/` folder.
- Slugs are kebab-case from H1 / H2 / H3 keywords, and **match the resource's own slug where one exists** (`resource-a`, `resource-b-categories`) so a folder maps 1:1 to its route. **Don't add sort-number prefixes** — chapter order lives in `plan.yaml`, not the folder tree; numbering only couples folder names to position and breaks on reorder.
- File numbering `01.png`, `02.png`, ... in shot order.
- Use **paths relative to `<MANUAL_DIR>`** in `plan.yaml` (e.g. `image/resource-a/list/01.png`). NEVER write absolute paths — `plan.yaml` is committed to the repo, and an absolute path leaks the local username / home directory. Resolve to absolute only in-memory at capture time by prefixing `<MANUAL_DIR>`.

## Plan file format

`<MANUAL_DIR>/plan.yaml` is a nested tree that mirrors the manual's own hierarchy: **tab → resource → screen → (case) → shot**. Keep it operation-focused. **Don't paste code paths, route names, or model schemas into the reader-facing prose** (`subtitle` / `annotate` / `name`). Don't add change logs, version notes, or meta-commentary.

**Ordering is positional.** Headings carry no stored number — the `N.` prefixes in the Doc are generated at render time from list order. Reordering a list reorders the manual; there is no second number to keep in sync.

Each level's keys:

| `tabs[].name` | The Filament navigation group, verbatim |
| `.resources[].name` | One resource (H1) |
| `.screens[].name` | One screen (H2), plus `subtitle`, `url`, `record` |
| `.screens[].cases[].name` | One teachable case (H3), plus `subtitle`; may override `url` / `record` |
| `.shots[].file` | Screenshot path, plus `annotate`, `targets`, `pre_actions`, `mask`, `capture`, `pii` |

A screen either carries `shots` directly (a **plain** screen) or `cases` (a **container** screen), following the SUBTITLE rules above.

**`url:` is required for every shot** and belongs to the screen. It never reaches the Doc — it lets capture navigate deterministically instead of guessing the route, removing a hallucination source. Use the screen's route, with `{record}` for per-record screens (`/admin/foo/{record}/edit`). A `pre_actions` instruction describes what changes *after* navigation; it is not a substitute for the starting URL.

For `{record}` routes, add `record:` when the first table row is not a safe representative:

- `record: text:<rendered row text>` selects the first row containing that text.
- `record: not-text:<rendered row text>` selects the first row not containing that text.

**A case may override its screen's `record`** — and often must. When one case teaches "this particular record is the default source for the others", that case needs `text:<it>` while its siblings need `not-text:<it>`, because the special record usually lacks the very fields the siblings are demonstrating.

`capture:` says how a shot is taken. Only the first two run unattended; an unknown value fails at compile time.

| `automated` | default — the runner captures it | — |
| `unauthenticated` | the login screen; opened in a separate context so the app cannot redirect it to the dashboard | — |
| `manual-permission-demo` | needs a real write to the admin (flip a permission, capture the effect) | needs a human |
| `manual-access-required` | the capture account cannot reach this screen at all; someone with sufficient rights must shoot it | needs a human |

The two `manual-*` modes are reported as `manual_required` and never attempted. They do **not** block the rest of the run: `promote` proceeds without them and lists them, and their placeholders in the Doc stay empty until someone captures them by hand.

Prefer fixing access over marking a shot `manual-access-required` — a capture account that can see every screen keeps the whole manual reproducible. Use it when raising the account's rights is not acceptable.

### Executable capture metadata

The batch runner can infer many targets from quoted rendered labels, but explicit targets are more reliable for repeated text or nested controls. Add a positional `targets:` list when inference would be ambiguous; its item count must match `annotate:`.

Supported target expressions:

| Expression | Target |
|---|---|
| `field:<rendered label>` | Whole field wrapper: label + control |
| `field-group:<label>|<label>` | Smallest common container around related fields |
| `fieldset:<rendered legend>` | A named group of fields |
| `section:<rendered heading>` | Nearest matching section |
| `tablist:<rendered tab>` | Whole tab bar containing the named tab |
| `row:<rendered text>` | First visible table row containing the text |
| `action:<rendered text>` | Button or link |
| `table-column:<rendered heading>` | Table column header |
| `table` | The table on this screen |
| `modal` | The open dialog |
| `page-header` | The page title area |
| `text:<exact rendered text>` | Nearest meaningful container |
| `selector:<CSS>` | Last resort — see `screenshots.md` |

`table` / `modal` / `page-header` take no argument and are written bare; add a name only to disambiguate (`table:客戶`).

**Prefer a word over CSS.** `selector:` writes one admin's markup into the manual's own spec, so it breaks on any restyle. Nearly every real use of it turns out to be "the table" or "the modal" spelled the long way — reach for the vocabulary first, and if a genuinely new concept recurs, add a target type instead of repeating the CSS.

Supported `pre_actions:` instructions — keep to one of these rendered-label patterns, and chain deterministic steps with `→`:

| `切換到「名稱」分頁` | switch form tab |
| `從列表點任一筆「查看」開啟彈窗` | open a row's modal |
| `點擊「名稱」按鈕開啟彈窗` | open a modal from a button |
| `展開「名稱」區塊` / `展開「名稱」權限群組` | expand a collapsed section |
| `捲動到「名稱」欄位群組` | scroll a fieldset into view |
| `將「欄位」切換為開啟` / `將「欄位」切換為關閉` | set a toggle to reveal conditional fields |
| `在「欄位」選擇「選項」` | pick a select option |

The last two exist because progressive disclosure is common: a field that only appears once a switch is on cannot be photographed in its default state. `SKILL.md`'s guardrails allow both — neither saves anything.

**State the target state, never "toggle".** `將「本國人」切換為關閉` is idempotent: re-running a capture produces the same screenshot. An instruction that merely flips would alternate between runs, which defeats the point of a re-runnable pipeline. The runner reads the control's current state and acts only if it differs.

An instruction outside these patterns fails the shot. If a screen genuinely needs something else, add a narrow runner capability or capture that shot by hand (`screenshots.md`) — never put arbitrary browser JavaScript in `plan.yaml`.

Use `mask:` only to supplement automatic masking on sensitive routes. It accepts the same `field:`, `table-column:`, and `selector:` forms. Which routes count as sensitive is declared per project in `<MANUAL_DIR>/manual.config.json` — see `build.md`.

For a sensitive route whose captured state is demonstrably empty, add `pii: no-visible-data`. This is an explicit reviewed exception; do not use it merely because automatic masking failed.

```markdown
  - file: image/resource-a/edit/some-toggle/01.png
    annotate: ["開啟後，前台不顯示某功能入口"]
    targets: ["field:停用某功能"]
    mask: ["field:聯絡人電話"]
    pre_actions: ["切換到「某分頁」分頁"]
```

**Every plain screen and every case carries a `subtitle` (required); a container screen — one with `cases` — carries none.** A plain screen holds `subtitle` + `shots` directly; a container screen holds `url` + `cases`, and each case brings its own `subtitle` + `shots`.

Example (a screen-only resource with cases, then an action resource):

```yaml
tabs:
  - name: <功能群組>
    resources:
      - name: <資源 A>
        screens:
          - name: 列表頁
            subtitle: 對應前台『<X>』的內容。
            url: /admin/resource-a
            shots:
              - file: image/resource-a/list/01.png

          - name: 編輯頁
            url: /admin/resource-a/{record}/edit
            record: not-text:<特殊預設紀錄>
            cases:
              - name: <條件欄位>
                subtitle: 這個欄位只有在<某條件>時才出現。
                shots:
                  - file: image/resource-a/edit/conditional-field/01.png
                    annotate: ["<某條件>時才出現此欄位"]

              - name: <某分頁的特殊設定>
                subtitle: 「<某分頁>」的某欄位留空時，前台改讀<某預設來源>。
                shots:
                  - file: image/resource-a/edit/some-tab/01.png
                    annotate: ["留空時前台改讀<某預設來源>"]
                    pre_actions: ["切換到「<某分頁>」分頁"]

              - name: <某筆紀錄>作為其他紀錄的預設值
                subtitle: <某筆紀錄>的欄位留空時，其他紀錄前台會改讀它的對應欄位。
                record: text:<特殊預設紀錄>
                shots:
                  - file: image/resource-a/edit/default-source/01.png

          - name: <關聯項目>(子頁)
            subtitle: 在此把既有的<關聯項目>附加到這筆紀錄。
            url: /admin/resource-a/{record}/related
            shots:
              - file: image/resource-a/related/01.png
              - file: image/resource-a/related/02.png
                annotate: ["從下拉挑選後送出"]
                pre_actions: ["點擊「附加」按鈕開啟彈窗"]

      - name: <資源 B>
        screens:
          - name: 列表頁
            subtitle: 此資源只有檢視與<某動作>，沒有編輯/刪除。
            url: /admin/resource-b
            shots:
              - file: image/resource-b/list/01.png
                annotate: ["列動作只有「檢視」與「<某動作>」"]

          - name: <某新增流程>
            subtitle: 新增 <資源 B> 的多步驟流程。
            url: /admin/resource-b/create
            shots:
              - file: image/resource-b/create/01.png
                annotate: ["列表頁右上的入口按鈕"]
              - file: image/resource-b/create/02.png
                annotate:
                  - "① 第一步：先選<某選項>"
                  - "② 第二步：依條件搜尋"
                  - "③ 出現可選結果"
                  - "④ 填寫資料"
                  - "⑤ 送出"
                pre_actions: ["點擊入口按鈕進入新增頁"]

          - name: 檢視頁
            url: /admin/resource-b/{record}
            cases:
              - name: <某動作>
                subtitle: 只能在「<明確條件>」時執行此動作。
                shots:
                  - file: image/resource-b/view/some-action/01.png
                    annotate: ["檢視頁右上的「<某動作>」（僅符合條件時出現）"]
                    pre_actions: ["從列表點任一筆「檢視」開啟彈窗"]
                  - file: image/resource-b/view/some-action/02.png
                    annotate: ["確認彈窗 — 點確認才真的執行"]
                    pre_actions: ["點擊「<某動作>」按鈕開啟彈窗"]
```

## Anti-patterns (don't do this)

| Bad | Why | Better |
|---|---|---|
| 跳過 plain 列表頁，因為「沒特殊」 | 每個資源要統一展示自己的畫面、讓讀者看到欄位 | 保留「列表頁」H2 + 一張乾淨截圖 |
| 替 plain 畫面硬開一個 H3 | H1+H2 已點明,「<資源>列表頁面」H3 是重複 | plain 畫面就 H2 + 截圖,無 H3 |
| 把編輯表單的「某分頁」當成獨立 H2 | 它還在編輯同一筆,不是另一個畫面 | 該分頁裡的特殊欄位 → 編輯頁底下的 H3(shot pre_action 切分頁) |
| 「H3: 刪除」「H3: 搜尋」「H3: 拖拉排序」 | Filament 內建、自明 | 不開 H3、也不標 |
| 一個 H3 塞兩條不相關的規則 | 查找時對不上標題 | 一個特殊點一個 H3 |
| 比 H3 更深的層級 | 結構只有四層 | 細節用標註,不要再長一層 |
| 「H2: Tab 結構」「H3: 表單欄位導覽」 | Tab 列、label 本身就是說明 | 拿掉;只標真正有特殊邏輯的欄位 |
| 畫面沒有 SUBTITLE | SUBTITLE 必填 | 每個畫面都給一句定位(前台對應 / 用途 + 範圍 delta) |
| 替一個 tab/欄位開 H3,只因為它存在 | 沒舉證、純推論,易幻覺 | 指得出 code 構造或實際看到的行為才開,否則不寫 |
| 沒看過前台就寫「→ 前台 X」 | 臆測前台對應 | 查 API 路由 / 開前台確認後才寫 |
