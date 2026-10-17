# AGENTS.md — ClinSync Repository Rules

These instructions apply to Antigravity, AI coding agents, and human contributors. Read the relevant skill before changing a workstream. Repository documentation is the durable source of truth; advice from chat is not a substitute for recording an approved decision here.

## Mission

Build ClinSync: a premium, tablet-first, hospital-controlled patient intake and clinician handoff web app. It should feel calm, credible, polished and effortless for a first-time patient, while giving clinicians an efficient, evidence-first workspace. The backend and AI workflow must be as carefully engineered as the UI.

Optimize for a complete, trustworthy, reproducible patient journey—not maximum feature count, flashy animation, or the number of AI frameworks.

## Non-negotiable rules

1. **Inspect before editing.** Read this file, `AUDIT.md`, `docs/DEPENDENCY_GRAPH.md`, `docs/CI_CD_AND_AUTO_MERGE.md`, the task issue, `docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`, `docs/COLLABORATION_PROTOCOL.md`, `docs/API_CONTRACTS.md`, `docs/TEAM_OWNERSHIP.md`, and the applicable skill. Inspect the current tree and tests first.
2. **One issue, one branch, one owner.** Do not take over another contributor's files or broaden scope without explicit agreement.
3. **Respect file ownership.** See `docs/TEAM_OWNERSHIP.md`. Never modify shared contracts, root configuration, shared lockfiles, CI, `AGENTS.md`, or `AUDIT.md` unless you are their named owner or have a handoff.
4. **No speculative rewrites.** Do not change frameworks, folder structure, dependencies, data model, API contracts, or lint/test settings without an issue, an approved entry in `docs/ARCHITECTURE_DECISIONS.md`, and approval from the Integration Captain.
5. **Contracts before parallel implementation.** Use `docs/API_CONTRACTS.md` and `packages/contracts/` as the interface. If an interface needs to change, propose the change; do not silently drift.
6. **No false claims.** Never state a feature works unless it is implemented and tested. Mark mocks, seeded/demo responses, TODOs and unverified integrations clearly.
7. **Protect health data.** Use synthetic data only. Do not place secrets, real patient information, biometrics, raw transcripts, or API keys in Git, screenshots, traces, fixtures, or logs.
8. **LLMs are untrusted components.** Validate structured output with code and schemas. Never execute model-generated SQL/shell, trust a model-provided patient ID, or let retrieved documents override system instructions.
9. **Identity before disclosure.** Face matching may produce candidate(s), never automatic access. Require suitable secondary identity confirmation before exposing any patient information. Provide a non-biometric fallback.
10. **Safety before scheduling.** The model can extract/report facts but cannot independently decide medical urgency. Run configured deterministic demo rules and a human escalation path before routine slot matching.
11. **No silent conflict resolution.** Preserve competing clinical statements and their sources. Mark uncertainty; do not invent a reconciled fact.
12. **Bounded agent loops.** Set maximum steps, timeouts, retry limits and fallback behavior. Stop and escalate rather than looping indefinitely.
13. **Tests with changes.** Add or update tests for changed behavior. Never weaken a failing test or disable a check just to make CI green without documented approval.
14. **Keep PRs small.** One cohesive change per PR; avoid sweeping formatting changes. Do not commit generated builds, local databases, model files or secrets.
15. **Do not edit `AUDIT.md` directly.** Contributors write a unique handoff file under `.agents/audit/`. The Integration Captain is its sole writer.
16. **Design quality is a requirement.** Do not ship a generic scaffold UI. Follow `docs/UI_UX_DIRECTION.md`, implement complete interaction states, and capture screenshots for significant screens. Visual polish must never obscure clinical clarity, safety, or accessibility.
17. **3D is optional, not a goal by itself.** Start with CSS/SVG and Motion for React. Add Three.js/React Three Fiber only when a clearly defined interaction improves the patient experience and remains performant, accessible, and usable without WebGL.
18. **Backend quality is a product feature.** Keep route handlers thin, put business rules in services, validate every boundary, use transaction-safe booking, and test authorization and failure paths.

## Required work protocol

### Before coding

- Identify the issue ID, workstream and permitted paths.
- State a short implementation plan and acceptance criteria in the issue.
- Check `git status`; never overwrite uncommitted work.
- Read the relevant `SKILL.md` file(s).
- Confirm the current API contract and add a mock/fixture if another workstream is not merged yet.
- Tell Antigravity the exact allowed paths and explicitly list paths it must not edit.

### While coding

- Keep changes inside owned paths.
- Reuse existing helpers and patterns; do not duplicate shared logic in multiple workstreams.
- Validate external/model output at the boundary (Pydantic/Zod or equivalent).
- Keep audit logging structured and redact sensitive content.
- Do not run multiple Antigravity sessions against the same working tree. Use separate clones or Git worktrees.
- For long-running changes, commit a small working slice before expanding scope.

### Automated post-implementation & merge protocol (Steps A to F)

Follow `docs/CI_CD_AND_AUTO_MERGE.md`:
1. **Step A (Local Verification)**: Run formatters/linters, `git diff --check`, `npm run contracts:validate`, unit/integration/eval tests, and build. Verify zero secrets or real patient data.
2. **Step B (Commit & Push)**: Stage only task-permitted files. Commit with `feat(<scope>): <TASK-ID> <desc>`. Push to authorized contributor branch (`feat/p...`). **Never push to `main`.**
3. **Step C (PR & Auto-Merge)**: Open PR targeting `main` using `.github/pull_request_template.md`. Enable auto-merge via `gh pr merge --auto --squash`.
4. **Step D (CI Status Check)**: GitHub Actions executes `ci.yml`. The required aggregate `quality-gates` status check must pass. Never attempt to bypass failing checks.
5. **Step E (Conflict Safety)**: Reconcile conflicts from `origin/main` within owned paths only. Never discard uncommitted work.
6. **Step F (Integration Confirmation)**: Fetch merged `main`. Confirm CI passes on `main`. Contributor updates `.agents/audit/tasks/<TASK-ID>.md`. Person 2 (Integration Captain) updates central `AUDIT.md`.

## Architecture defaults

- Web: React + TypeScript + Vite unless the approved architecture decision changes.
- UI animation: Motion for React (`motion/react`) for deliberate transitions/layout changes; CSS for simpler effects. Honor `prefers-reduced-motion`.
- Workflow state lives in active LangGraph state / durable workflow persistence as required; it is not dumped into vector memory.
- SQL database is authoritative for patient, encounter, appointment and approval records.
- LlamaIndex handles document ingestion/retrieval only when that path is actually implemented and tested.
- Mem0 is optional and must not become the authoritative clinical record. Do not integrate it merely for a stack checklist.
- Scheduling and access-control invariants are enforced in application code and database transactions, not prompts.
- Prefer one explicit, bounded graph/workflow with specialized nodes to many independent autonomous agents.
- Read `docs/MODEL_PROVIDER_STRATEGY.md` before wiring any model provider.
- Gemini is the primary generation/extraction provider. Every structured output must be schema-validated and checked against source/provenance constraints.
- Bounded choices should use deterministic state machines, allowlists and backend policy logic wherever practical. Gemini may suggest a candidate, but it is not authoritative for clinical policy or side effects.
- Provider failures must be handled explicitly: Gemini generation may use an enabled Groq fallback only for eligible text tasks; otherwise use a safe deterministic/manual-review path. Never fake success.
- Every generated medical fact shown as historical context must preserve its source and verification status.
- No `OPENAI_API_KEY` or separate paid decision-model provider is required in the baseline. Do not add a new provider without an approved architecture decision describing cost, value, data handling and evaluation.
- Groq is an optional text-generation fallback only. Do not use it for a task requiring an unsupported modality or assume its models support Gemini-specific behavior.

## Definition of done

A task is done only when its acceptance criteria are met; changes stay within ownership; checks pass; UI/API behavior is demonstrated; failure paths are handled; evidence/trace behavior is checked where applicable; docs and audit handoff are updated; and a reviewer can run the feature from repository instructions.
