# Build — plan to finished Doc, unattended

Use this path when the Doc is empty, or when regenerating a manual this skill owns. It runs **start to finish without stopping**: the user's review point is the finished Doc plus the final report, not any intermediate state.

Pausing to have a human confirm a half-built artifact buys nothing, because every stage already verifies its own output — the compiler rejects a malformed plan, machine checks reject a broken screenshot, AI review rejects a bad annotation. If the user dislikes the result, the fix is always the plan, never the Doc. If the user dislikes the result, fix `plan.yaml` and run again; never hand-patch the Doc to match a plan you did not update.

> **Do not run this against a Doc the user has edited directly.** Their wording is the better copy and rendering would delete it — use `edit.md`.

```
plan.yaml ─► compile ─► capture ─► check ─► contact sheets ─► AI review ─┐
              ▲                                                        │
              └──────────────── fix plan.yaml, retry ◄───────────────────┘
                                     │ all resolved
                                     ▼
                        promote ─► upload ─► render ─► report
```

## 0. One-time setup

The runner is an isolated Node project inside this skill. From the skill directory:

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium
```

`node_modules/`, `.playwright-browsers/`, the authentication state, candidates, traces, and review files are all gitignored.

Credentials are environment variables. Never put a password in `plan.yaml`, shell history, CLI arguments, results, or screenshots:

```bash
export ADMIN_URL='https://staging.example.com/admin'
export ADMIN_EMAIL='manual@example.com'
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
```

The runner logs in once and writes a gitignored browser storage state, reused until the session expires.

### Project configuration

The runner carries no knowledge of any particular admin. Everything project-specific lives in `<MANUAL_DIR>/manual.config.json`, which is required:

```json
{
    "sensitiveRoutes": ["accounts", "enquiries", "appointments"],
    "piiLabels": ["Name", "Phone", "Email", "Date of birth", "Address"],
    "dangerousActions": ["Create", "Save", "Delete", "Submit", "Confirm"],
    "selectors": {
        "section": ".card"
    }
}
```

The first three are **required, and they are written in the admin's own language** — that is exactly why they cannot live in the runner's code:

| `sensitiveRoutes` | URL path segments whose screens show personal data | capture masks them automatically; `check` fails a shot on such a route that masked nothing |
| `piiLabels` | field and column labels to blur on those screens | the labels are what the runner matches against |
| `dangerousActions` | button labels the runner must never click | the read-only guardrail |

A hardcoded list would match nothing on a differently-localised admin, and **both protections would fail silently** — personal data published, a mutating button clickable, no error either way. Requiring them here turns that silence into a startup failure. Declare `[]` only when you mean it; listing `sensitiveRoutes` while leaving `piiLabels` empty is rejected, because nothing would ever be masked.

`selectors` is the **exception list, not a required mapping.** Targets resolve through portable strategies first — semantic HTML, then ARIA — so an admin with accessible markup leaves this empty. Add a key only when a target type actually fails; the error message names the exact key to add. Valid keys: `field`, `fieldValue`, `fieldset`, `section`, `sectionHeading`, `sectionHeader`, `table`, `modal`, `pageHeader`. An unrecognised key is an error rather than a silent no-op, because a typo would otherwise look like a mysterious capture failure.

### Known-good values for Filament v5

These were established by diagnosing a live panel; start from them rather than rediscovering them.

```json
"selectors": {
    "section": ".fi-section",
    "sectionHeading": ":scope > .fi-section-header .fi-section-header-heading",
    "sectionHeader": ":scope > .fi-section-header",
    "pageHeader": ".fi-header",
    "table": ".fi-ta",
    "modal": ".fi-modal-window"
}
```

Two of them are not obvious and are worth knowing why:

- **`table`** — a Filament table rendered with `contentGrid()` produces no `<table>` or `[role="table"]` at all, so the portable strategy finds nothing. `.fi-ta` is the wrapper in both layouts.
- **`modal`** — Filament's `[role="dialog"]` element has **zero rendered height**; it is a positioning context, not the visible panel. Annotating it fails the minimum-size check. `.fi-modal-window` is the box a reader actually sees.

`field`, `fieldset` and `field-group` are absent from this list on purpose: the portable strategies resolve them on Filament without help.

## 1. Plan

Write `<MANUAL_DIR>/plan.yaml` per `planning.md`. Build it **grounded**: code gives the screen list (H2), but every special case (H3) and every frontend-correspondence SUBTITLE must cite a code construct or be confirmed in the browser first (`planning.md` → "Ground every claim").

Nobody checks the plan before it is rendered, so **record every judgment you were unsure about** as you go — a borderline H3, an unverified frontend claim, an annotation target you had to guess. These go in the final report.

## 2. Compile

```bash
npm run compile
```

Converts `plan.yaml` into `.capture/capture-manifest.json`. Fix every warning before capturing. In particular every shot needs a deterministic `url:`. The compiler rejects duplicate or unsafe image paths and mismatched annotation/target counts. `plan.yaml` stays the source of truth — never hand-maintain the generated manifest.

## 3. Capture

```bash
npm run capture -- --workers=3
```

Useful filters:

```bash
npm run capture -- --only=resource-a,resource-b
npm run capture -- --headed --only=resource-a--edit
npm run capture -- --ids=image--login--login-screen--01,image--news--edit--01
npm run capture -- --append --ids=image--articles--edit--01,image--articles--edit--02
```

`--only` does a broad substring match for resource batches; use `--ids` with full manifest IDs or screenshot paths when the selection must be exact. Add `--append` to force selected shots to be replaced without discarding the rest of the existing results.

The runner uses one authenticated browser context and a small page pool. Per shot it resolves `{record}`, normalizes the sidebar, performs supported pre-actions, installs the annotator, resolves annotation targets, masks sensitive data, and writes a candidate PNG. Results are checkpointed after every shot, so an interrupted run continues where it stopped.

It is **fail-closed**: it never clicks `新增`, `儲存`, `保存`, `刪除`, `送出`, or `確認`, and an ambiguous target or unsupported action fails that shot rather than guessing.

Three capture modes bypass the ordinary batch (`planning.md` defines them all):

- `capture: unauthenticated` — the login screen, opened in a separate context so the app cannot redirect it to the dashboard.
- `capture: manual-permission-demo` — needs a real write to the admin; see `edit.md` → permission demos.
- `capture: manual-access-required` — the capture account cannot reach that screen.

The two `manual-*` modes are reported as `manual_required` and never executed. They do not block the run: `promote` proceeds without them and lists what is missing, and their Doc placeholders stay empty until someone captures them by hand. Report them in the final summary so the user knows exactly which pages are unillustrated and why.

The quality rules the runner implements — box extent, annotation placement, masking, sidebar state — are in `screenshots.md`. Read it when a shot comes out wrong.

## 4. Machine checks

```bash
npm run check
```

Writes `.capture/review.json`, checking capture status, PNG integrity and dimensions, annotation outcomes, and required PII masking. A non-zero exit means at least one shot needs retry; it is a report, not a reason to discard successful shots.

## 5. AI review

```bash
npm run contact-sheet
```

Contact sheets hold up to 12 thumbnails each. Review these first; open original PNGs only for unreadable or suspicious thumbnails, which keeps visual-review token use bounded.

Two things to judge, and they are checked differently:

- **Did it box the right thing?** Read `target` in `review.json` — `field:狀態` or `inferred-rendered-label:狀態` tells you what was resolved without looking at pixels. Cheaper and more reliable than squinting at a thumbnail.
- **Does the result read well?** That needs the image: label overlapping content, a box that swallows unrelated fields, a screen that scrolled to the wrong place.

Set `reviewStatus` on every machine-passed shot:

- `approved` — composition, annotation scope, text, and masking are all correct.
- `retry` — add a concise `feedback` reason and correct `plan.yaml` before recompiling.
- `skipped` — this planned shot cannot be captured; record why in `feedback`.

Do not approve just because machine checks passed. They cannot tell whether a box expresses the intended teaching point.

## 6. Retry

After correcting `plan.yaml`:

```bash
npm run compile && npm run retry && npm run check && npm run contact-sheet
```

Retry recaptures only `reviewStatus: retry` and merges with previous results; re-checking preserves approvals for unchanged shots. Loop until nothing is pending or retrying.

## 7. Promote

```bash
npm run promote
```

Refuses to run while any shot is pending or needs retry. Copies only machine-passed, AI-approved candidates into `<IMAGE_DIR>`, which is a gitignored staging area — promote and upload in the same session, since the next capture run overwrites it.

## 8. Upload and render

Upload the approved images to Drive, then write the whole manual into the Doc: `google-docs.md → Render the manual` — tabs first, then text, then images. Render into a fresh Doc; regenerating over an existing manual is not supported yet (see that file).

## 9. Report

Acceptance, all of which the final report must evidence:

- Doc has H1 / H2 / (H3) / SUBTITLE for every planned section, indented consistently, with every planned image in place.
- Every planned shot captured at its planned path, or reported skipped with a reason.
- Every screenshot: sidebar fully open with text labels; only the active group expanded (or all groups expanded on Dashboard / no-active-group pages).
- Verified per `google-docs.md → Verify`: per-tab image counts match `plan.yaml`, and each image's `sourceUri` points at the expected Drive id.

The report is what the user reads alongside the Doc, so it carries everything they would otherwise have caught at a checkpoint:

- counts — planned, captured, machine-passed, approved, retried, skipped;
- shots left `manual_required`;
- vocabulary mismatches found at capture time (plan said 「甲標籤」, staging shows 「乙標籤」);
- **every judgment call you were unsure about**, from step 1 and from review.
