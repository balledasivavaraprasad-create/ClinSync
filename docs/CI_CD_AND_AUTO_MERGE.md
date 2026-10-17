# ClinSync CI/CD, Automated Verification and Auto-Merge Protocol

This document defines the automated verification, branch management, pull request, and merge lifecycle for all ClinSync contributors.

---

## 1. Overview of the Automated Lifecycle

Every task transitions from implementation to production code through this invariant sequence:

```text
[Implement in owned paths]
           │
           ▼
[Step A: Local Tests & Checks]
  ├── Formatters / linters / git diff --check
  ├── Contract validation (npm run contracts:validate)
  ├── Component unit / integration / eval tests
  └── Build / typecheck verification
           │
           ▼
[Step B: Commit & Push Branch]
  ├── Commit to feat/p<id>-<task-id>-<description>
  └── Push to origin (Never push directly to main)
           │
           ▼
[Step C: Create PR & Enable Auto-Merge]
  ├── gh pr create --fill (using .github/pull_request_template.md)
  └── gh pr merge --auto --squash
           │
           ▼
[Step D: GitHub Actions CI Execution]
  ├── contracts & governance checks
  ├── web, api, ai component checks (when initialized)
  └── aggregate quality-gates check
           │
           ▼
[Step E: Automatic Merge Execution]
  ├── GitHub automatically squashes and merges PR into main
  └── If CI fails or conflicts occur: stop, fix on branch, re-push
           │
           ▼
[Step F: Post-Merge Integration Confirmation]
  ├── git fetch origin && git checkout main && git pull
  ├── Verify clean integration state
  └── Update .agents/audit/tasks/<TASK-ID>.md (Person 2 updates AUDIT.md)
```

---

## 2. Three-Person Branch Strategy

All feature development occurs on short-lived contributor branches:

- **Person 1 (Frontend)**:
  - Baseline branch: `feat/p1-web-shell`
  - Subsequent tasks: `feat/p1-<TASK-ID>-<description>`
  - Owned paths: `apps/web/**`
- **Person 2 (Backend & Integration Captain)**:
  - Baseline branch: `feat/p2-api-core`
  - Subsequent tasks: `feat/p2-<TASK-ID>-<description>`
  - Owned paths: `apps/api/**`, shared governance files (`docs/**`, `packages/contracts/**`, root configuration)
- **Person 3 (AI Workflows & Evals)**:
  - Baseline branch: `feat/p3-ai-gateway`
  - Subsequent tasks: `feat/p3-<TASK-ID>-<description>`
  - Owned paths: `apps/ai/**`, `evals/**`

### Branch Invariants
1. `main` is protected: **No direct pushes to `main` are permitted.**
2. Never force-push or rewrite history on another contributor's branch.
3. Every branch must rebase or merge from `origin/main` before starting dependent tasks.
4. Uncommitted work must never be discarded during synchronization.

---

## 3. Step-by-Step Command Guide

### Step A: Local Verification
Run these commands locally before staging or pushing:

```bash
# 1. Check working directory status
git status

# 2. Verify whitespace and formatting
git diff --check

# 3. Validate canonical OpenAPI contracts
npm run contracts:validate

# 4. Run component tests (depending on workstream)
# Web:
npm --workspace=apps/web run lint --if-present
npm --workspace=apps/web test --if-present
npm --workspace=apps/web run build --if-present

# API:
cd apps/api && python -m pytest tests/unit tests/integration tests/contract

# AI:
cd apps/ai && python -m pytest tests/
```

### Step B: Commit and Push
```bash
# Stage only files belonging to the task (never blind git add .)
git add <permitted_files>

# Commit with descriptive message referencing the Task ID
git commit -m "feat(api): implement TASK-P2-101 base models and sqlite session"

# Push to your contributor branch on origin
git push -u origin feat/p2-TASK-ID-description
```

### Step C: Create Pull Request & Enable Auto-Merge
Using GitHub CLI (`gh`):

```bash
# Create the PR targeting main using the repository template
gh pr create --base main --head feat/p2-TASK-ID-description --title "feat: TASK-P2-101 FastAPI core and persistence" --body-file .github/pull_request_template.md

# Enable automatic squash merge upon passing CI checks
gh pr merge --auto --squash
```

### Step D: Monitor CI
```bash
# Watch the CI status checks until quality-gates completes
gh pr checks --watch
```

### Step E: Handling Conflicts or CI Failures
If CI fails:
1. View logs: `gh run view --log-failed`
2. Fix issues within your permitted paths.
3. Rerun local tests.
4. Commit and push the fix: `git push origin feat/p...` (CI will automatically re-run).

If merge conflicts arise with `origin/main`:
```bash
git fetch origin
git merge origin/main
# Resolve conflicts inside owned paths only
git commit -m "chore: merge origin/main into feature branch"
git push origin feat/p...
```

### Step F: Confirm Integration
Once GitHub merges the PR:
```bash
# Synchronize local main
git checkout main
git pull origin main

# Record task completion in task audit
# Contributor updates: .agents/audit/tasks/<TASK-ID>.md
# Person 2 (Captain) updates: AUDIT.md
```

---

## 4. GitHub Configuration Requirements

To support this automated integration lifecycle, the repository on GitHub requires the following settings:

### 1. Repository General Settings
- **Allow squash merging**: Enabled (default commit message: Pull request title and description).
- **Allow auto-merge**: Enabled (`Settings -> General -> Pull Requests -> Allow auto-merge`).
- **Automatically delete head branches**: Enabled (cleans up short-lived feature branches upon merge).

### 2. Branch Protection Rules for `main`
In `Settings -> Branches -> Add branch protection rule`:
- **Branch name pattern**: `main`
- **Require a pull request before merging**: Enabled.
  - Require approvals: Optional for routine low-risk PRs; mandatory for security/database changes.
  - Dismiss stale pull request approvals when new commits are pushed: Enabled.
- **Require status checks to pass before merging**: Enabled.
  - Require branches to be up to date before merging: Enabled.
  - Status checks that must pass:
    - **`quality-gates`** (The aggregate CI status check).
- **Do not allow bypassing the above settings**: Enabled.
- **Restrict force pushes & deletions**: Enabled.

---

## 5. High-Impact Review Boundaries

Automatic merging without human review is strictly limited to low-risk, component-internal changes.

The following changes **require explicit review by the Integration Captain or affected owner** before merge:
1. Shared API contracts (`packages/contracts/openapi.json`, `docs/API_CONTRACTS.md`).
2. Authentication, authorization, and patient isolation rules.
3. Database schemas and Alembic migrations.
4. Deterministic clinical escalation and emergency safety policies.
5. Slot booking concurrency and transaction logic.
6. CI workflow definitions (`.github/workflows/ci.yml`).
