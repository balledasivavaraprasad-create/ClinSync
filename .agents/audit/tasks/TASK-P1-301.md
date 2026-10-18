# TASK ID: TASK-P1-301
- **Owner**: person-1 (Frontend / Product Experience)
- **Branch**: `feat/p1-301-ledger-diff-ui`
- **Workstream**: Frontend & Product Experience (`apps/web/**`)
- **Status**: IMPLEMENTED / VERIFIED

## Goal and Acceptance Criteria
- [x] Document upload UX with drag-and-drop, supported types (PDF, PNG, JPG), size validation (max 10MB), accessible progress, and error retry.
- [x] Processing status tracking (`UPLOADED`, `PROCESSING`, `EXTRACTED`, `FAILED`) adhering to canonical OpenAPI contract.
- [x] Clinical Context Ledger rendering fact category, value, unit, clinical/recorded timestamps, and confidence/uncertainty score.
- [x] Strict clinical provenance and status styling (reported, extracted_unverified, historical_recorded, doctor_confirmed, uncertain, conflicting, rejected) — never styling extracted facts as verified by default.
- [x] Patient Context Diff UI clearly distinguishing New facts, Changed facts (side-by-side historical vs current), Historical facts, and Unresolved Contradictions.
- [x] Prominent Unresolved Conflicts alert with side-by-side claim comparison and physician review actions.
- [x] Source document and citation navigation linking directly to actual documents and pages (never invented sources).
- [x] Accessible, tablet-first responsive layout with loading, empty, error, retry, and completed states.
- [x] Comprehensive unit and integration test coverage passing for all Phase 3 components (19/19 tests in ledger-diff suite, 69/69 passed across 5 suites).

## Files Created / Modified
- `apps/web/src/features/documents/DocumentUploadZone.tsx`
- `apps/web/src/features/documents/DocumentViewerModal.tsx`
- `apps/web/src/features/patient-context/ClinicalContextLedger.tsx`
- `apps/web/src/features/patient-context/ContextDiffView.tsx`
- `apps/web/src/features/patient-context/LedgerDiffHub.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/test/ledger-diff.test.tsx`
- `.agents/audit/tasks/TASK-P1-301.md`

## Contracts & Dependencies
- Contracts Affected: None (strictly read-only consumer of `packages/contracts/openapi.json`)
- Dependencies Satisfied: `TASK-P1-201`, `TASK-P2-201`, `TASK-P3-201` (all merged on `main`)
- Parallel Work Allowed: Built and verified with typed mock adapter; live API integration ready for `TASK-P2-301`.

## Verification & Test Results
- `npm --prefix apps/web test`: PASSED (69/69 passed across 5 test suites in 4.13s)
- `npm --prefix apps/web run lint`: PASSED (0 errors, 0 warnings)
- `npm --prefix apps/web run typecheck`: PASSED (0 errors)
- `npm --prefix apps/web run build`: PASSED (built in 1.99s)
- `npm run contracts:validate`: PASSED (15 endpoints, 25 schemas)
- `git diff --check`: PASSED (Clean whitespace, 0 formatting errors)

## Security & Safety Checks
- Redacted / Synthetic data only verified: YES
- No raw patient PII in traces: YES
- No credentials or secrets exposed to frontend: YES
- `.env.example` protected and untracked from commit: YES

## Next Dependency-Ready Task
- `TASK-P1-401` (Appointment & Scheduling UI) — Phase 4 / Gate G4
