# Handoff — TASK-P2-201: Patient Registry, Identity Confirmation & Encounter Persistence APIs

- **Owner**: Person 2 (Backend & Integration Captain)
- **Branch**: `feat/p2-patient-api`
- **Workstream**: Backend & API (`apps/api/**`)
- **Status**: IMPLEMENTED / VERIFIED

## Goal and Acceptance Criteria
- [x] Candidate lookup returns masked suggestions with zero medical history (`POST /api/v1/identity/candidates`).
- [x] Secondary confirmation gate strictly enforced before patient context can be retrieved (`POST /api/v1/identity/confirm` verifies DOB, emits 403 `IDENTITY_NOT_CONFIRMED` on mismatch, issues token on match).
- [x] Patient clinical context retrieval (`GET /api/v1/patients/{patient_id}/context`) strictly gated behind identity confirmation.
- [x] Manual registration fallback route (`POST /api/v1/patients/register`) for kiosk patients bypassing candidate lookup.
- [x] Encounter creation endpoint (`POST /api/v1/encounters`) creating persistent encounters tied to confirmed patients with valid confirmation token.
- [x] Adaptive conversational intake endpoint (`POST /api/v1/encounters/{encounter_id}/answers`) validating turns, persisting `ClinicalFact` entities with full provenance, and computing next adaptive question.
- [x] Database migration `0002_add_clinical_facts.py` defining `clinical_facts` table with foreign keys and indexes.
- [x] Comprehensive test coverage with 28 automated tests passing (identity flow, encounter flow, model isolation, and error contract).

## Files Changed / Created
- `apps/api/app/models/fact.py`: `ClinicalFact` SQLAlchemy entity with concept, value, fact_type, status, source_type, and provenance fields.
- `apps/api/app/models/patient.py`: Added relationship to `ClinicalFact`.
- `apps/api/app/models/encounter.py`: Added relationship to `ClinicalFact`.
- `apps/api/app/models/__init__.py`: Exported `ClinicalFact`.
- `apps/api/app/schemas/fact.py`: Pydantic `ClinicalFact` schema conforming to OpenAPI contract.
- `apps/api/app/schemas/identity.py`: `CandidateLookupRequest`, `CandidateLookupResponse`, `IdentityConfirmRequest`, `IdentityConfirmResponse`.
- `apps/api/app/schemas/patient.py`: Added `PatientContextData`, `PatientContextResponse`, `PatientRegistrationRequest`.
- `apps/api/app/schemas/intake.py`: `IntakeAnswerRequest`, `IntakeStateData`, `IntakeStateResponse`.
- `apps/api/app/schemas/__init__.py`: Exported all Phase 2 identity and intake schemas.
- `apps/api/app/services/patient_service.py`: Candidate lookup with display name masking, secondary DOB verification, and patient context access control.
- `apps/api/app/services/encounter_service.py`: Encounter creation with identity gating, intake answer processing, and clinical fact extraction.
- `apps/api/app/services/__init__.py`: Exported domain services.
- `apps/api/app/api/v1/routes/identity.py`: Candidate lookup and confirmation endpoints.
- `apps/api/app/api/v1/routes/patients.py`: Context retrieval and registration endpoints.
- `apps/api/app/api/v1/routes/encounters.py`: Encounter creation and intake answer endpoints.
- `apps/api/app/api/v1/router.py`: Registered identity, patients, and encounters route modules.
- `apps/api/migrations/versions/0002_add_clinical_facts.py`: Alembic migration for `clinical_facts` table.
- `apps/api/tests/unit/test_fact_model.py`: Model unit tests for `ClinicalFact`.
- `apps/api/tests/integration/test_identity_flow.py`: Integration tests for lookup, masking, DOB confirmation, and context gating.
- `apps/api/tests/integration/test_encounter_flow.py`: Integration tests for encounter creation, intake answers, multi-turn flow, and patient isolation.

## Validation Evidence
- **Test Command**: `python -m pytest apps/api/tests -v`
  - Result: 28 passed in 0.59s
- **Linter Command**: `python -m ruff check apps/api`
  - Result: All checks passed!
- **Cross-Service Tests**: `python -m pytest apps/ai/tests/test_eval_runner.py apps/ai/tests/test_gateway_offline.py apps/ai/tests/test_guardrails.py apps/ai/tests/test_observability.py apps/ai/tests/test_retries_and_fallback.py -v`
  - Result: 14 passed in 0.10s (total 42 tests passing across repository)
- **Contract Validation**: `npm run validate:all`
  - Result: openapi.json is valid OpenAPI 3.1.0 (15 endpoints, 25 schemas)
