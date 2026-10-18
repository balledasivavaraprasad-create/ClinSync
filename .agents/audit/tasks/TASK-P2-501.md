# Handoff — TASK-P2-501: Doctor Queue, Consultation Notes & Approval Persistence

- **Owner**: Person 2 (Backend & Integration Captain)
- **Branch**: `feat/p2-doctor-handoff`
- **Workstream**: Backend & API (`apps/api/**`)
- **Status**: VERIFIED
- **Depends On**: `TASK-P2-401` (INTEGRATED)
- **Informs / Unblocks**: `TASK-P1-501` (Doctor Queue & Consultation Console UI), `TASK-P3-501` (Clinical Brief & Doctor Audio Summary)

## Goal and Acceptance Criteria
- [x] Doctor encounter queue endpoint (`GET /api/v1/doctors/{doctor_id}/queue`):
  - Retrieves active encounters assigned to the doctor's department or specifically booked with the physician via appointments.
  - Doctor alias resolution (e.g. `dr_chen` mapped to `dept_cardiology`).
  - Fallback retrieval for general practice demonstration queue ensuring high availability.
  - Priority queue ordering: `URGENT` presentations sorted ahead of `ELEVATED` and `ROUTINE`.
  - Dual contract compatibility: provides both `encounters: Encounter[]` (satisfying OpenAPI 3.1.0 `DoctorQueueResponse`) and `queue: DoctorQueueItem[]` (satisfying frontend TypeScript types).
  - Formats appointment slot timestamps and extracts top triage clinical notes.
- [x] Evidence-backed doctor brief endpoint (`GET /api/v1/encounters/{encounter_id}/brief`):
  - Synthesizes concise clinical summary directly from authoritative `ClinicalFact` ledger in database.
  - Generates verifiable citations linking back to explicit `fact_id`, `source_id`, `source_type`, and `text_snippet`.
  - Extracts unresolved questions for conflicting or uncertain ledger facts.
  - Text-fallback safety: reports `audio_status="PENDING"` and `audio_brief_available=false` without failing.
  - Full OpenAPI 3.1.0 and frontend TypeScript contract compatibility.
- [x] Doctor review and approval endpoint (`POST /api/v1/encounters/{encounter_id}/approvals`):
  - Records physician clinical consultation notes and sign-off.
  - Transitions encounter status to `DOCTOR_REVIEWED`.
  - Promotes clinical facts from `reported` or `extracted_unverified` to `doctor_confirmed` with `reviewed_by = doctor_id`.
  - Applies physician fact value corrections if provided in `corrected_facts` and `corrected_fact_ids`.
  - Defensive decision handling: `decision="REJECTED"` without explicit `approved` boolean defaults safely to rejection without promoting encounter.
  - Returns dual contract envelope containing `encounter_id`, `status`, `approved_at`, `approval_id`, `recorded_at`, and `approval_status="RECORDED"`.
- [x] Scoped Authorization & Identity Gate:
  - Validates patient `identity_status == "CONFIRMED"` prior to permitting clinical sign-off or brief retrieval.
  - Rejects unconfirmed patient encounters with HTTP 403 `IDENTITY_NOT_CONFIRMED`.
  - Rejects nonexistent encounters with HTTP 404 `NOT_FOUND`.
- [x] Immutable Audit Event Logging:
  - Appends an authoritative `AuditEvent` record with `actor_role="DOCTOR"`, `action="DOCTOR_APPROVAL"` (or `DOCTOR_REJECTION`), `resource_type="ENCOUNTER"`, doctor ID, timestamp, and JSON serialized `new_state` capturing decision, notes, status transition, and detailed `corrections` list.
- [x] Full Automated Test Coverage & Linting:
  - 97 automated tests passing in `apps/api` (unit, integration, and OpenAPI contract tests).
  - Clean `ruff` check (0 errors, 0 warnings).
  - Valid OpenAPI 3.1.0 specifications and clean git diff check.

## Files Changed / Created
- `apps/api/app/schemas/doctor.py`: `DoctorQueueItem`, `DoctorQueueData`, `DoctorQueueResponse`, `DoctorBriefCitation`, `DoctorBriefData`, `DoctorBriefResponse`, `ApprovalRequest`, `ApprovalData`, `ApprovalResponse`.
- `apps/api/app/schemas/__init__.py`: Registered and exported all doctor schemas.
- `apps/api/app/services/doctor_service.py`: `DoctorService` implementing queue retrieval, priority sorting, brief synthesis, approval lifecycle, fact status updates, and audit logging.
- `apps/api/app/services/__init__.py`: Exported `DoctorService`.
- `apps/api/app/api/v1/routes/doctors.py`: Endpoint `GET /api/v1/doctors/{doctor_id}/queue`.
- `apps/api/app/api/v1/routes/encounters.py`: Endpoints `GET /api/v1/encounters/{encounter_id}/brief` and `POST /api/v1/encounters/{encounter_id}/approvals`.
- `apps/api/app/api/v1/router.py`: Registered `doctors_router` under API v1.
- `apps/api/tests/unit/test_doctor_service.py`: Unit tests for queue retrieval, brief synthesis, approval lifecycle, corrections audit, rejection flow, and identity check.
- `apps/api/tests/integration/test_doctor_handoff_flow.py`: Integration tests for doctor queue, brief synthesis, and approval endpoints.
- `apps/api/tests/contract/test_doctor_contract.py`: Contract tests validating `DoctorQueueResponse`, `DoctorBriefResponse`, `ApprovalResponse`, and `ErrorDetail` schemas against `packages/contracts/openapi.json`.
- `apps/api/README.md`: Documented Phase 5 endpoints and doctor sign-off invariants.
- `.agents/audit/tasks/TASK-P2-501.md`: Task audit handoff document.

## Validation Evidence
- **API Test Suite**: `pytest apps/api -v`
  - Result: 97 passed in 2.17s (100% pass rate)
- **Linter**: `python -m ruff check apps/api`
  - Result: All checks passed! (0 errors, 0 warnings)
- **Contract Validation**: `npm run validate:all`
  - Result: `openapi.json is valid OpenAPI 3.1.0` (15 endpoints, 25 schemas), `git diff --check` clean.
- **AI Test Suite**: `pytest apps/ai/tests -v`
  - Result: 63 passed, 2 skipped in 0.28s.
