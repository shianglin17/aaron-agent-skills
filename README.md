# aaron-agent-skills

Agent skills for personal projects, following the open [Agent Skills](https://agentskills.io) format. They work in Claude Code, Codex, OpenCode, and other tools that read `SKILL.md`.

個人專案用的 agent skills：PR review 核實、AWS／GCP／Cloudflare 的雲端單一入口，以及把既有系統做成架構說明站。內文以繁體中文為主。

## Skills

| Skill | What it does |
|---|---|
| [`verify-review-findings`](skills/verify-review-findings/SKILL.md) | Verifies PR review findings one by one before changing any code. |
| [`cloud-architect`](skills/cloud-architect/SKILL.md) | One entry for AWS, Google Cloud, and Cloudflare: learn a service, evaluate and price options, design an architecture, set up resources with Terraform. Facts come from official sources. |
| [`architecture-site`](skills/architecture-site/SKILL.md) | Turns an existing codebase into a multi-page, diagram-led architecture site: one reader question per page, linked diagram and side panel, code line refs pinned to a commit. Ships a page skeleton and check scripts. |

## Install

### With `npx skills` (any supported agent)

```bash
# all skills, user-level
npx skills add shianglin17/aaron-agent-skills -g

# pick agents or skills
npx skills add shianglin17/aaron-agent-skills -g -a claude-code -a codex
npx skills add shianglin17/aaron-agent-skills -g --skill cloud-architect

# list without installing
npx skills add shianglin17/aaron-agent-skills --list
```

Drop `-g` to install into the current project instead.

### As a Claude Code plugin marketplace

```text
/plugin marketplace add shianglin17/aaron-agent-skills
/plugin install review@aaron-skills
/plugin install cloud@aaron-skills
/plugin install architecture@aaron-skills
```

| Plugin | Skills |
|---|---|
| `review` | `verify-review-findings` |
| `cloud` | `cloud-architect` |
| `architecture` | `architecture-site` |

## `cloud-architect` at a glance

```text
/cloud-architect [learn|eval|design|setup] [aws|gcp|cloudflare] <topic>
```

| Mode | What it does |
|---|---|
| `learn` | Explains a service: purpose, limits, pricing model, pitfalls, equivalents on other clouds. |
| `eval` | Asks about constraints, shortlists candidates, verifies facts, estimates cost in three scenarios, compares, and writes a report. |
| `design` | Fills a checklist (network, HA and DR, IAM, encryption and secrets, monitoring, scaling), runs a Well-Architected review, and draws a diagram. |
| `setup` | Uses the CLI for read-only checks only. Changes go through Terraform: `plan` first, `apply` after you confirm. |

Without a mode, it infers one from your request.

It routes to the official skills in [aws/agent-toolkit-for-aws](https://github.com/aws/agent-toolkit-for-aws), [google/skills](https://github.com/google/skills), and [cloudflare/skills](https://github.com/cloudflare/skills) on demand, without installing or copying them. It works best with the [AWS Knowledge MCP server](https://knowledge-mcp.global.api.aws) and the [Cloudflare docs MCP server](https://docs.mcp.cloudflare.com/mcp) (both need no account).

## License

[MIT](LICENSE)
