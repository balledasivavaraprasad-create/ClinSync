# ClinSync Integration Audit

> **Single-writer rule:** Only the Integration Captain edits this file. Other contributors write a unique `.agents/audit/<ISSUE-ID>.md` handoff and link their PR. Update this file at integration checkpoints using verified evidence, not intentions.

## Project status

- **Current phase:** Phase 0 (G0) Complete; Phase 1 Parallel Foundations READY
- **Integration Captain:** Person 2 (Backend and Integration Captain)
- **Dependency Graph:** `docs/DEPENDENCY_GRAPH.md`
- **CI/CD & Auto-Merge Protocol:** `docs/CI_CD_AND_AUTO_MERGE.md`
- **Product scope:** `docs/PRODUCT_BRIEF.md`
- **UI/UX direction:** `docs/UI_UX_DIRECTION.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Model/provider strategy:** `docs/MODEL_PROVIDER_STRATEGY.md`
- **Backend standards:** `docs/BACKEND_ENGINEERING_STANDARDS.md`
- **API contract status:** Established in `docs/API_CONTRACTS.md` and `packages/contracts/openapi.json` (OpenAPI 3.1.0 validated)
- **Demo data:** Synthetic only
- **Real-world clinical validation:** Not performed; required before real-world use

## Overall status

| Workstream | Owner | Status | Branch / PR | Evidence | Blocker |
|---|---|---|---|---|---|
| Phase 0: G0 Repository & Contracts Foundation | Person 2 | VERIFIED | `main` | `docs/DEPENDENCY_GRAPH.md`, openapi.json validated, CI governance passing | None |
| TASK-P1-101: Web App Shell & Design Tokens | Person 1 | INTEGRATED | `main` | 31 web tests pass, design tokens & layout shell integrated | None |
| TASK-P2-101: FastAPI App Core & SQLite | Person 2 | INTEGRATED | `main` | 12 tests pass, Alembic lifecycle verified, error schema conforms | None |
| TASK-P3-101: Model Gateway & Offline Evals | Person 3 | INTEGRATED | `main` | 14 tests pass, Gemini/Groq gateway, guardrails, eval runner verified | None |
| TASK-P2-201: Patient APIs & Identity Gating | Person 2 | INTEGRATED | `main` | 34 tests pass, candidate masking, DOB gate, encounter answers verified | None |
| CI / shared integration | Person 2 | VERIFIED | `main` | Governance checks pass; conditional app matrix configured | None |

Allowed statuses: `NOT_STARTED`, `BLOCKED`, `READY`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `INTEGRATED`.

## Readiness checklist

- [ ] Hospital/doctor demo access works with synthetic credentials.
- [x] A patient candidate must be confirmed before history is displayed.
- [x] New synthetic patient can complete a bounded intake.
- [ ] A sample PDF/image can be attached and extracted facts retain source metadata.
- [x] Clinical Context Ledger distinguishes reported, extracted-unverified, historical and doctor-confirmed facts.
- [ ] Patient Context Diff shows meaningful new/changed/historical/conflicting context.
- [ ] Deterministic demo policy routes a predefined high-risk scenario to the configured escalation path.
- [ ] Routine scenario books a seeded slot; conflicting booking is rejected.
- [ ] Doctor queue shows the encounter and source-linked brief; audio has a safe text fallback.
- [ ] Golden tests include invalid model output, unsupported source claims and prompt injection.
- [ ] Gemini generation adapter works with `GEMINI_API_KEY` and has schema/output validation.
- [ ] Optional Groq fallback is disabled by default and works only for declared text-only generation tasks when explicitly enabled.
- [ ] Provider errors never produce fake success; invalid/uncertain outputs use deterministic fallback or human review.
- [ ] No direct OpenAI provider/key is present in the baseline.
- [x] CI passes on the integrated branch (governance check verified).
- [ ] The system can be started and demo data reset from a clean checkout.
- [ ] UI screenshot review covers main and failure states.
- [x] Known mocks, deferred features and non-validated behavior are documented.

## Integration checkpoints

### Foundation (Milestone A)

- [x] Owners and Integration Captain assigned (Teammate A: Web, Teammate B: API & Captain, Teammate C: AI & Evals).
- [x] Ownership boundaries and working-directory strategy confirmed (`docs/TEAM_OWNERSHIP.md`, `docs/COLLABORATION_PROTOCOL.md`).
- [x] First version of `docs/API_CONTRACTS.md` and `packages/contracts/openapi.json` validated (15 endpoints, 25 schemas).
- [x] Environment variable names documented in `.env.example`; values kept out of Git.
- [x] Target repository structure established across all modules (`apps/web`, `apps/api`, `apps/ai`, `packages/contracts`, `evals`).
- [x] CI `quality-gates` aggregate workflow and auto-merge protocol configured (`.github/workflows/ci.yml`, `docs/CI_CD_AND_AUTO_MERGE.md`).
- [x] Known-good base commit and governance CI confirmed.

### Application foundation (Milestone B)

- [ ] Frontend can run against contract-conforming mocks.
- [ ] API can save and retrieve synthetic patient and intake state.
- [ ] AI workflow returns validated structured facts with sources/status.
- [ ] CI checks for initialized components run.

### Integrated system

- [ ] Booking transaction, doctor queue and brief are connected.
- [ ] Identity, policy and failure cases tested.
- [ ] Demo data reset is reproducible.
- [ ] Safe screenshots and trace identifiers are captured.

### Release candidate

- [ ] Clean-checkout rehearsal completed by someone who did not implement the entire path.
- [ ] CI is green on the candidate commit.
- [ ] Known limitations are documented and visible to the presenter.
- [ ] No unresolved critical identity disclosure, unsafe routing or double-booking issue.

## Decision log

| Decision | Reason | Owner | Status |
|---|---|---|---|
| Synthetic patient data only | Protect privacy and avoid implying clinical validation | Integration Captain (assign) | ACTIVE |
| Single writer for shared contracts and central audit | Reduce shared-file merge conflicts | Integration Captain (assign) | ACTIVE |
| Deterministic safety and booking gates | Model output is not authoritative for clinical escalation or transactions | Integration Captain (assign) | ACTIVE |
| Gemini generation + deterministic decision rules; optional Groq fallback | Preserve clear model-versus-policy boundaries and safe provider failure behavior | Integration Captain + AI owner | DOCUMENTED; IMPLEMENTATION NOT STARTED |
| SQL is authoritative; retrieval index/memory are derived | Preserve data integrity and traceability | API + AI owners | ACTIVE |
| CSS/SVG/Motion before 3D; 3D requires a documented product reason | Keep the kiosk elegant and fast without unnecessary complexity | Web owner | ACTIVE |

## Model integration status

- Provider plan is documented in `docs/MODEL_PROVIDER_STRATEGY.md` and ADR-007.
- `.env.example` contains placeholders only. No API keys have been provided or verified.
- Gemini is the primary provider; Groq is optional and disabled by default. Provider adapters have not been implemented or live-tested.
- Model ID is configurable and must be checked against each provider's current catalog/account access.

## Known limitations / deferred work

- Real biometric capture/matching and storage: deferred; simulate candidate matching for demo.
- Clinical diagnosis or validated triage: out of scope; only predefined synthetic policy scenarios.
- Live EHR, real hospital data and external patient notifications: deferred.
- Production-grade security/privacy review, clinical validation and deployment authorization: required before real-world use; not established by prototype tests.
