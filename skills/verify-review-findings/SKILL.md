---
name: verify-review-findings
description: "Verifies pull request review findings one by one, from automated reviewers (Codex, Copilot, /code-review) or humans, before deciding whether to change code. Use when the user pastes review comments or says 「看看 PR 上的 review」「幫我核實 codex 的留言」."
---

# Verify Review Findings

## 核心原則

**先核實，再決定。不要照著建議直接改。** 照單全收等於把判斷權交給一個沒跑過你的程式碼的工具。

finding 有四種常見狀態，處置完全不同：

| 狀態 | 處置 |
|---|---|
| 成立，且由本次 PR 造成 | 在**同一個 PR** 修掉，不要讓已知缺陷合併進 main |
| 成立，但是既有問題 | 回報並問要不要另開 PR。不要偷偷擴大這個 PR 的範圍 |
| 事實正確，但影響被高估 | 說清楚實際影響有多大，讓使用者判斷值不值得改 |
| 不成立 | 說明為什麼，附證據 |

嚴重度 badge（P1/P2/P3）是 reviewer 的判斷，不是事實。**核實後自己給嚴重度**，並說明差異在哪。

## 流程

### 1. 取得完整的 finding

review 留言散在三個不同的 API endpoint，只撈一個會漏：

```bash
# 1. inline comment（掛在特定行上的，`gh pr view` 看不到）
gh api repos/{owner}/{repo}/pulls/<PR>/comments \
  --jq '.[] | "═══ \(.path):\(.line // .original_line)  [\(.user.login)]\n\(.body)\n"'

# 2. review 本體的總結留言（Codex 的整體評語常在這裡）
gh api repos/{owner}/{repo}/pulls/<PR>/reviews \
  --jq '.[] | select(.body != "") | "═══ [\(.user.login)] \(.state)\n\(.body)\n"'

# 3. PR 討論串（bot 有時直接留在這）
gh api repos/{owner}/{repo}/issues/<PR>/comments \
  --jq '.[] | "═══ [\(.user.login)]\n\(.body)\n"'
```

`{owner}/{repo}` 是 `gh` 的 placeholder，會自動代入當前 repo，不用手打。

使用者貼上的片段可能不完整，仍要撈一次完整清單，避免漏掉其他條目。

### 2. 逐條核實 —— 這是本 skill 的重點

對每一條，**讀實際的程式碼或設定**，不要憑 finding 的敘述判斷。優先順序：

1. **能實測就實測。** 跑指令、跑測試、在暫存目錄重現。實測結果勝過任何推理。
2. **不能實測就讀原始碼**，包含 vendor 裡的框架與套件實作。
3. **都不行才推論**，並在回報時標明「這是推論，不是實測」。

實測的例子：

```bash
# finding 說「parent revision 的 composer.lock 已經是過期狀態」
T=$(mktemp -d)
git show <sha>:composer.json > "$T/composer.json"
git show <sha>:composer.lock > "$T/composer.lock"
(cd "$T" && composer validate --no-check-all)   # → 確認 lock 真的過期
rm -rf "$T"
```

### 3. 特別檢查三件事

- **是不是本次 PR 造成的？** 用 `git log`／`git diff origin/main` 確認那段程式碼是誰改的。這決定該在同 PR 修還是另開。
- **finding 有沒有把既有問題歸因給本次改動？** 這是最常見的 reviewer 偏誤。
- **建議的修法是不是最好的？** finding 常給一個可行但不是最佳的做法。核實後可以提出更好的替代方案，並說明為何。

### 4. 回報

每條給：**判定**（成立／部分成立／不成立）、**依據**（實測輸出或原始碼位置）、**建議處置**。

如果推翻了自己先前的說法，直接更正，不要含糊帶過。

## 護欄

- 不因 P1/P2 badge 就照建議改，也不因為是機器產生的就整批忽略
- 不把 finding 的敘述當成已驗證的事實轉述給使用者
- 使用者說「先核實」就**只核實，不要改**
- 修正只處理本次 PR 造成的缺陷；既有問題先問，不擴大 PR 範圍
- 不因單一 finding 就 force push 或改寫已推送的歷史
