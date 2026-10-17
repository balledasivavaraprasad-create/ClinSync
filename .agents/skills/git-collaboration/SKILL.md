---
name: git-collaboration
description: Use when planning branches, splitting tasks across teammates/Antigravity sessions, handling Git conflicts, preparing PRs or updating handoff notes.
---

# Git Collaboration Skill

## Before assigning work

Break work by directory and interface, not vague feature labels. Every issue must have one owner, one branch, allowed paths, prohibited shared paths, acceptance criteria and test commands.

## Safe parallelism

- Use separate clones per teammate. If multiple local AI sessions run in parallel, each uses its own worktree and branch.
- One writer per file at a time. Shared documents, API schemas, lockfiles, migrations and CI use explicit ownership.
- Freeze API schemas before the frontend/backend/AI implementation branches fan out.
- Work against mocks/fixtures generated from the frozen contracts; don't block on another workstream's unmerged code.
- Never ask multiple agents to rewrite or "clean up" the whole repository.

## Git workflow

- Issue branch names: `feat/<workstream>-<issue>`, `fix/<issue>`, `docs/<issue>`.
- Use small commits and one coherent PR per issue.
- Before starting, inspect `git status` and fetch updates. Never discard another person's uncommitted work.
- Follow the team's agreed update strategy. If using rebase, only rebase your own branch; don't rewrite shared branches.
- Never force-push to `main`, push to another person's branch or merge unreviewed contract changes.
- Resolve conflicts with file owner present; don't blindly accept ours/theirs on API/schema or data files.

## Audit protocol

Contributor writes `.agents/audit/<ISSUE-ID>.md` (unique filename) with changed files, tests and limitations. Integration Captain merges and updates `AUDIT.md`. Do not let three agents edit the same status checklist concurrently.

## If a conflict occurs

1. Stop editing the conflicting file.
2. Notify its owner and integration captain.
3. Compare the change intent, not only textual markers.
4. Preserve both required behaviors or agree to drop one explicitly.
5. Run the relevant tests after resolution.
6. Add a note in issue/PR if the conflict reveals an unclear ownership boundary.
