# ClinSync — Final Evaluation Implementation Plan (TELEMEDICON 2026)

**Document Status:** PROPOSED FOR TEAM REVIEW (PHASE 0 AUDIT COMPLETE)  
**Lead Architect:** Principal AI Systems Engineer & Integration Captain  
**Team Members:**  
- **Teammate A (Person 1):** Product UI/UX + Web Frontend  
- **Teammate B (Person 2):** Backend, Database & Integration Captain  
- **Teammate C (Person 3):** Agentic AI, RAG & Evaluations  

---

## 1. Current State vs. Target State

| Dimension | Current State | Target State (Post-Refinement) |
| :--- | :--- | :--- |
| **User Interfaces** | One massive `LuxuryMasterDashboard` containing kiosk, doctor queue, 3D biometric pulses, and profile tabs. | Three distinct, decoupled routes: `/kiosk` (Patient), `/doctor` (Clinician), `/staff` (Operations). |
| **Authentication & AuthZ** | `apps/api/app/auth` has only `.gitkeep`. Endpoints lack role and token verification. | Lightweight role-based auth dependency (`require_role`) verifying session tokens. |
| **API Rate Limiting** | Zero rate limiting. High-cost AI endpoints can be spammed indefinitely. | Sliding-window in-memory rate limiter in FastAPI middleware (10 req/min for AI, 60 req/min CRUD). |
| **AI Workflows** | Active Gemini model gateway with LangGraph, but without hard turn caps or documented inventory. | Bounded 5-turn conversational intake, cached document extraction, deterministic emergency triage. |
| **Jury Alignment** | Jury feedback on clutter, role distinction, and excessive AI partially addressed. | Directly addresses 100% of feedback points with proof and inspectable test evidence. |

---

## 2. Findings from Mid-Evaluation Jury Feedback

1. **Jury 1 (Differentiate dashboards; reduce clutter; explain use case)**:
   - Addressed by dismantling `LuxuryMasterDashboard`, removing non-clinical 3D viewers, and creating isolated `/kiosk`, `/doctor`, and `/staff` views.
2. **Jury 2 (Too much AI; role distinction; rate limiting; open-source models)**:
   - Addressed by:
     - Documenting the `AI_CALL_INVENTORY.md` to prune redundant calls.
     - Enforcing deterministic rules for all acute triage and booking logic.
     - Implementing in-memory FastAPI rate limiting middleware.
     - Maintaining Groq open-weights fallback adapter (`qwen/qwen3.8-27b`).
3. **Jury 3 (Verification vs. Validation vs. Guardrails vs. Human-in-the-Loop vs. Evals)**:
   - Addressed by creating `AI_SAFETY_AND_QUALITY.md` with explicit mapping to codebase mechanisms.

---

## 3. Work Allocation Across the Three Developers

Following `docs/TEAM_OWNERSHIP.md` and repository governance:

### Developer 1: Teammate A (Web Frontend & UI/UX)
* **Owned Paths**: `apps/web/**`
* **Assigned Tasks**:
  1. **TASK-P1-701: Decouple Dashboard into Distinct Role Routes**:
     - Remove monolithic tab switcher from `/kiosk`. Provide dedicated full-screen layout for the patient kiosk.
     - Implement dedicated `/doctor` route with focused queue, 60s brief, and citation drawer.
     - Create `/staff` operational dashboard for walk-in registration, kiosk status, and queue metrics.
  2. **TASK-P1-702: De-Clutter & Visual Polish**:
     - Deactivate `BiometricPulseViewer` and `BiometricSculptureViewer` from primary workflows.
     - Fix `src/test/setup.ts` to polyfill `localStorage` so `i18n.test.tsx` passes 100%.

### Developer 2: Teammate B (Backend, Security & Integration Captain)
* **Owned Paths**: `apps/api/**`, `packages/contracts/**`, shared configs
* **Assigned Tasks**:
  1. **TASK-P2-701: Implement Backend Rate Limiting**:
     - Create `apps/api/app/core/rate_limit.py`: sliding-window memory limiter.
     - Mount rate limiting middleware in `apps/api/app/main.py`.
     - Return HTTP 429 with `Retry-After` headers on violation.
  2. **TASK-P2-702: Role Authorization & Session Verification**:
     - Implement `apps/api/app/auth/security.py` and `apps/api/app/dependencies/auth.py`.
     - Protect `/doctors/*` endpoints to require `doctor` role.
     - Protect `/patients/{id}/context` to require matching patient session token.

### Developer 3: Teammate C (Agentic AI, Observability & Evaluations)
* **Owned Paths**: `apps/ai/**`, `evals/**`
* **Assigned Tasks**:
  1. **TASK-P3-701: AI Budgeting, Caching & Turn Bounding**:
     - Enforce hard ceiling of $\le 5$ turns in `apps/ai/clinsync_ai/graph/builder.py`.
     - Add SHA-256 result caching to `DocumentFactExtractor` to prevent re-extracting previously analyzed files.
  2. **TASK-P3-702: Langfuse Observability & Golden Eval Reporting**:
     - Ensure all AI calls emit structured traces with PHI redaction tags.
     - Maintain 18/18 passing golden evals in `evals/runner.py`.

---

## 4. Task Dependencies & Integration Sequence

```
+-------------------------------------------------------------+
| Step 1: Backend Rate Limiting & Auth (TASK-P2-701, P2-702)  |
| - Teammate B implements limiter & auth dependencies in API   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 2: AI Caching & Langfuse Redaction (TASK-P3-701, P3-702)|
| - Teammate C binds LangGraph turns and verifies traces      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 3: Frontend Role Separation & Kiosk UI (TASK-P1-701)   |
| - Teammate A splits /kiosk, /doctor, /staff routes          |
| - Polyfills localStorage for green web tests                |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| Step 4: Full System Verification & Deployment (Captain)     |
| - Verify 100% test passes across API, AI, Web, Contracts    |
| - Auto-merge PRs and deploy live to Vercel production        |
+-------------------------------------------------------------+
```

---

## 5. Acceptance Criteria & Required Tests

### Acceptance Criteria
- [ ] Navigating to `/kiosk` displays only the patient intake experience with zero tabs to doctor or staff consoles.
- [ ] Navigating to `/doctor` requires clinician login and displays the prioritized queue and brief with citations.
- [ ] Navigating to `/staff` displays queue management, walk-in registration, and kiosk status.
- [ ] Sending $>10$ requests per minute to `/api/v1/encounters/{id}/brief` returns `HTTP 429 Too Many Requests`.
- [ ] Accessing `GET /api/v1/doctors/{id}/queue` without a valid doctor token returns `HTTP 401 / 403`.
- [ ] `evals/runner.py` executes 18/18 cases passing ($100.0\%$).
- [ ] All 15 web test files pass 100% (`vitest run`).
- [ ] All API unit and integration tests pass 100% (`pytest`).

---

## 6. Exact Files to be Modified in Next Phase

### Phase 1 File Modifications:
- **`apps/api/app/core/rate_limit.py`** (New): Sliding-window rate limiter.
- **`apps/api/app/main.py`**: Mount rate limiter and update middleware stack.
- **`apps/api/app/auth/security.py`** (New): Role and token validation helpers.
- **`apps/api/app/dependencies/auth.py`** (New): FastAPI auth dependencies.
- **`apps/api/app/api/v1/routes/doctors.py`**: Add auth dependency to doctor routes.
- **`apps/api/app/api/v1/routes/patients.py`**: Add session verification.
- **`apps/api/tests/unit/test_rate_limiting.py`** (New): Unit tests for rate limiter.
- **`apps/web/src/app/App.tsx`**: Update top-level router for `/kiosk`, `/doctor`, `/staff`.
- **`apps/web/src/routes/index.tsx`**: Replace `LuxuryMasterDashboard` monolithic tab shell.
- **`apps/web/src/features/staff-dashboard/StaffDashboardHub.tsx`** (New): Dedicated staff view.
- **`apps/web/src/test/setup.ts`**: Add `localStorage` polyfill for Node 22 jsdom runner.
- **`apps/ai/clinsync_ai/documents/extractor.py`**: Add SHA-256 document fact cache.
