# Antigravity Task Prompt Template

Copy this template into an issue-specific prompt. Fill every section before asking an agent to edit files.

```text
You are implementing ClinSync. First read AGENTS.md, AUDIT.md, docs/TEAM_OWNERSHIP.md,
docs/ARCHITECTURE.md, docs/API_CONTRACTS.md, and the relevant .agents/skills/<skill>/SKILL.md.

ISSUE: <issue-id and link>
OWNER / WORKSTREAM: <Teammate A web | Teammate B API/integration | Teammate C AI/evals>
GOAL: <one clear outcome>
ACCEPTANCE CRITERIA:
- <testable condition>
- <testable condition>

ALLOWED PATHS (you may edit only these):
- <path>

PROHIBITED PATHS (do not edit):
- <path>

CONTRACTS / DEPENDENCIES:
- Use docs/API_CONTRACTS.md version/status: <value>
- Use mock adapter/fixture if a dependency is not merged.

REQUIRED SKILLS:
- <.agents/skills/name/SKILL.md>

QUALITY REQUIREMENTS:
- Follow the existing design/architecture; no speculative framework or dependency changes.
- Validate untrusted input and keep health information synthetic.
- Add/update tests for changed behavior.
- Preserve source provenance and explicit uncertainty where applicable.
- Do not silently modify files owned by another teammate.

BEFORE EDITING:
- Inspect git status and current relevant files.
- Return a brief plan and identify any cross-workstream dependency.
- If the task needs a prohibited/shared file change, stop and request a handoff instead of editing it.

BEFORE HANDOFF:
- Run applicable checks and report exact commands/results.
- Run git diff --check and inspect the changed file list.
- Update .agents/audit/<ISSUE-ID>.md with changed paths, checks, screenshot/API evidence, limitations and next step.
- Do not edit AUDIT.md; the Integration Captain owns it.
- Do not claim unverified work succeeded.
```
