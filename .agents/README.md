# Antigravity Agent Configuration

## Instruction hierarchy

- Root `AGENTS.md`: repository-wide rules and non-negotiable guardrails.
- `.agents/skills/<skill-name>/SKILL.md`: focused task playbooks; load only relevant skill(s).
- `docs/`: canonical product, UX, architecture, contracts, backend standards and quality rules.
- `AUDIT.md`: integrated progress and verified evidence; single writer only.
- `.agents/audit/<ISSUE-ID>.md`: per-issue contributor handoff.

Do not copy the full product specification into every skill. Skills should state when they apply, permitted paths, required inputs, implementation sequence, contracts, tests and failure modes.

## Shared-file discipline

- Shared contracts, `AGENTS.md`, `AUDIT.md`, central architecture docs, root configuration and `.github/**` have the single owner defined in `docs/TEAM_OWNERSHIP.md`.
- Each workstream creates its own issue handoff. Never append status updates to someone else's handoff.
- A branch does not prevent conflicts when two branches edit the same lines. Respect ownership and request explicit handoffs.
- If a needed change crosses a workstream, create a contract-change issue and agree on the interface before editing another owner's path.

## Skill selection

- React kiosk, doctor console, interaction implementation → `web-frontend`
- Design tokens, visual hierarchy, Motion, optional 3D decisions → `design-system-motion`
- Screenshot comparison, viewport/accessibility visual verification → `visual-qa`
- FastAPI routes, Pydantic, services and authorization → `fastapi-backend`
- SQLAlchemy models, migrations, data invariants and transactions → `database-integrity`
- Shared schemas and cross-workstream API changes → `api-contracts`
- LangGraph state, bounded loops, Gemini generation, optional Groq fallback and deterministic decision routing → `agentic-workflow`
- Source-linked clinical facts and longitudinal history → `clinical-context-ledger`
- PDF/OCR/retrieval/indexing → `document-ingestion-rag`
- Access, privacy, prompt injection and escalation → `security-privacy`
- Golden datasets, traces and AI evaluation → `testing-evals`
- Branches, worktrees, PRs and ownership → `git-collaboration`
- Merge, CI, reproducibility and release → `integration-release`

## Skill file format

Every skill begins with YAML front matter:

```yaml
---
name: short-skill-name
description: When this skill should be loaded and what it helps accomplish.
---
```

There are 13 focused skills at the time this scaffold was prepared. Skills are instruction files, not automatically running agents. In Antigravity, explicitly include the relevant skill path in the task prompt when needed and follow the current tool's skill-discovery conventions.
