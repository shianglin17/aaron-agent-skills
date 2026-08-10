# Edit — changing a manual that already exists

Use this path when the Doc already contains the manual. Unlike `build.md`, this one is **interactive and surgical**: it touches only the slice the user asked about, and it must not regenerate the Doc.

**`plan.yaml` is the single source of truth; the Doc is a render of it.** But the user often edits the Doc directly between sessions, and their wording is usually better — more concise, fewer code-y nouns. So whenever the Doc has improved on the plan for the thing you are about to change, **absorb that improvement into `plan.yaml` first, then push plan → Doc.** Otherwise you clobber their polish.

Everything that exists only in `plan.yaml` — annotations, shot paths, capture intent — stays authoritative there by default; nothing to argue about, because plan is the source.

## Per requested change

1. **Fetch the live Doc** — `gws docs documents get … --params '{"documentId":"<id>","includeTabsContent":true}'`. Parse with Python; pull tabs, paragraph styles + text, and inline image objectIds per tab.
2. **Read `plan.yaml`** — the current intent + annotations + shot paths.
3. **Merge (the critical step)** — for the slice being changed, compare plan vs Doc. If the Doc is better, **edit `plan.yaml`** to adopt the Doc's version. After this, `plan.yaml` is current and at least as good as the Doc on the part being touched. Skip this and step 5 silently overwrites the user's polish. Do not skip it.
4. **Apply the requested change to `plan.yaml`** (following `planning.md`). Now `plan.yaml` represents the desired final state.
5. **Push only the changed slice** to the Doc per `google-docs.md` (text edit / remove / add / swap, in the sequence that file prescribes). Never a wholesale re-push. Then **Verify** per `google-docs.md`.

### Criteria for "the Doc is better" (step 3)

| Situation | Take from |
|---|---|
| `plan` violates Voice & vocab (code identifiers like `/items/<id>`, framework primitives like Block / Repeater / picker, subjective filler like 「最關鍵的是」) and the Doc doesn't | **Doc** → write into plan |
| Doc lost a precise condition that plan had (e.g. plan says 「未被取消過且日期晚於今天」, Doc generalised to 「可取消狀態」) | **plan** → keep |
| Both pass the rules; difference is pure stylistic preference | **plan** → don't churn |
| Genuine judgment call (correctness + style trade-off) | **show the diff to the user**, let them decide; don't silently choose |

Show your work: when you absorb a Doc improvement into plan, mention it briefly so the user can see the merge happened.

## Re-shooting one image

To replace a screenshot without rebuilding, capture just that shot and swap it in the Doc:

```bash
npm run compile
npm run capture -- --append --ids=<manifest id or image path>
npm run check
```

Review it as in `build.md → AI review`, `npm run promote`, then follow `google-docs.md → Swap a screenshot`. Swapping is delete + insert at the same index — never `replaceImage`, which crops to the old image's box.

For a single shot the runner is still the right tool; drop to the manual browser routine in `screenshots.md` only to diagnose why the runner failed.

## Optional: full plan ↔ Doc consistency check

Only when the user asks, or after a long string of edits. Fetch the Doc, diff *every* heading + SUBTITLE against `plan.yaml`, and list every difference. Don't auto-apply — drift accumulates for a reason and the user should choose. This is a health check, not a routine step.

## Permission demos

A permission-effect screenshot (toggle a permission, save, capture the resulting sidebar/list change) is the one place this skill writes to the admin, and the one thing that is never unattended. The batch runner reports `capture: manual-permission-demo` shots as `manual_required` and refuses to perform them.

To capture one: get explicit user confirmation **this session**, make the change, capture, then **restore the original permission state and verify it is back**. See the guardrail in `SKILL.md`.
