# Google Docs / Drive mechanics

Everything that writes to the Doc or uploads to Drive — used both for the **first full write** of a manual and for **incremental edits** later. `build.md` and `edit.md` say which of these you run and in what order; this file is the how.

## Sequencing & idempotency (read first)

`documents.batchUpdate` is **NOT idempotent**, and any insert/delete shifts every later index. So:

- Run each batch **exactly once**.
- One `documents.batchUpdate` **per tab**, processed **bottom-up** (highest index first) so untouched indices stay valid within the tab. Tabs are independent index spaces; tab order doesn't matter.
- For an edit that moves text, sequence the whole change as: **text edits → re-fetch → structure edits → re-fetch → image swaps.** Re-fetch between phases that move text.
- To recover from a partial run: re-fetch the Doc, find duplicates/gaps, fix bottom-up, re-run only the missing pieces.

### Before you retry a write, prove it failed

**"My script errored" and "the API call failed" are different events, and confusing them corrupts the document.** A batch that succeeded but whose reply your wrapper failed to parse will, on retry, apply a second time against indices computed for the *old* state — which silently duplicates content and scatters it into wrong positions, including inside other paragraphs' text runs.

So: on any error during a write phase, **re-fetch the tab and look at what is actually there** before re-running anything. This has bitten a real run (63 images duplicated across 6 tabs), and the trigger was mundane — see the `gws` stdout pitfall at the end of this file.

### Recovering a tab

When a tab's content is wrong beyond spot-repair — duplicated, scrambled, half-written — do not try to unpick it. Clear the whole tab body and re-render that tab from the plan:

```python
end = tab["documentTab"]["body"]["content"][-1]["endIndex"]
{"deleteContentRange": {"range": {"tabId": t, "startIndex": 1, "endIndex": end - 1}}}
```

The body keeps a mandatory trailing newline, so the deletable range stops one short of the final index; a body that is already empty has `end == 2` and needs no request. Then run step 1 and step 2 for that tab as if it were new.

> Verified on a real run: this recovered six tabs cleanly, and a re-render afterwards passed the full verification below. Whole-tab clearing is therefore a supported repair — what is still untested is using it routinely to regenerate a *finished* manual, which the render section warns about separately.

## Render the manual (first build)

Rendering writes the whole manual from `plan.yaml` in one unattended pass: **text first, images second**. Doing text first is what keeps the image pass safe — placeholders give every image a stable, known index, so the inserts run bottom-up without recomputing anything. This is the same two-step sequence as before; what changed is only that the user no longer reviews the text pass before images are added.

> **Render only the tabs `plan.yaml` defines, and never touch the others.** A real manual Doc usually carries tabs the plan knows nothing about — a cover page, an appendix, notes someone added. Those are not yours to rewrite. Likewise, once the user has edited a planned tab directly, their wording is the better copy: go to `edit.md` instead.

### Step 0 — Tabs

Each `tabs[].name` in the plan is one document tab. Fetch the Doc first and match by title; create only what is missing.

```python
{"addDocumentTab": {"tabProperties": {"title": "<tab name>", "index": <position>}}}
```

Adding a tab at an index shifts every later tab down, so create missing tabs **in ascending index order**. Read the resulting `tabId` back from a fresh fetch — every later request is scoped to it.

**A brand-new Doc already has one tab.** `documents.create` returns a document containing an untitled default tab (`t.0`) that matches no planned name. Rename it into your *first* planned tab rather than leaving it orphaned beside seven new ones:

```python
{"updateDocumentTabProperties": {"tabProperties": {"tabId": "t.0", "title": "<first tab name>"}, "fields": "title"}}
```

Note the shape: **`tabId` lives inside `tabProperties`**, and `fields` is required. Putting `tabId` at the request's top level fails schema validation.

`deleteTab` removes a tab; `updateDocumentTabProperties` also reorders one via `index`.

> Verified on a real run: `addDocumentTab` and `updateDocumentTabProperties` behave as described above, ascending-index creation produces the intended order, and a freshly added tab carries the empty body the later steps assume.

### Step 1 — Text structure

Write all text with **no images yet**. Walk the plan tree and append, in document order:

```
H1            (only on the first H2 under that H1)
H2
  ── for a PLAIN H2 (no H3):
SUBTITLE      (one paragraph — the plan gives one)
NORMAL_TEXT   (empty image placeholder; one per planned shot under the H2)
  ── for a CONTAINER H2 (has H3 cases): SUBTITLE only if the plan gives one, then the H3s:
H3
SUBTITLE      (one paragraph — the plan gives one)
NORMAL_TEXT   (empty image placeholder; one per planned shot under the H3)
```

A SUBTITLE always follows a **plain H2** or an **H3**. A container H2 usually has none — one would float between the H2 and its first H3 and compete with the headings — but the plan may give it one to carry a screen-wide scope fact. Emit whatever the plan has; do not add or drop one.

**Paragraph styles to apply:**
- H1 / H2 / H3 → `HEADING_1` / `HEADING_2` / `HEADING_3` named styles. Each heading text carries a `N. ` sort-number prefix (restarting within its parent), per `planning.md`.
- The description line (plan's `SUBTITLE:`) → the Google Docs **`SUBTITLE` named style, set to italic**. The SUBTITLE size renders close to H3, but that's fine because **every H3 carries a number prefix** — the numbered bold heading vs the italic description is enough contrast. (A no-italic SUBTITLE, or shrinking it to `NORMAL_TEXT`, are both worse: the former is indistinguishable from a heading, the latter loses presence.)
- Apply `INDENT_PT` on every paragraph (headings, descriptions, image placeholders) so the column stays aligned.

Apply `INDENT_PT` (and `indentFirstLine`) explicitly on every paragraph — new paragraphs don't reliably inherit indent. Emit one empty placeholder paragraph per planned shot, in shot order, under its own H2 or H3.

## Upload a screenshot to Drive

`gws drive +upload` omits `supportsAllDrives` and 404s on Shared Drives. Use the lower-level call. Name files by their path under `image/` with slashes → dashes (e.g. `image/resource-a/some-case/01.png` → `resource-a-some-case-01.png`) so the Drive folder is greppable and collision-free:

```bash
gws drive files create \
  --params '{"supportsAllDrives":true}' \
  --json '{"name":"<dash-name>.png","parents":["<FOLDER_ID>"]}' \
  --upload "<IMAGE_DIR>/<file>.png"

gws drive permissions create \
  --params '{"fileId":"<id>","supportsAllDrives":true}' \
  --json '{"type":"anyone","role":"reader"}'
```

Image URL for Docs: `https://drive.google.com/uc?export=view&id=<id>`.

### Step 2 — Images

Upload every approved screenshot to Drive first (previous section), then insert them into the placeholders. One `documents.batchUpdate` per tab, bottom-up. The placeholder paragraphs are empty `NORMAL_TEXT`; insert the image at each placeholder's index:

```json
{
  "insertInlineImage": {
    "location": { "index": <placeholder_index>, "tabId": "<tab>" },
    "uri": "<drive_url>",
    "objectSize": {
      "width":  { "magnitude": <IMAGE_WIDTH_PT>, "unit": "PT" },
      "height": { "magnitude": 10000, "unit": "PT" }
    }
  }
}
```

The large height bound makes width the binding constraint; aspect ratio is preserved.

## Edit existing Doc text

`replaceAllText` is index-free and safest. Use the exact, unique **current Doc** string (not the plan string — the Doc is what `containsText` matches against):

```python
{"replaceAllText": {"containsText": {"text": "<exact current Doc text>", "matchCase": True},
                    "replaceText": "<new text from updated plan>"}}
```

Batch several into one `documents.batchUpdate`. Verify each reply's `occurrencesChanged == 1`. 0 means your "current" string drifted (re-fetch and check); >1 means it wasn't unique (lengthen it).

## Remove a section

From a fresh fetch, find the contiguous paragraph range — from the start of the heading paragraph to the end of the image paragraph. Delete that range with the tab scoped:

```python
{"deleteContentRange": {"range": {"tabId": "<tab>", "startIndex": S, "endIndex": E}}}
```

For multiple deletes, do them bottom-up (highest startIndex first) or one per `batchUpdate` with re-fetch in between. Leave the document's final trailing paragraph intact.

## Add a section

Mirror the text structure in **Render → step 1**: H1 (if new) / H2 / optional H3 / SUBTITLE / empty placeholder, at the computed index, then fill the image as in **Swap a screenshot**. A case added to an existing screen is an H3 under that screen's H2; a whole new screen is an H2.

## Swap a screenshot (re-shoot)

Three facts that make this non-obvious:

1. **Google Docs copies the image into its own storage on insert.** Replacing the file in Drive does **nothing** to the Doc. You must change the Doc.
2. **`replaceImage` uses `CENTER_CROP`** — it scales the new image to the *old* image's bounding box and crops the overflow. Re-screenshots almost always have a different height, so `replaceImage` will **crop them**. Don't use it for re-shoots.
3. Swap by **delete + insert at the same index**, width-bound, which preserves aspect ratio.

Procedure, per tab, processing images **bottom-up** (highest index first):

- For each image element at index `s`:
  - `{"deleteContentRange": {"range": {"tabId": t, "startIndex": s, "endIndex": s+1}}}`
  - `{"insertInlineImage": {"location": {"tabId": t, "index": s}, "uri": "<new drive url>", "objectSize": {"width": {"magnitude": <IMAGE_WIDTH_PT>, "unit": "PT"}, "height": {"magnitude": 10000, "unit": "PT"}}}}`
- Each delete+insert pair is **net-zero** in length, so processing top-down (descending `s`) keeps every not-yet-touched index valid. Emit all pairs for a tab in one `batchUpdate`, ordered by descending `s`.

Before building the batch, **assert the per-tab image count matches** what `plan.yaml` now expects (after any section deletes). A mismatch means the Doc↔plan mapping is off — stop and reconcile.

To (re)capture the new screenshot, see `edit.md → Re-shooting one image`; upload with the dash-name convention above.

## Verify

Re-fetch the Doc and confirm in Python:

- per-tab image counts are what `plan.yaml` expects;
- each swapped/inserted image's `inlineObjectProperties.embeddedObject.imageProperties.sourceUri` points to the **expected** Drive id (proves the write took, not a stale copy).

Don't rely on opening the Doc in a browser — that needs the user's Google login. The count + sourceUri check is the reliable verification. Tell the user to eyeball rendering in their own browser.

## Pitfalls

- **`gws` prints a `Using keyring backend: keyring` line on stdout, before the JSON.** Any parser fed the raw stdout will fail on a call that actually succeeded. Strip everything before the first `{` (`raw[raw.index('{'):]`) — and never treat your own parse error as evidence that the write failed. This exact confusion duplicated 63 images across 6 tabs in a real run.
- **Separate your wrapper's exit status from the API's.** When scripting a loop of writes, log each reply and check it, rather than inferring success from the absence of a crash. A silent success that looks like a failure is far more expensive than a loud failure.
- **`gws drive +upload` 404s on Shared Drives** — use `files.create --upload` with `supportsAllDrives:true`. Every Drive call needs `supportsAllDrives: true`.
- **Bash heredoc control characters crash the Docs API** — build the batchUpdate JSON in Python and pass via `--json "$(cat file)"`.
- **`documents.batchUpdate` is NOT idempotent** — run each batch once; re-fetch before recomputing positions after any partial run.
- **`insertPageBreak` leaves an orphan paragraph** — avoid for layout; use blank paragraphs.
- **Verify positionally, not just by count.** Counting images per tab cannot tell a correct render from a scrambled one. Check that each image's `sourceUri` Drive id appears in the expected document order.
