# ClinSync Dependency Graph and Task Register

> **Single-writer rule**: Maintained exclusively by Person 2 (Backend and Integration Captain). Other contributors consult this graph and log task execution in `.agents/audit/tasks/<TASK-ID>.md`.

---

## 1. Task State Machine

All tasks transition strictly through the following states:

```text
[NOT_STARTED]
      |
      v
  [BLOCKED] <-------------------+ (Dependency failed or schema mismatch)
      |                         |
      v                         |
   [READY] (All dependencies met or approved contract mock)
      |
      v
[IN_PROGRESS]
      |
      v
[IMPLEMENTED] (Code written, awaiting test execution)
      |
      v
  [VERIFIED] (All required unit/contract/eval tests executed and passed)
      |
      v
[INTEGRATED] (Merged into integration branch and CI checks passed)
```

---

## 2. Phase Gates Overview

- **G0 — Repository & Contracts Foundation**: Inventory complete, ownership recorded, OpenAPI 3.1.0 contracts validated, task register established, CI `quality-gates` job configured, automated branch push & auto-merge protocol established (`docs/CI_CD_AND_AUTO_MERGE.md`).
- **G1 — Parallel Engineering Foundations**: Frontend shell/mock starts, FastAPI backend health passes, Gemini model gateway works offline with fakes, eval harness executes. Contributor PRs pass `quality-gates` and merge automatically via squash.
- **G2 — Patient Intake Vertical Slice**: Safe registration/retrieval, structured intake persisted in SQLite, LangGraph turns bounded and evaluated.
- **G3 — Document Ingestion & Context Ledger**: Provenance-linked facts extracted, Clinical Context Ledger distinguishes status, Patient Context Diff compares encounters.
- **G4 — Safety Gates & Atomic Booking**: Deterministic escalation enforced, slots booked with concurrency transaction safety, guardrails prevent LLM bypassing rules.
- **G5 — Doctor Handoff & Consultation**: Doctor queue links to verified brief and source citations, doctor review/approval events persisted.
- **G6 — Integrated Release Verification**: End-to-end patient journey verified, CI passes on `main`, golden evals pass, visual QA verified on tablet viewports.

---

## 3. Master Task Register

### Phase 0: G0 — Repository & Contracts Foundation

#### `TASK-P2-000`
- **Title**: Phase 0 Repository Inventory, Architecture Audit & Dependency Graph Definition
- **Owner**: `person-2`
- **Status**: `VERIFIED`
- **Permitted Paths**: `docs/**`, `packages/contracts/**`, `AGENTS.md`, `AUDIT.md`, `.agents/**`, `.github/**`
- **Depends On**: None
- **Contract Dependencies**: `packages/contracts/openapi.json`
- **Acceptance Criteria**:
  - Full codebase inventory conducted.
  - Ownership boundaries and collaboration rules documented.
  - OpenAPI 3.1.0 contracts validated.
  - Task register and dependency graph established.
  - CI governance check verified.
- **Required Tests**: `npm run contracts:validate`, CI governance bash test.

---

### Phase 1: Parallel Engineering Foundations (Gate G0 Required)

#### `TASK-P1-101`
- **Title**: React + Vite + TypeScript Shell, Design Tokens & Mock Adapter
- **Owner**: `person-1`
- **Status**: `READY`
- **Permitted Paths**: `apps/web/**`
- **Depends On**: `TASK-P2-000`
- **Contract Dependencies**: `packages/contracts/openapi.json` (frozen contract mock)
- **Acceptance Criteria**:
  - React + TypeScript + Vite app initialized in `apps/web`.
  - Design-token system established (colors, typography, surfaces, spacing) adhering to `docs/UI_UX_DIRECTION.md`.
  - Motion for React (`motion/react`) configured with reduced-motion support.
  - Typed mock API adapter matching `packages/contracts/openapi.json`.
  - Tablet-first responsive layout shell.
  - Clean lint, type-check, and production build.
- **Required Tests**: `npm run lint`, `npm run build` in `apps/web`.

#### `TASK-P2-101`
- **Title**: FastAPI Backend Core, SQLite Lifecycle & Base Persistence Models
- **Owner**: `person-2`
- **Status**: `READY`
- **Permitted Paths**: `apps/api/**`
- **Depends On**: `TASK-P2-000`
- **Contract Dependencies**: `packages/contracts/openapi.json`
- **Acceptance Criteria**:
  - FastAPI application initialized in `apps/api` with `/api/v1/health`.
  - SQLite database engine and session dependency configured with WAL mode and foreign key pragmas.
  - Base SQLAlchemy models for `Patient`, `Encounter`, and `AuditEvent`.
  - Standard error envelope (`code`, `message`, `request_id`, `field_errors`) matching API contract.
  - Base Alembic migrations setup.
- **Required Tests**: `pytest` unit test for health endpoint and DB session fixture in `apps/api`.

#### `TASK-P3-101`
- **Title**: Gemini Provider Gateway, Normalized Errors & Offline Eval Harness
- **Owner**: `person-3`
- **Status**: `READY`
- **Permitted Paths**: `apps/ai/**`, `evals/**`
- **Depends On**: `TASK-P2-000`
- **Contract Dependencies**: None (internal gateway abstraction)
- **Acceptance Criteria**:
  - Provider abstraction in `clinsync_ai/providers/base.py` and `gemini.py`.
  - Offline testing capability using deterministic fakes (no mandatory remote keys in local CI).
  - Bounded timeouts, retries, and normalized error mapping.
  - Eval runner in `evals/` capable of evaluating synthetic datasets against assertions.
  - First synthetic golden case for structured extraction.
- **Required Tests**: `pytest` running offline mock provider tests and baseline evaluation assertions.

---

### Phase 2: Patient Intake Vertical Slice (Gate G1 Required)

#### `TASK-P2-201`
- **Title**: Patient Registration, Identity Confirmation & Encounter Persistence APIs
- **Owner**: `person-2`
- **Status**: `BLOCKED` (Waiting on G1: `TASK-P2-101`)
- **Permitted Paths**: `apps/api/app/**`, `apps/api/tests/**`
- **Depends On**: `TASK-P2-101`
- **Contract Dependencies**: `/api/v1/identity/candidates`, `/api/v1/identity/confirm`, `/api/v1/encounters`
- **Acceptance Criteria**:
  - Candidate lookup returns masked suggestions with no medical history.
  - Secondary confirmation gate required before patient context can be retrieved.
  - POST `/api/v1/encounters` creates persistent encounter tied to confirmed patient.
  - POST `/api/v1/encounters/{id}/answers` validates and stores intake turn data.
- **Required Tests**: API integration tests verifying patient isolation and identity gate enforcement.

#### `TASK-P3-201`
- **Title**: LangGraph Adaptive Intake Workflow & Fact Extraction
- **Owner**: `person-3`
- **Status**: `BLOCKED` (Waiting on G1: `TASK-P3-101`)
- **Permitted Paths**: `apps/ai/clinsync_ai/**`, `evals/**`
- **Depends On**: `TASK-P3-101`
- **Contract Dependencies**: `ClinicalFact` schema in `packages/contracts/openapi.json`
- **Acceptance Criteria**:
  - LangGraph workflow state: `known`, `missing`, `uncertain`, `conflicting`.
  - Asks relevant follow-up questions one turn at a time.
  - Enforces hard stop on maximum turn count (bounded loop).
  - Validates extracted facts against Pydantic schema before returning.
- **Required Tests**: Workflow unit tests and golden eval tests covering missing data and stop limits.

#### `TASK-P1-201`
- **Title**: Patient Kiosk UI, Identity Confirmation & Conversational Intake Flow
- **Owner**: `person-1`
- **Status**: `BLOCKED` (Waiting on G1: `TASK-P1-101`)
- **Permitted Paths**: `apps/web/src/features/patient-kiosk/**`, `apps/web/src/features/patient-intake/**`
- **Depends On**: `TASK-P1-101` (can develop against frozen contract mocks until `TASK-P2-201` is integrated)
- **Contract Dependencies**: `/api/v1/identity/**`, `/api/v1/encounters/**`
- **Acceptance Criteria**:
  - Kiosk welcome screen with language selection and biometric candidate prompt.
  - Secondary confirmation screen (DOB/demographics).
  - Non-biometric manual registration fallback screen.
  - Voice intake interface with dynamic listening, thinking, speaking, and text fallback states.
  - Touch-accessible review and correction before submission.
- **Required Tests**: Component tests and visual state coverage for kiosk views.

---

### Phase 3: Document Ingestion, Context Ledger & Diff (Gate G2 Required)

#### `TASK-P2-301`
- **Title**: Document Upload, Storage & Extraction Metadata APIs
- **Owner**: `person-2`
- **Status**: `BLOCKED` (Waiting on G2)
- **Permitted Paths**: `apps/api/app/api/v1/routes/**`, `apps/api/app/services/**`
- **Depends On**: `TASK-P2-201`
- **Contract Dependencies**: `/api/v1/encounters/{id}/documents`, `/api/v1/documents/{id}/status`, `/api/v1/encounters/{id}/ledger`
- **Acceptance Criteria**:
  - Validates document MIME types (PDF, PNG, JPEG) and file size caps.
  - Secure storage adapter generating deterministic checksums.
  - Persists extraction job state (`UPLOADED`, `PROCESSING`, `EXTRACTED`, `FAILED`).
  - Stores validated `ClinicalFact` records linked to source document ID.
- **Required Tests**: Integration tests for upload boundaries and document-encounter associations.

#### `TASK-P3-301`
- **Title**: LlamaIndex Extraction, Clinical Context Ledger & Patient Context Diff Engine
- **Owner**: `person-3`
- **Status**: `BLOCKED` (Waiting on G2)
- **Permitted Paths**: `apps/ai/clinsync_ai/documents/**`, `apps/ai/clinsync_ai/clinical_context/**`
- **Depends On**: `TASK-P3-201`
- **Contract Dependencies**: `ClinicalFact`, `LedgerResponse`, `DiffResponse`
- **Acceptance Criteria**:
  - Extracts facts preserving document ID and page number provenance.
  - Builds Clinical Context Ledger with distinct status (`reported`, `extracted_unverified`, `historical_recorded`, `doctor_confirmed`).
  - Computes Patient Context Diff (new, changed, conflicting facts).
  - Unresolved conflicts flagged explicitly without silent reconciliation.
- **Required Tests**: Eval cases verifying provenance tracking, contradiction surfacing, and no invented facts.

#### `TASK-P1-301`
- **Title**: Document Upload & Clinical Context Ledger / Diff UI
- **Owner**: `person-1`
- **Status**: `BLOCKED` (Waiting on G2)
- **Permitted Paths**: `apps/web/src/features/documents/**`, `apps/web/src/features/patient-context/**`
- **Depends On**: `TASK-P1-201`
- **Contract Dependencies**: `/api/v1/encounters/{id}/ledger`, `/api/v1/encounters/{id}/diff`
- **Acceptance Criteria**:
  - Tablet document capture/upload interface with progress bars.
  - Interactive Clinical Context Ledger viewer displaying source badges, dates, and verification status.
  - Visual Patient Context Diff highlighting additions and conflicts in distinct treatment colors.
- **Required Tests**: Component tests for ledger rendering and source drawer inspection.

---

### Phase 4: Safety Gates, Specialty Routing & Appointments (Gate G3 Required)

#### `TASK-P2-401`
- **Title**: Deterministic Safety Policy Engine & Atomic Slot Booking Transaction
- **Owner**: `person-2`
- **Status**: `BLOCKED` (Waiting on G3)
- **Permitted Paths**: `apps/api/app/services/**`, `apps/api/app/api/v1/routes/**`
- **Depends On**: `TASK-P2-301`
- **Contract Dependencies**: `/api/v1/encounters/{id}/routing-review`, `/api/v1/appointments/**`
- **Acceptance Criteria**:
  - Deterministic evaluation rules: high-risk red flags trigger mandatory `URGENT_ESCALATION`.
  - Routine cases route to allowlisted departments.
  - Query seeded available doctor appointment slots.
  - Atomically book slot within a database transaction; second concurrent booking must fail with `SLOT_UNAVAILABLE`.
- **Required Tests**: Concurrency tests asserting slot double-booking is rejected.

#### `TASK-P3-401`
- **Title**: Constrained Specialty Recommendation & Triage Guardrails
- **Owner**: `person-3`
- **Status**: `BLOCKED` (Waiting on G3)
- **Permitted Paths**: `apps/ai/clinsync_ai/guardrails/**`, `apps/ai/clinsync_ai/routing/**`
- **Depends On**: `TASK-P3-301`
- **Contract Dependencies**: `/api/v1/encounters/{id}/routing-review`
- **Acceptance Criteria**:
  - AI suggests candidate specialty mapped strictly to allowlisted hospital department IDs.
  - Guardrail prevents AI from overriding deterministic emergency escalation thresholds.
  - Handles out-of-scope or malicious injection prompts safely.
- **Required Tests**: Adversarial prompt injection tests and ambiguous presentation eval cases.

#### `TASK-P1-401`
- **Title**: Appointment Slot Selection, Conflict Handling & Escalation UI
- **Owner**: `person-1`
- **Status**: `BLOCKED` (Waiting on G3)
- **Permitted Paths**: `apps/web/src/features/appointments/**`
- **Depends On**: `TASK-P1-301`
- **Contract Dependencies**: `/api/v1/appointments/**`
- **Acceptance Criteria**:
  - Available slot picker displaying doctor name, department, and time slots.
  - Immediate escalation screen with clear clinical guidance when urgent routing triggers.
  - Conflict recovery state when slot becomes unavailable.
  - Booking confirmation summary card.
- **Required Tests**: UI state tests for slot booking and escalation alerts.

---

### Phase 5: Doctor Handoff & Consultations (Gate G4 Required)

#### `TASK-P2-501`
- **Title**: Doctor Queue, Consultation Notes & Approval Persistence
- **Owner**: `person-2`
- **Status**: `BLOCKED` (Waiting on G4)
- **Permitted Paths**: `apps/api/app/api/v1/routes/**`, `apps/api/app/services/**`
- **Depends On**: `TASK-P2-401`
- **Contract Dependencies**: `/api/v1/doctors/{id}/queue`, `/api/v1/encounters/{id}/approvals`
- **Acceptance Criteria**:
  - Doctor queue endpoint filtered by assigned department and booked appointments.
  - POST `/api/v1/encounters/{id}/approvals` records doctor sign-off and updates clinical record status to `DOCTOR_CONFIRMED`.
  - Appends audit event with doctor ID, timestamp, and corrections.
- **Required Tests**: Integration tests for doctor approval lifecycle and audit events.

#### `TASK-P3-501`
- **Title**: Evidence-Backed Doctor Brief & Optional Spoken Summary Generation
- **Owner**: `person-3`
- **Status**: `BLOCKED` (Waiting on G4)
- **Permitted Paths**: `apps/ai/clinsync_ai/**`, `evals/**`
- **Depends On**: `TASK-P3-401`
- **Contract Dependencies**: `/api/v1/encounters/{id}/brief`
- **Acceptance Criteria**:
  - Synthesizes concise doctor brief strictly from validated Clinical Context Ledger facts.
  - Every claim includes explicit citation to fact and source document ID.
  - Zero fabricated citation IDs (enforced by assertion).
  - Optional spoken summary text generated with text-fallback safety.
- **Required Tests**: Evals asserting 100% citation coverage and refusal to invent ungrounded medical facts.

#### `TASK-P1-501`
- **Title**: Doctor Dashboard, Sourced Brief Reader & Audio Player
- **Owner**: `person-1`
- **Status**: `BLOCKED` (Waiting on G4)
- **Permitted Paths**: `apps/web/src/features/doctor-dashboard/**`, `apps/web/src/features/doctor-brief/**`
- **Depends On**: `TASK-P1-401`
- **Contract Dependencies**: `/api/v1/doctors/**`, `/api/v1/encounters/{id}/brief`
- **Acceptance Criteria**:
  - Doctor workstation queue with triage priority indicators.
  - Evidence-backed brief reader with clickable citations linking to source document drawer.
  - Spoken brief audio player with waveform indicator and text fallback.
  - Review and approval action buttons.
- **Required Tests**: Component tests for doctor queue and citation drawer navigation.

---

### Phase 6: Integrated Release Verification (Gate G5 Required)

#### `TASK-P1-601`
- **Title**: Visual QA, Tablet Responsiveness & Accessibility Auditing
- **Owner**: `person-1`
- **Status**: `BLOCKED` (Waiting on G5)
- **Permitted Paths**: `apps/web/**`, `.agents/audit/visual/**`
- **Depends On**: `TASK-P1-501`
- **Acceptance Criteria**:
  - Visual QA verified across tablet (1024x768, 1280x800) and desktop viewports.
  - WCAG touch target compliance (>= 48x48px).
  - Keyboard navigation and screen reader tags verified.
  - Reduced-motion transitions verified.
- **Required Tests**: Visual regression snapshots and accessibility audit log.

#### `TASK-P2-601`
- **Title**: Full System End-to-End Integration, Concurrency & Security Testing
- **Owner**: `person-2`
- **Status**: `BLOCKED` (Waiting on G5)
- **Permitted Paths**: `apps/api/**`, `.github/workflows/**`
- **Depends On**: `TASK-P2-501`
- **Acceptance Criteria**:
  - End-to-end integration test from synthetic candidate lookup through doctor sign-off.
  - Slot concurrency test under multi-client simulation.
  - Zero sensitive data in logs/traces.
  - Clean reproducible demo seed and reset script.
- **Required Tests**: Full suite `pytest` across integration tests and contract validation.

#### `TASK-P3-601`
- **Title**: Golden AI Evaluation Suite, Grounding Benchmarks & Trace Auditing
- **Owner**: `person-3`
- **Status**: `BLOCKED` (Waiting on G5)
- **Permitted Paths**: `apps/ai/**`, `evals/**`
- **Depends On**: `TASK-P3-501`
- **Acceptance Criteria**:
  - Golden eval benchmark run on all test datasets.
  - Citation grounding score >= 95%.
  - Zero unauthorized emergency bypass.
  - Redaction verified on all emitted traces.
  - Benchmark report saved in `evals/reports/`.
- **Required Tests**: Full eval benchmark run with generated report.
