## Task Information
- **Task ID**: `TASK-`
- **Contributor**: Person 1 (Web) / Person 2 (Backend & Captain) / Person 3 (AI & Evals)
- **Branch**: `feat/`
- **Related Issue**: Closes #

## Summary of Changes
- Provide concise bullet points explaining what was done.

## Scope / Owned Paths Verified
- [ ] Changes are strictly within permitted paths for this task
- [ ] No uncoordinated edits to shared governance files (`AGENTS.md`, `AUDIT.md`, `packages/contracts/**`)

## Pre-Merge Verification Checklist (Step A)
- [ ] Local linters and formatters passed (`git diff --check`)
- [ ] API contract validation passed (`npm run contracts:validate`)
- [ ] Unit tests executed and passed
- [ ] Integration tests executed and passed (where applicable)
- [ ] Evaluator / golden evals executed and passed (where applicable)
- [ ] Production build / typecheck succeeded
- [ ] Security check: Zero secrets, active API keys, or raw patient data in code, logs, or traces

## Contract & Data Schema Impact
- [ ] No API contract changes
- [ ] Contract changes proposed, reviewed, and approved via issue/PR: #

## Risk & Failure Behavior
- **Failure Mode Handled**:
- **What Remains Mocked / Unverified**:

## Handoff & Auto-Merge Eligibility
- [ ] Task audit record updated at `.agents/audit/tasks/<TASK-ID>.md`
- [ ] Relevant `SKILL.md` instructions followed
- [ ] Eligible for auto-merge via `gh pr merge --auto --squash` upon passing `quality-gates`
