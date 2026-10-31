# aaron-agent-skills

Agent skills for personal projects, following the open [Agent Skills](https://agentskills.io) format. They work in Claude Code, Codex, OpenCode, and other tools that read `SKILL.md`.

個人專案用的 agent skills：PR review 核實，以及 AWS／GCP／Cloudflare 雲端架構評估。內文以繁體中文為主。

## Skills

| Skill | What it does |
|---|---|
| [`verify-review-findings`](skills/verify-review-findings/SKILL.md) | Verifies PR review findings one by one before changing any code. |
| [`cloud-eval`](skills/cloud-eval/SKILL.md) | Evaluates AWS, Google Cloud, and Cloudflare architectures: requirements discovery, service selection, cost estimates, cross-cloud comparison, all backed by official sources. |

## Install

### With `npx skills` (any supported agent)

```bash
# all skills, user-level
npx skills add shianglin17/aaron-agent-skills -g

# pick agents or skills
npx skills add shianglin17/aaron-agent-skills -g -a claude-code -a codex
npx skills add shianglin17/aaron-agent-skills -g --skill cloud-eval

# list without installing
npx skills add shianglin17/aaron-agent-skills --list
```

Drop `-g` to install into the current project instead.

### As a Claude Code plugin marketplace

```text
/plugin marketplace add shianglin17/aaron-agent-skills
/plugin install review@aaron-skills
/plugin install cloud@aaron-skills
```

| Plugin | Skills |
|---|---|
| `review` | `verify-review-findings` |
| `cloud` | `cloud-eval` |

## `cloud-eval` at a glance

```text
/cloud-eval aws|gcp|cloudflare|compare [project or topic]
```

1. Ask about constraints before proposing anything.
2. Shortlist candidates.
3. Verify prices, quotas, GA status, and regional availability against official sources.
4. Estimate monthly cost in low, likely, and high scenarios, with a script.
5. Compare and list risks.
6. Write a report in Traditional Chinese, conclusion first.

It works best with the [AWS Knowledge MCP server](https://knowledge-mcp.global.api.aws) and the [Cloudflare docs MCP server](https://docs.mcp.cloudflare.com/mcp) (both need no account), and falls back to fetching official docs when a server is not installed. It links to the official skills in [aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws), [google/skills](https://github.com/google/skills), and [cloudflare/skills](https://github.com/cloudflare/skills) but does not copy them.

## License

[MIT](LICENSE)
