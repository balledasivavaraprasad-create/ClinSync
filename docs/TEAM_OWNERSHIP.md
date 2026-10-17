# Team Ownership and Conflict Prevention

## Three workstreams — assign real names before parallel implementation

| Person | Role | Primary owned paths | Main deliverables |
|---|---|---|---|
| **Teammate A** | Product UI/UX + web frontend | `apps/web/**`; `docs/UI_UX_DIRECTION.md`; visual QA evidence under `.agents/audit/visual/**` | Patient kiosk, identity/consent screens, adaptive intake UI, upload states, booking flow, doctor console, design system, motion, responsive/accessibility checks |
| **Teammate B** | Backend + database + Integration Captain (default) | `apps/api/**`; `packages/contracts/**`; migrations; `docs/API_CONTRACTS.md`; `docs/ARCHITECTURE.md`; `docs/TEAM_OWNERSHIP.md`; `docs/MODEL_PROVIDER_STRATEGY.md`; `AGENTS.md`; `AUDIT.md`; `.agents/**`; `.github/**`; shared root configuration including `.env.example` | FastAPI modules, SQLAlchemy models, authorization, file metadata/storage adapter, booking transactions, audit events, canonical contracts, provider/config documentation, CI/release coordination |
| **Teammate C** | Agentic AI + RAG + evaluations | `apps/ai/**`; `evals/**`; AI-specific tests/fixtures; propose shared workflow/skill changes through the captain | LangGraph workflows, Gemini generation adapter, optional Groq fallback, deterministic decision logic, structured extraction, source retrieval, Context Ledger assembly, Patient Context Diff logic, doctor brief generation, golden evals and trace instrumentation |

The default makes Teammate B the Integration Captain because backend and API contracts are central integration boundaries. The team may choose another captain, but must make that choice before parallel implementation and update ownership records in one setup PR.

The Integration Captain is a coordinator and shared-file owner, not a fourth developer and not the only person allowed to code. Other contributors own their paths and must deliver independently testable changes.

## Exact ownership rules

- Teammate A is the sole routine editor of `apps/web/**` and `docs/UI_UX_DIRECTION.md`. Other workstreams provide requirements through issues or PR comments.
- Teammate B is the sole routine editor of `apps/api/**` and database migrations. Coordinate migration order; never create competing migrations from two branches.
- Teammate C is the sole routine editor of `apps/ai/**` and `evals/**`.
- Teammate B is the only routine editor of shared contracts, root architecture instructions, central `AUDIT.md`, CI, CODEOWNERS and shared root config. Changes are proposed by issue and merged through a reviewed PR.
- Each workstream owner may maintain its own app-specific dependency manifest and lockfile. Root/shared dependency manifests and lockfiles have one owner at a time (Integration Captain).
- Changes to `packages/contracts/**` or `docs/API_CONTRACTS.md` must be called out in the PR description. Frontend and AI may not independently create competing contract shapes.
- Everyone may read all files. Ownership restricts editing, not consultation.

## Path-boundary matrix

| Path | A — Web | B — API/Integrator | C — AI/Evals |
|---|---:|---:|---:|
| `apps/web/**` | Write | Read / request changes | Read / request changes |
| `apps/api/**` | Read / request changes | Write | Read / request changes |
| `apps/ai/**` | Read / request changes | Read / request changes | Write |
| `evals/**` | Read / request changes | Read / request changes | Write |
| `packages/contracts/**` | Request changes | Write | Request changes |
| `docs/API_CONTRACTS.md` | Request changes | Write | Request changes |
| `docs/ARCHITECTURE.md` | Propose via issue | Write | Propose via issue |
| `docs/UI_UX_DIRECTION.md` | Write | Propose via issue | Propose via issue |
| `AGENTS.md`, `AUDIT.md`, `.agents/**`, `.env.example`, `.github/**`, shared model config docs | Request changes | Write | Request changes |

“Request changes” means open an issue or comment with the intended contract and acceptance criteria; do not edit another owner's files directly. A temporary handoff must identify files, scope and completion condition in writing.

## Branch and PR policy

- `main` is protected; no direct pushes to `main`.
- Use person-prefixed task branches following the convention:
  - Person 1 (Web): `feat/p1-<task-id>-<description>` (Initial: `feat/p1-web-shell`)
  - Person 2 (API/Integration): `feat/p2-<task-id>-<description>` (Initial: `feat/p2-api-core`)
  - Person 3 (AI/Evals): `feat/p3-<task-id>-<description>` (Initial: `feat/p3-ai-gateway`)
- Every contributor's completed task must be integrated into `main` via PR.
- PRs must pass the aggregate `quality-gates` status check in GitHub Actions before being merged.
- PRs utilize GitHub automated squash merging (`gh pr merge --auto --squash`) when eligible.
- See `docs/CI_CD_AND_AUTO_MERGE.md` for full instructions.

## Antigravity concurrency rules

- Prefer one clone per person. If multiple Antigravity sessions run on one computer, every session gets its own Git worktree and branch.
- Never run two agents against the same working directory concurrently.
- Every task prompt must specify issue ID, goal, owned paths, prohibited paths, contract version, acceptance checks and commands to run.
- Never ask agents to “improve the whole project.” Delegate a narrow deliverable with explicit file boundaries.
- If a task requires changing another workstream's files, stop and request a handoff; do not make a convenient cross-boundary edit.
- Lock/handoff shared dependency manifests, contracts and migrations before editing them.

## Handoff record

Create `.agents/audit/<ISSUE-ID>.md` with issue/PR/owner, goal and acceptance criteria, files changed, commands and test results, screenshots/API example, contract changes, known limitations, next steps and blockers.

Only the Integration Captain updates `AUDIT.md`; never have everyone append to one shared progress file.
