---
name: filament-operating-manual
description: Build, batch-capture, review, or modify an end-user operation manual for a Filament admin panel, written into a Google Doc with annotated screenshots. Use whenever the user wants to create, refresh, extend, batch re-screenshot, or fix a 操作手冊 / 使用手冊 / 後台手冊 / admin manual / 操作指南. Prefer the bundled Playwright pipeline for many screenshots so browser work is deterministic, resumable, and token-efficient. Read-only against the admin except for explicitly approved permission demos.
when_to_use: User wants to build a new admin manual OR change an existing one (re-screenshot, edit wording, add/remove a section); supplies a Google Doc + Drive folder + admin URL + credentials; phrases like 「操作手冊」「使用手冊」「後台手冊」「admin manual」「操作指南」.
allowed-tools: Read Edit Write Bash WebFetch
# The build path needs only these: the runner drives the browser itself via Bash.
# Diagnosing a runner failure by hand (screenshots.md → manual routine) additionally
# needs a browser-control tool; grant one for that session if you go down that path.
---

# Filament Operating Manual

This skill produces an end-user manual for a Filament admin panel: structured headings + annotated screenshots written into a Google Doc. The admin is approached **read-only** (no submissions, no destructive clicks; one narrow exception for permission demos — see guardrails).

## How this skill works

You maintain **`plan.yaml`** (the single source of truth) and sync it to a Google Doc, filling each section with annotated screenshots.

Two things to do, and they work differently — **pick one before doing anything:**

> Does the target Doc already contain this manual? **No → `references/build.md`.** **Yes → `references/edit.md`.**

| File | What it owns |
|---|---|
| `SKILL.md` (this file) | Inputs, the **structure model**, **voice rules**, **guardrails** — the *what / why* |
| `references/build.md` | **Building a manual end to end, unattended** — setup, plan, capture pipeline, review, render, report |
| `references/edit.md` | **Changing an existing manual** — Doc↔plan merge, re-shooting one image, permission demos |
| `references/planning.md` | How to write `plan.yaml` (H2/H3, the "special" test, format, capture metadata) |
| `references/screenshots.md` | What makes a screenshot correct — box extent, annotation placement, masking, page state |
| `references/google-docs.md` | Writing/editing the Doc + uploading to Drive (the API mechanics) |

The split that matters: **`build.md` runs start to finish without stopping and regenerates the whole Doc; `edit.md` is interactive and surgical, and must preserve wording the user wrote themselves.** Never build over a Doc the user has polished.

**`plan.yaml` is the single source of truth.** On a first build you write it from scratch; on later edits the user may have polished the Doc directly, so you absorb Doc-side improvements back into `plan.yaml` before pushing. `build.md` and `edit.md` detail the two paths.

**Browser work goes through the batch runner**, not interactive clicking: AI plans targets and reviews the results, while the runner does the repetitive operating. Drive the browser by hand only to diagnose a runner failure (`screenshots.md` → manual routine).

**A build runs unattended.** Each stage verifies its own output — the compiler rejects a malformed plan, machine checks reject a broken screenshot, AI review rejects a bad annotation — so there is nothing a human checkpoint would add mid-run. The user's review point is the finished Doc plus the final report. Because nobody inspects the plan before it is rendered, two things carry more weight than they used to: **ground every claim before it enters `plan.yaml`**, and **report every judgment you were unsure about**. The one thing that still needs confirmation mid-run is a permission demo, because it writes to the admin.

## Inputs (ask if missing)

| Key | Required | Notes |
|---|---|---|
| `DOC_URL` | yes | Google Doc (Tabs OK). Empty/template doc on a first build; the existing manual on an incremental edit. |
| `DRIVE_FOLDER_URL` | yes | Where screenshots are uploaded. Shared Drive OK. |
| `ADMIN_URL` | yes | Filament 後台基底 URL — **截圖站台來源**。不限 local；可指 staging / production / 任何可登入環境。例：`https://staging.example.com/admin`。對外發佈建議用 staging。 |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | Session-only environment variables; never echo, write into `plan.yaml`, or pass as CLI arguments. |
| `MANUAL_DIR` | default `docs/operating-manual/` | Manual root. `plan.yaml` is the version-controlled spec; `manual.config.json` holds project-specific runner settings; `image/` is a local staging area. |
| `IMAGE_DIR` | derived `<MANUAL_DIR>/image/` | Gitignored. Folder structure: `<IMAGE_DIR>/<h1-slug>/<h2-slug>/[<h3-slug>/]NN.png`. Screenshots are delivered to Drive and the Doc, not committed. |
| `IMAGE_WIDTH_PT` | default `460` | A4 with default margins. Used when inserting images into the Doc. Annotation font size is a **separate constant** (`FONT = 32` in `annotator.js`) chosen for this width — narrowing the image without revisiting it makes labels unreadable; `annotator.js` carries the arithmetic. |
| `VIEWPORT` | default `1920x1000` | Raise height for tall pages. |
| `INDENT_PT` | auto | Read from any existing paragraph; if absent, 0. |

## Manual structure model

This is the structural contract for the manual — how `plan.yaml` and the Doc are organised, on a first build and on every later edit alike. The voice rules below say *how to write*; this says *how to structure*. Four levels:

```
Tab   — a Filament navigation group (功能群組), verbatim
H1    — one resource (一個資源)
H2    — one screen of that resource (一個畫面)
H3    — one case worth teaching on that screen (一個特殊點 / 動作)
```

Two things fall outside that mapping and still need a home:

- **Screens with no navigation group** — the login screen is pre-auth and belongs to no group. Give it its own leading Tab (登入 / 後台登入); it is the reader's first screen, so it goes first.
- **Nav-registered pages that aren't Resources** — a settings page, a dashboard, a custom tool. Treat one as an H1 under whichever Tab its nav entry sits in, with its screens as H2s. "Resource" names the common case, not a requirement.

The split is deliberate: **H2 is mechanical, H3 is judgment.** You list H2s by reading the code; you choose H3s by applying the "special" test. This keeps the manual queryable — every special point gets a titled H3 that shows up in the Doc outline, so staff can jump straight to it.

### H2 — screens (mechanical, from the Resource code)

List every navigable screen the resource actually has:

- **列表頁** — always.
- **編輯頁** — represents the form (create reuses the same form; plain 新增 is stock, not its own screen).
- **關聯子頁** — one H2 per separate related-records manager (`RelationManager` / a custom `ManageRelatedRecords` page with its own table + 附加/新增/移除).
- **檢視頁** — only if it exists and hosts special data or actions (some resources expose a view page instead of an edit page).

A `Tabs` component **inside** the edit form is **not** a screen — the special fields living in those tabs become H3 cases under 編輯頁 (the shot switches to that tab via a pre-action).

### H3 — cases (judgment, the "special" test)

An H3 is **one teachable point** on a screen — a titled subsection with its own annotated screenshot.

- **Plain screen** (standard list / standard edit form, nothing non-obvious) → **no H3**; a required SUBTITLE (its frontend correspondence or purpose) + one clean screenshot directly under the H2, so the reader sees that resource's columns/fields.
- **A screen-wide scope fact** (此資源只有檢視與取消、此資源無新增鈕) → it belongs in the **H2 SUBTITLE** (prose), not an H3. Add an annotation only if there's a specific element to point at; the scope itself is prose, not a callout.
- **Each distinct point** (a specific field/behaviour, a backend↔frontend correspondence, a button-action) → **its own H3**.

**When a screen has both** — a scope fact *and* cases worth their own H3 — the scope fact still goes in the H2 SUBTITLE. A container H2 normally carries no SUBTITLE, and this is the one exception: an absent button cannot be seen in any screenshot and belongs to the whole screen, so no H3 can host it. Keep it to one short clause; the H3s carry everything else.

### Actions

- An action that **is a whole screen / workflow** (a multi-step create flow) → make it the screen's **H2**, named by the action; put its step shots under it (add H3s only if it has multiple distinct sub-points).
- An action that's **a button on a screen** (a resource-specific action with its own modal) → an **H3** under that screen's H2. If the action's whole teaching point fits in one annotation on a shot you were taking anyway — it opens a confirm dialog and that's all there is to say — leave it as an annotation. Promote it to an H3 when it has a rule worth a heading in the outline: a condition on when it appears, a multi-step modal, a consequence the reader can't undo.
- **Stock CRUD** (新增 / 編輯 / 刪除 / 搜尋 / 排序 / 分頁) → never an H2, never an H3, never annotated. Self-evident Filament UI.

### SUBTITLE / annotation — two layers (don't duplicate)

- **SUBTITLE** — prose under a heading, read in the document flow. **Required on every plain H2 and every H3; omitted on a "container" H2 that only groups H3 cases.** A SUBTITLE sitting between an H2 heading and its first H3 reads as a floating mini-title and competes with the headings — so a container H2 (編輯頁/設定頁/etc. with H3 children) carries the heading only, and its H3 children carry the specifics. On a plain H2 the SUBTITLE states the frontend correspondence (if the data surfaces on the public site) or the purpose, plus any scope deviation. On an H3 it states the case's rule.
- **Annotation** — a short spatial pointer on a screenshot, tied to an element. Only for special / non-obvious things; **never for stock CRUD buttons**, and never just repeating the SUBTITLE sentence.

### What counts as "special" (worth an H3)

The implicit baseline is *standard Filament CRUD behaviour*. Something earns an H3 when a reader who already understands ordinary admin screens would still **do it wrong, be unable to do it, or not realise a front-end effect**:

1. A multi-step workflow (step 1 → step 2 → … → submit).
2. A unique action only this resource has, with its own modal.
3. Data semantics not visible on screen (某筆是其他資料的預設來源；某勾選影響前台排序).
4. Conditional behaviour (某欄位只有特定條件才出現；某筆數固定不可增刪).
5. Backend → frontend correspondence (這個資料對應前台這個位置).

If none apply to a screen, it's plain: a SUBTITLE + one clean screenshot under the H2, no H3.

**A screen having a tab or field is not, by itself, special** — only a behaviour you can cite (a code construct, or something seen in the browser) earns an H3. A 「→ 前台」 claim must be confirmed against the actual frontend, never inferred. Full evidence rules: `planning.md` → "Ground every claim".

## Voice & vocabulary

These rules govern **everything written for the reader** — plan SUBTITLEs, Doc text, and screenshot annotations. They are the heart of manual quality, so they live here in the router and apply whether you're building from scratch or editing.

> The reader is an **end user** (operations / marketing / content staff) — not a developer, not the DBA, not the security architect. Write only **what they can see / click / change** and **what visible effect it has** on the system or the public site.

### Don't leak implementation

| Leak | Examples | Replace with |
|---|---|---|
| Code identifiers | `isEditable()`, `parent_id`, `is_default`, `XxxResource`(類別名) | Plain Chinese describing the behaviour, or the on-screen label |
| Vendor / package names | Filament, Livewire, Alpine, 及任何第三方套件名（媒體庫、權限、行事曆…套件） | Don't mention. Describe the feature instead |
| HTML / framework primitives | Fieldset, Repeater, Block, Tab (as a noun), sub-page, picker, modal, dropdown | 區塊 / 分頁 / 選擇器 / 彈窗 / 下拉 |
| Route / URL templates | `/foo/{id}/bar`, `<ADMIN_URL>/login`, `/items/<id>` | 「某資源的『子項目』分頁」「後台登入頁」 |
| DB / config jargon | helperText, pivot, hash, last4, validation rules, auto-uppercase, normalize | 描述效果，例：「欄位旁的提示文字」「輸入完整號碼或後 4 碼才會命中」 |
| Backend role internals | 「非某角色看不到」「某高權限角色才能」「policy 阻擋」 | 一般使用者根本看不到那些選項。不提具體 role 名；改寫成「視權限可能不顯示」即可 |
| Capture-process meta | 「本手冊不送出」「read-only 示範」「不會真送出」「capture 階段…」 | 一律刪。讀者不需要知道作者拍照時怎麼做的（唯一例外：登入畫面 SUBTITLE 記錄截圖站台 URL + 測試帳密，見 `planning.md`） |

**Self-check:** if a sentence requires a developer-only noun to make sense, the user doesn't need that sentence.

### Don't use subjective filler

Strike words that don't add information: 「**關鍵的是**」「**重點是**」「**端到端**」「**完整流程**」「**展示**」「**示範**」「**詳細**」「**深入**」「**全面**」. If the rest of the sentence already says it, the adjective is fluff.

### Match the system's actual labels

What's in the i18n file or the form schema may not be the Chinese the staging UI actually shows. Treat the **rendered text** as the source of truth. If staging displays 「甲」 but you wrote 「乙」, match the screen and note the mismatch in the final report.

## Read-only guardrails

Applies throughout — the admin is a live system.

- View pages, edit pages without saving, opening modals, switching form tabs — OK.
- Clicking row 查看 / 編輯 — OK.
- Selecting Select dropdown options, or setting a toggle, to expose progressive-disclosure fields — OK (no save). `planning.md` gives the `pre_actions` wording for both.
- Never click `新增` to actually submit, `儲存 / 保存`, `刪除`, `送出`, or locale equivalents.
- Dismiss every modal opened (click `取消` or close `X`) before navigating away.
- Batch capture is fail-closed: an ambiguous action or annotation target fails that shot instead of guessing or clicking a potentially mutating control.
- **Exception:** a permission-demo case (on a roles/permissions screen) needs real saves to flip a toggle and capture the effect. Get explicit user confirmation each session before saving permission changes, and restore the original permission state afterwards.

## Then: start

Doc empty → `references/build.md`. Doc already has the manual → `references/edit.md`. Both pull in `planning.md` / `screenshots.md` / `google-docs.md` as their steps say. The two browser helpers, `references/state-normalizer.js` and `references/annotator.js`, are loaded by the runner during capture; `screenshots.md` covers them.
