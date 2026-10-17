# Working with ChatGPT + Antigravity + GitHub

## Roles in the development loop

- **Human project lead (you):** owns product direction, priorities, final approval and deciding whether a feature is in scope.
- **ChatGPT — on-demand architecture copilot:** helps decompose requirements, design contracts/workflows, inspect pasted diffs/logs/screenshots, review test coverage, find failure modes and plan the next issue.
- **Antigravity — implementation agent:** edits only the assigned paths, runs checks, reports evidence and writes an issue-specific handoff.
- **GitHub — durable source of truth:** issues, commits, PRs, CI results, approved decisions and the central audit record.

Important operating boundary: ChatGPT does not automatically watch the repository, receive background updates or inspect a new commit unless repository/tool access is explicitly available or you provide the relevant files, diff, CI output or screenshots in the conversation. Keep all approved decisions and task status in this repo so context never depends on chat memory alone.

## Standard loop for every issue

### 1. Plan

Give ChatGPT the issue goal, current repo state, relevant docs, constraints and any blocker. Ask for:
- a narrow task definition;
- permitted and prohibited file paths;
- dependencies and contract changes;
- acceptance criteria and failure cases;
- a concise Antigravity task prompt based on `.agents/TASK_PROMPT_TEMPLATE.md`.

If the work changes an API/domain contract, ask for a proposal first. The Integration Captain records the approved contract change before affected workstreams implement against it.

### 2. Assign

Create a GitHub issue and assign exactly one person as implementation owner. Put the allowed paths and acceptance criteria in the issue. Add the relevant skill paths. Do not assign the same shared file to multiple people.

### 3. Implement in Isolated Workspace

The owner opens or uses a branch that is unique to the task (`feat/p<id>-<task-id>-<description>`) and works in their own clone or Git worktree. Paste the task prompt into Antigravity. Require the agent to inspect first, return a plan, edit only allowed paths, add tests, and update `.agents/audit/tasks/<TASK-ID>.md`.

### 4. Automated Post-Implementation Lifecycle (Steps A to F)

Every completed task must execute the following automated integration sequence:

#### Step A — Verify Local Changes
1. Confirm git status and active feature branch.
2. Run formatters and linters (`git diff --check`).
3. Run API contract validation (`npm run contracts:validate`).
4. Execute unit, integration, and evaluation tests for modified components.
5. Verify zero secrets, real patient data, or unmasked credentials exist.

#### Step B — Commit and Push Contributor Branch
1. Stage only approved files belonging to the task.
2. Create a structured commit: `feat(<scope>): <TASK-ID> <description>`.
3. Push to the authorized contributor branch on `origin`.
4. **Never push directly to `main`.**

#### Step C — Create or Update PR & Enable Auto-Merge
1. Create PR targeting `main` using `.github/pull_request_template.md`.
2. Ensure task ID, scope, test evidence, and acceptance criteria are documented.
3. Enable squash auto-merge using GitHub CLI:
   ```bash
   gh pr merge --auto --squash
   ```

#### Step D — GitHub Actions CI Verification
1. GitHub Actions runs `.github/workflows/ci.yml`.
2. The aggregate `quality-gates` status check evaluates all jobs (`contracts`, `governance`, `web`, `api`, `ai`).
3. If CI fails, do not force merge: inspect logs (`gh run view --log-failed`), correct code on the branch, and push fixes.

#### Step E — Handle Conflicts Safely
1. If PR conflicts with `origin/main`, fetch `origin/main` and reconcile inside owned paths only.
2. Stop if conflict involves shared contracts or another contributor's work.
3. Re-run local verification and push.

#### Step F — Confirm Integration
1. Fetch latest remote state: `git checkout main && git pull origin main`.
2. Confirm PR was merged into `main` and integration checks pass.
3. Contributor updates task audit: `.agents/audit/tasks/<TASK-ID>.md`.
4. Person 2 (Integration Captain) updates central `AUDIT.md`.

### 5. Choose the Next Dependency-Ready Task

Consult `docs/DEPENDENCY_GRAPH.md` to pick the next task marked `READY`. Proceed with parallel development without waiting on independent workstreams.

## Messages to use

### Ask ChatGPT to plan a task

```text
Act as ClinSync's architecture copilot. Read the attached/current:
AGENTS.md, AUDIT.md, docs/TEAM_OWNERSHIP.md, docs/ARCHITECTURE.md,
docs/API_CONTRACTS.md and the relevant skill.

Issue goal:
<goal>

Current verified state:
<status, PRs, tests, blocker>

Produce a narrow implementation task for <Teammate A/B/C>. Include allowed paths,
prohibited paths, contract dependencies, acceptance criteria, failure cases,
required tests and an Antigravity prompt. Do not assume unverified features exist.
```

### Ask Antigravity to implement

Use `.agents/TASK_PROMPT_TEMPLATE.md`; keep one goal and one owner. Never ask it to build the whole project or edit across all three workstreams.

### Ask ChatGPT to review a change

```text
Review this ClinSync PR as a strict architecture and reliability reviewer.
Treat the repo docs and API contracts as authoritative. Inspect for correctness,
security/privacy, contract drift, path ownership violations, missing tests,
failure handling and frontend quality. Report only actionable findings with
severity, file/path, reproduction or rationale, and a concrete correction.
Here are the diff, test output, CI result and screenshots:
<paste evidence>
```

## Shared-file safety protocol

If an agent says it needs another workstream's file:
1. It must stop before editing that path.
2. Create a clear request in the issue/PR with the field/interface change needed.
3. The file owner or Integration Captain changes the canonical file.
4. All consumers pull the updated contract and adapt in their own branches.

No merge-conflict prevention scheme can guarantee zero conflicts. This workflow minimizes risk through clear ownership, narrow tasks, separate worktrees, canonical contracts and verified small PRs.
