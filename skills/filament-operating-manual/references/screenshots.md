# Screenshots — the quality contract

What makes a screenshot correct, independent of who takes it. The batch runner implements these rules; read this file when a shot comes out wrong, when writing `targets:` in `plan.yaml`, or before falling back to the manual routine at the end.

Honor the **read-only guardrails** in `SKILL.md` throughout — never submit/save/delete, and dismiss every modal you open.

## Box extent — the thing most often wrong

**The box is the bounding rect of the element being annotated.** Match it to the annotation's conceptual scope (`planning.md → Annotations`): *the smallest container that fully bounds the subject and nothing unrelated*. Decide the tier before picking a target, because a successfully placed label says nothing about whether the box was the right size.

| Subject | Box | `targets:` expression |
|---|---|---|
| One field | the field wrapper — label + control together, never the bare `<label>` | `field:<label>` |
| A group of fields acting as one unit | their common fieldset, else the nearest enclosing section. One box, one label — not one box per field | `field-group:<a>\|<b>`, `fieldset:<legend>` |
| A whole feature area | that section, identified by its heading text | `section:<heading>` |
| An action button | the button or link | `action:<text>` |
| A table column | the column header | `table-column:<heading>` |
| A tab strip | the whole tab bar | `tablist:<tab>` |
| A row | the first visible row containing the text | `row:<text>` |
| The table | the whole table | `table` |
| The open modal | the dialog | `modal` |
| The page title area | the header above the content | `page-header` |
| Exact rendered text | its nearest meaningful container | `text:<text>` |
| Anything else | — | `selector:<CSS>` — see below |

`table` / `modal` / `page-header` name a unique element, so they take no argument and are written bare (a trailing colon would make YAML read them as a map). Add a name to disambiguate when a screen really has two: `table:客戶`.

An unresolvable target fails the shot rather than silently falling back to something smaller. If a target genuinely cannot be expressed, that is a planning problem — fix `plan.yaml`, don't loosen the box.

### `selector:` is a last resort, and usually a missing word

Raw CSS in `plan.yaml` couples the manual's content to one admin's markup, so a shot that needs it will break on any restyle. Before reaching for it, check whether what you mean already has a word — most `selector:` usages turn out to be "the table", "the modal", or "the page header" written the long way.

If a genuinely new concept keeps recurring, add a target type rather than repeating the CSS.

## How a target resolves — and why it usually needs no configuration

Each type runs a chain of strategies, portable first:

1. **Semantic HTML** — `<table>`, `<fieldset><legend>`, `<section>`, `<label for>` → its control
2. **ARIA** — `role="dialog"`, `role="tab"`, `role="columnheader"`, `aria-expanded`
3. **A project selector** from `manual.config.json → selectors`

The first strategy that finds *exactly one* visible element wins. An admin with accessible markup therefore configures nothing; one built from bare divs configures only the types that actually fail — and the failure message names the exact config key to add.

`field:` deserves a note because it is the most used: it finds the label, then walks up until an ancestor also contains a form control. That ancestor *is* the field wrapper, in any markup, with no framework class involved.

## Annotation placement

`__ann(target, label)` returns `{ ok, sideUsed, reason }` and **auto-flips** through left → right → top → bottom, returning `ok: true` only when the label clears the viewport edge, does not overlap the fixed sidebar, and does not overlap any label already placed in this overlay. Overlap avoidance is remembered across calls within one screenshot, so several annotations on one image will not collide.

- Never screenshot until every annotation returned `ok: true`.
- `ok: false` means all four sides are blocked: shorten the label, pick a smaller target, or raise the viewport height.
- **Font size is fixed at FONT=32** so the red text stays readable after the image is downscaled to `IMAGE_WIDTH_PT` in the Doc (≈10pt at 460pt / 1920px capture). Never shrink FONT to make a label fit — shorten the text or raise the viewport. The sizing formula is in `annotator.js`.

Verifying placement in JS is far cheaper than reading the PNG back into the model. Reserve a PNG re-read for what the annotator cannot detect — a label sitting inside the viewport but on top of content.

## Masking personal data

Screens showing real people's data must have it masked **before** the shot, so the manual never publishes real PII. Which routes count is declared per project in `manual.config.json → sensitiveRoutes` (`build.md`); `mask:` in `plan.yaml` supplements it for a specific shot.

Mask **after** normalizing, pre-actions, and annotating, so the red callouts stay sharp. Use a CSS blur on the value, never a black bar — blur reads as intentional redaction and keeps the layout intact.

- **Form field** → blur the value side only, keep the label sharp.
- **Table column** → blur the matching cell in every row; also blur avatar images.
- **Behind a modal** → blur the underlying row cells too; a dimmed backdrop still leaks names and IDs.
- Leave non-identifying, teaching-relevant controls visible (a 啟用 toggle, a 本國/外籍 switch). Mask names, contact info, ID numbers, birthdates, addresses, avatars.

Blur radius ~7–8px at capture resolution stays unreadable after the Doc downscales it. Note in the final report which screens were masked.

## Page state

Every screenshot should end up with the sidebar fully open with text labels, and only the active group expanded — or all groups expanded on Dashboard / no-active-group pages. `state-normalizer.js` enforces this.

- **Re-run the state normalizer after every pre-action.** Livewire morphdom resets Alpine state.
- **Never `fullPage: true`** — it collapses the sidebar. Use viewport mode and raise the height for tall pages (the normalizer returns `{h}`; 1400 / 1700 are the usual steps).
- **Set sidebar group collapse declaratively** via `Alpine.store('sidebar').collapsedGroups`; click-toggling races with Alpine.
- **CSS `outline` is invisible against Filament section backgrounds** — annotations use the SVG overlay, not outlines.

## Manual routine (diagnosis only)

The batch runner in `build.md` is the normal path. Drive the browser by hand only to investigate why a shot fails, or for a one-off the runner cannot express. Per shot:

1. Navigate to the screen's `url` from the plan, resolving `{record}` to a representative record.
2. Read `${CLAUDE_SKILL_DIR}/references/state-normalizer.js` and evaluate its body in the page.
3. Run any `pre_actions`, re-running the normalizer after each.
4. Read `${CLAUDE_SKILL_DIR}/references/annotator.js` and evaluate its body — after navigation it is gone, so install fresh.
5. Call `window.__ann(target, label)` once per annotation; confirm each returned `ok: true`.
6. Mask PII per the rules above.
7. Screenshot in viewport mode.
8. Upload per `google-docs.md → Upload a screenshot to Drive`.

If this succeeds where the runner failed, the difference is the bug — usually an instruction the runner's pre-action vocabulary cannot express, or a target that needs an explicit `targets:` entry in `plan.yaml`.
