# ClinSync — Master Product Refinement & Final Evaluation Audit

**Date:** October 19, 2026  
**Auditor:** Principal Software Architect & AI Systems Engineer (Antigravity)  
**Project:** ClinSync (Team: Humble Guys)  
**Theme:** AI in Diagnostics and Clinical Decision-Making (TELEMEDICON 2026)  
**Deliverable:** Phase 0 Comprehensive Systems & Governance Audit  

---

## Executive Summary & Current Classification Matrix

ClinSync was conceived to reduce pre-consultation workload by gathering patient information, organizing clinical history, extracting document facts, and preparing a structured brief before the doctor begins the consultation.

Following our comprehensive inspection across `apps/web`, `apps/api`, `apps/ai`, `packages/contracts`, and `evals/`, the core domain logic (SQL schemas, deterministic safety guardrails, doctor brief synthesis with source citations, golden evals) is solid. However, the application currently suffers from **dashboard clutter**, **missing role isolation**, **zero backend rate limiting**, **unauthenticated API endpoints**, and an **over-reliance on decorative 3D and exploratory UI elements**.

| Component / Subsystem | Path / Entry Point | Current Status | Primary Risk / Finding |
| :--- | :--- | :--- | :--- |
| **Patient Kiosk UI** | `apps/web/src/features/patient-kiosk` | **IMPLEMENTED BUT CLUTTERED** | Wrapped inside `LuxuryMasterDashboard`; doctor tabs accessible from kiosk header. |
| **Doctor Console UI** | `apps/web/src/features/doctor-dashboard` | **IMPLEMENTED AND TESTED** | Functional queue & brief display, but bundled into the same tab shell as kiosk. |
| **Hospital Staff Workspace** | `apps/web` | **NOT IMPLEMENTED / BLENDED** | No dedicated staff route; staff functions are mixed into the general master dashboard. |
| **Role-Based Routing** | `apps/web/src/app/App.tsx` | **PARTIALLY IMPLEMENTED** | Hash-based routing (`#/app/doctor`) bypasses auth check; no route guards. |
| **API Endpoints (15)** | `apps/api/app/api/v1/router.py` | **IMPLEMENTED AND TESTED** | 102 unit & integration tests pass, but endpoints lack auth tokens and rate limits. |
| **Authentication & AuthZ** | `apps/api/app/auth` | **BROKEN / MISSING** | `apps/api/app/auth` contains only `.gitkeep`. No JWT/Bearer check on endpoints. |
| **API Rate Limiting** | `apps/api/app/main.py` | **NOT IMPLEMENTED** | Zero rate limiting on any endpoint; expensive AI calls vulnerable to spam. |
| **AI Intake Graph** | `apps/ai/clinsync_ai/intake` | **IMPLEMENTED AND TESTED** | LangGraph bounded turns (max 5 turns), entity extraction, Mem0 memory harness. |
| **Document Fact Extractor**| `apps/ai/clinsync_ai/documents` | **IMPLEMENTED AND TESTED** | Page-level extraction with provenance and sha256 checksums. |
| **Triage Safety Guardrail**| `apps/ai/clinsync_ai/guardrails`| **IMPLEMENTED AND TESTED** | Deterministic red flag triage; bypasses LLM on acute chest pain/shortness of breath. |
| **Doctor Brief Service** | `apps/ai/clinsync_ai/brief` | **IMPLEMENTED AND TESTED** | Grounded brief with citations; audio summary degrades gracefully to text. |
| **Golden Evals Suite** | `evals/runner.py` | **IMPLEMENTED AND TESTED** | 18/18 benchmark test cases pass 100% (adversarial, conflict, fallback, citations). |
| **Langfuse Observability** | `apps/ai/clinsync_ai/observability`| **IMPLEMENTED AND TESTED** | Live traces emitted and verified on Langfuse Cloud with latency & tokens. |
| **Unit/Integration Tests** | Web, API, AI test suites | **MOSTLY PASSING (1 BUG)** | API (102/102 pass), AI (77/77 pass), Web (180/192 pass; 12 fail in `i18n.test.tsx`). |

---

## 1. Current Application Architecture

The system is organized as a monorepo with strict path boundaries:
- **`apps/web`**: React 18, TypeScript, Vite, Tailwind CSS, Motion for React, Three.js (`BiometricPulseViewer`, `BiometricSculptureViewer`).
- **`apps/api`**: FastAPI, SQLAlchemy 2.0, SQLite (`clinsync_demo.db`), Alembic migrations, Pydantic v2 schemas.
- **`apps/ai`**: Python AI package containing LangGraph intake state machines, Gemini/Groq model gateways, LlamaIndex-based document retrieval, deterministic triage guardrails, and Doctor Brief synthesis.
- **`packages/contracts`**: Canonical OpenAPI 3.1.0 contract (`openapi.json`, 15 endpoints, 25 schemas) validated via `npm run contracts:validate`.
- **`evals/`**: 18 synthetic golden benchmark cases testing adversarial injection, prompt evasion, acute triage override refusal, and citation fidelity.

### Architectural Flaw: The Monolithic Dashboard Shell
In `apps/web/src/routes/index.tsx`, the `MainView` mounts `LuxuryMasterDashboard`, which embeds all views (`kiosk`, `ledger`, `appointments`, `doctor`, `profile`, `dashboard`) into a single stateful tab container. This directly contradicts jury requirements for separate role dashboards.

---

## 2. Existing User Roles and Permissions

Three roles are documented in `docs/PRODUCT_BRIEF.md`, but their implementation in code is inconsistent:

1. **Patient (Kiosk User)**:
   - **Intended**: Walk-up tablet access, identity confirmation via DOB, symptom description, document attachment, time-slot selection. Must never see doctor queues or other patients.
   - **Actual**: Can switch tabs at the top of the screen to view the Doctor Console, Clinical Ledger, and other patient profiles (`pat_synth_001`).
2. **Doctor (Clinician)**:
   - **Intended**: View waiting queue, review synthesized briefs, inspect citations and original documents, sign off on clinical encounters.
   - **Actual**: Accesses `DoctorDashboardHub`, but queue and sign-off endpoints (`GET /doctors/{id}/queue`, `POST /encounters/{id}/sign-off`) require no backend bearer token.
3. **Hospital Staff (Admin / Registrar)**:
   - **Intended**: Operational queue management, patient registration assistance, kiosk reset, audit event review.
   - **Actual**: Lacks a distinct dashboard. Staff functions are conflated with doctor review or buried inside the landing page.

---

## 3. Current Patient Journey

1. **Approach Kiosk**: Lands on `PatientKioskFlow` (or clicks "Launch Kiosk" from master dashboard).
2. **Identity Confirmation**:
   - `lookup_candidates` checks synthetic patients (`apps/api/app/services/patient_service.py:38`). Names are masked (`J*** D**`).
   - Secondary verification checks Date of Birth (`confirm_identity`).
   - If confirmed, sets `patient.identity_status = "CONFIRMED"`.
3. **Adaptive Intake**:
   - Multi-turn conversational interview (`IntakeInterview.tsx`).
   - Voice Activity Detection (VAD) with 1.8s silence timer, Web Speech API / microphone recording.
   - Follow-up questions dynamically shaped by Mem0 agent memory harness.
4. **Document Upload**:
   - Drag-and-drop PDF/image zone (`DocumentUploadZone.tsx`). Files stored with sha256 checksums.
5. **Specialty Routing & Slot Booking**:
   - Automated routing based on extracted symptoms (Cardiology for chest pain, Neurology for headache, etc.).
   - Patient selects arrival slot from deterministic backend availability (`SlotSelector.tsx`).
6. **Handoff Screen**: Patient receives arrival pass and room instructions.

---

## 4. Current Doctor Journey

1. **Console Access**: Mounts `DoctorDashboardHub` inside `DoctorConsoleLayout`.
2. **Patient Queue**: Displays waiting encounters ordered by triage urgency (`EMERGENCY` > `URGENT` > `ROUTINE`).
3. **Pre-Consultation Brief**:
   - Displays synthesized narrative with clickable citations (`[DOC-1, p.2]`).
   - Shows Clinical Context Ledger (Reported vs. Historical vs. Extracted vs. Doctor-Confirmed).
   - Shows Patient Context Diff (New, Unchanged, Conflicting).
   - Optional audio brief player (powered by ElevenLabs with text fallback).
4. **Clinical Decision & Sign-Off**:
   - Doctor reviews findings, resolves competing statements, and clicks "Sign Off Encounter".

---

## 5. Current Hospital Staff Journey

Currently **broken and fragmented**. Hospital staff have no dedicated route (`/staff` or `#/staff`). Operational workflows (registering a patient walk-in, checking queue congestion, viewing audit events, resetting an idle kiosk) are either hidden in the patient flow or inaccessible without developer console manipulation.

---

## 6. Existing AI Calls and Their Purposes

All AI operations route through `ModelGateway` (`apps/ai/clinsync_ai/routing/gateway.py`):

1. **`intake.understand_and_extract`**:
   - Extracts clinical entities (`chief_complaint`, `symptom`, `duration`, `medication`, `allergy`) from patient speech/text.
   - Bounded by LangGraph (max 5 turns).
2. **`intake.follow_up_question`**:
   - Suggests next conversational question referencing Mem0 memory harness.
3. **`document.extract_facts`**:
   - Extracts structured clinical facts from parsed PDF/text pages with character offsets.
4. **`routing.department_recommendation`**:
   - Evaluates non-emergency encounters to recommend clinic specialty (Cardiology, Neurology, Pulmonology).
5. **`brief.synthesize_narrative`**:
   - Prepares doctor summary with strict grounding and citation constraints.
6. **`brief.generate_audio` (ElevenLabs)**:
   - Synthesizes 45-60s spoken briefing for the physician.

---

## 7. Existing API Endpoints and Database Models

### Endpoints (15 Core Endpoints)
- **Health**: `GET /api/v1/health`
- **Identity**: `POST /api/v1/identity/candidates`, `POST /api/v1/identity/confirm`
- **Patients**: `GET /api/v1/patients/{id}/context`, `POST /api/v1/patients/register`
- **Encounters**: `POST /api/v1/encounters`, `POST /api/v1/encounters/{id}/answers`
- **Documents**: `POST /api/v1/encounters/{id}/documents`, `GET /api/v1/documents/{id}`
- **Ledger & Diff**: `GET /api/v1/encounters/{id}/ledger`, `GET /api/v1/encounters/{id}/diff`
- **Routing**: `POST /api/v1/encounters/{id}/routing/review`
- **Appointments**: `GET /api/v1/appointments/slots`, `POST /api/v1/appointments/book`
- **Doctor**: `GET /api/v1/doctors/{id}/queue`, `POST /api/v1/encounters/{id}/brief`, `POST /api/v1/encounters/{id}/sign-off`

### Database Models (`apps/api/app/models/`)
- `Patient`: Demographics, identity confirmation status, contact hints.
- `Encounter`: Lifecycle tracking (`INTAKE_IN_PROGRESS` -> `READY_FOR_DOCTOR` -> `COMPLETED`), triage priority.
- `Document`: File metadata, sha256 checksums, storage paths, extraction status.
- `ClinicalFact`: Fact concept, value, certainty, provenance (source type, document ID, page), status.
- `AppointmentSlot`: Concurrency-safe slot booking with version locking.
- `AuditEvent`: Append-only audit trail capturing actor, role, action, and state diffs.

---

## 8. Current Authentication and Authorization Controls

### CRITICAL FINDINGS:
1. **No Backend Route Protection**: None of the 15 FastAPI endpoints enforce JWT or API token verification. `apps/api/app/auth` contains only `.gitkeep`.
2. **Persistent Confirmation Flaw**: Once a patient is confirmed via DOB, `patient.identity_status = "CONFIRMED"` is permanently written to the SQL record. Any client that subsequently sends `GET /patients/{id}/context` receives full medical history without presenting a session token.
3. **No Role-Based Access Control (RBAC)**: Any client can query `GET /doctors/doc_chen/queue` or execute `POST /encounters/{id}/sign-off` by simply passing an arbitrary string.
4. **Client-Side Auth Bypass**: In `apps/web`, changing the URL hash to `#/app/doctor` instantly displays the doctor console regardless of whether the user logged in.

---

## 9. Existing Tests, Evaluations, Guardrails, and Observability

1. **Test Coverage**:
   - **`apps/api`**: 102/102 tests pass (37 unit tests, 65 integration tests).
   - **`apps/ai`**: 77/77 tests pass (unit, graph, fallback, brief, evals).
   - **`apps/web`**: 180/192 tests pass. 12 failures isolated to `src/test/i18n.test.tsx` due to missing `localStorage` polyfill in Node 22 jsdom test runner.
2. **Evaluations**:
   - `evals/runner.py` executes 18 golden test cases covering acute escalation, prompt injection, citation grounding, audio fallback, and trace redaction. 100% passing.
3. **Guardrails**:
   - **Input Guard**: Rejects prompt injection patterns in document uploads (`evals/cases/case_003`).
   - **Triage Guard**: Deterministically escalates red flag symptoms (chest pain + diaphoresis, acute dyspnea) to `EMERGENCY_ESCALATION` without invoking an LLM.
   - **Output Guard**: Validates LLM structured outputs against Pydantic schemas; falls back safely on parsing failure.
4. **Observability**:
   - Langfuse Cloud integration in `apps/ai/clinsync_ai/observability/trace.py`. Emits step names, latencies, tokens, and trace URLs (`https://us.cloud.langfuse.com`).

---

## 10. UI Problems and Duplicate Functionality

1. **Single Cluttered Dashboard**:
   - `LuxuryMasterDashboard.tsx` is 77KB and contains 3D canvas viewers, biometric pulse simulations, doctor queue cards, and document management all in one screen.
2. **Role Leakage in Navigation**:
   - A patient using the intake kiosk can see tabs for "Doctor Console", "Ledger", and "Appointments" in the navigation bar.
3. **Distracting Visual Elements**:
   - Three.js biometric sculptures (`BiometricPulseViewer.tsx`, `BiometricSculptureViewer.tsx`) consume CPU/GPU cycles and run contrary to jury feedback ("Too much AI / interface is cluttered").
4. **Missing Dedicated Staff Interface**:
   - Hospital staff lack a focused queue management view to assist patients or monitor clinic wait times.

---

## 11. Cost and Latency Risks

1. **Repeated Model Calls**:
   - Extraction runs on every document page without caching identical files.
2. **No Rate Limiting**:
   - A malicious or malfunctioning kiosk client could send infinite requests to `POST /encounters/{id}/brief` or `POST /documents`, causing massive Gemini and ElevenLabs API bills and hitting provider rate limits.
3. **ElevenLabs Audio Latency**:
   - Audio generation adds 3-5 seconds of latency to doctor brief generation. It must remain strictly optional with text immediately available.

---

## 12. Security and Privacy Risks

1. **Unauthenticated Endpoints**: Endpoints lack Bearer token validation.
2. **Cross-Patient Data Exposure**: A kiosk user switching tabs to "Profile" or "Doctor" can view another patient's clinical summary.
3. **Biometric Face Capture Simulation**: Simulated biometric candidate lookup requires strict consent and non-biometric fallback.
4. **Unredacted Trace Logs**: Traces sent to cloud observability must ensure PHI (patient full names, raw transcripts) is pseudonymized or redacted.

---

## 13. Missing Features and Broken Integrations

1. **Backend Rate Limiting**: Completely absent.
2. **Hospital Staff Dedicated Route**: Completely absent.
3. **Strict Route Guards**: Absent in `apps/web`.
4. **`i18n.test.tsx` Runner Failure**: Node 22 jsdom environment lacks `localStorage` mock.

---

## 14. Recommended Fixes Ranked by Importance

### Priority P0 — Critical Security & Safety
1. **Enforce Backend Role Authorization & Session Tokens**:
   - Introduce lightweight bearer token / role dependency (`get_current_user`, `require_role(["doctor", "staff"])`) in `apps/api/app/dependencies/auth.py`.
   - Prevent persistent unauthenticated context retrieval by requiring valid session confirmation tokens.
2. **Implement Backend Rate Limiting**:
   - Add in-memory sliding-window rate limiter middleware to `apps/api/app/main.py`.
   - Enforce distinct limits: 10 req/min for AI endpoints (`/brief`, `/documents`), 60 req/min for standard CRUD. Return `HTTP 429 Too Many Requests`.

### Priority P1 — Jury Feedback & Final Evaluation Essentials
3. **Split UI into Three Independent Role-Based Routes**:
   - `/kiosk`: Kiosk-only full-screen layout. Zero doctor/admin tabs or external links.
   - `/doctor`: Focused doctor workstation showing queue, pre-consultation brief, citations, and sign-off.
   - `/staff`: Dedicated operational dashboard for hospital staff (walk-in registration, queue overview, kiosk status).
4. **De-Clutter UI & Remove Decorative 3D Elements**:
   - Remove `BiometricPulseViewer` and `BiometricSculptureViewer` from primary workflows.
   - Replace cluttered master dashboard with clean, calm, role-specific views.
5. **Formalize AI Call Inventory & Cost Controls**:
   - Cap conversational turns to 5; enforce deterministic fallbacks for routing; prevent redundant LLM invocations.
6. **Fix Web Test Environment (`i18n.test.tsx`)**:
   - Polyfill `localStorage` in `apps/web/src/test/setup.ts` to restore 100% green test passes across all 15 test files.

### Priority P2 — Polish & Explainability
7. **Complete Documentation Deliverables**:
   - Author `docs/AI_CALL_INVENTORY.md`, `docs/AI_SAFETY_AND_QUALITY.md`, `docs/ROLE_BASED_USER_FLOWS.md`, and `docs/FINAL_EVALUATION_IMPLEMENTATION_PLAN.md`.
8. **Demonstrable Langfuse & Evaluation Traces**:
   - Ensure evaluator scripts and demo scripts output verifiable, reproducible trace URLs.
