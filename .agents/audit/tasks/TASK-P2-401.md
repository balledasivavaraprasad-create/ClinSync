# Handoff — TASK-P2-401: Deterministic Safety Policy Engine & Atomic Slot Booking Transaction

- **Owner**: Person 2 (Backend & Integration Captain)
- **Branch**: `feat/p2-scheduling-api`
- **Workstream**: Backend & API (`apps/api/**`)
- **Status**: VERIFIED
- **Depends On**: `TASK-P2-301` (INTEGRATED)
- **Informs / Unblocks**: `TASK-P1-401` (Appointment & Scheduling UI), `TASK-P2-501` (Doctor Queue & Consultation)

## Goal and Acceptance Criteria
- [x] Deterministic safety policy engine (`POST /api/v1/encounters/{encounter_id}/routing-review`) enforcing Rule 10 ("Safety before scheduling: The model can extract/report facts but cannot independently decide medical urgency"):
  - Acute red flags (ACS, respiratory distress, acute FAST stroke, airway compromise/anaphylaxis, severe hemorrhage, acute psychiatric crisis) unconditionally trigger `URGENT_ESCALATION` (`ACUTE_RED_FLAG_DETECTED`).
  - Adversarial prompt injection attempts attempting to bypass triage policies safely route to `HUMAN_REVIEW` (`ADVERSARIAL_INJECTION_DETECTED`).
  - Clinical ledger contradictions and unverified discrepancies route to `HUMAN_REVIEW` (`UNRESOLVED_CLINICAL_CONFLICTS`).
  - Empty or out-of-scope input returns `UNABLE_TO_DETERMINE` (`OUT_OF_SCOPE_INPUT`).
  - Routine presentations route strictly to allowlisted hospital department IDs (`dept_cardiology`, `dept_internal_med`, `dept_neurology`, `dept_orthopedics`, `dept_pulmonology`, `dept_ent`, `dept_dermatology`, `dept_general_practice`), assigning `assigned_department_id` and transitioning encounter status to `TRIAGED`.
- [x] Available appointment slots query (`GET /api/v1/appointments/slots`) filtering by department and optional date window, seeded with demo slots across allowlisted departments.
- [x] Atomic appointment booking transaction (`POST /api/v1/appointments`):
  - Idempotent request handling: repeating the exact same booking returns existing booking without duplicate charges. Conflicting parameter re-use raises 409 `IDEMPOTENCY_CONFLICT`.
  - Checks slot availability and sets status to `BOOKED`.
  - Links appointment to encounter (`encounter.status = "BOOKED"`, `encounter.appointment_id = booking.booking_id`).
  - Enforces database-level uniqueness constraint and atomic transaction commit.
- [x] Strict concurrency protection: simultaneous requests to book the exact same slot result in exactly 1 successful booking (201 Created) and all concurrent competitors receive 409 Conflict with `SLOT_UNAVAILABLE`.
- [x] Database migration `0004_add_appointments.py` creating `appointment_slots` and `appointments` tables with foreign keys and unique indexes.
- [x] Scoped authorization: Unconfirmed patient encounters are rejected with 403 `IDENTITY_NOT_CONFIRMED`.
- [x] Full test coverage: 87 automated tests passing in `apps/api` (unit, integration, concurrency, and OpenAPI contract tests). Clean ruff linting (0 errors).

## Files Changed / Created
- `apps/api/app/models/appointment.py`: `AppointmentSlot` and `Appointment` models.
- `apps/api/app/models/encounter.py`: Added relationship to `Appointment`.
- `apps/api/app/models/patient.py`: Added relationship to `Appointment`.
- `apps/api/app/models/__init__.py`: Exported `AppointmentSlot` and `Appointment`.
- `apps/api/migrations/versions/0004_add_appointments.py`: Alembic migration for appointment tables.
- `apps/api/app/schemas/routing.py`: `DecisionResult` and `DecisionResultResponse` schemas conforming to OpenAPI 3.1.0.
- `apps/api/app/schemas/appointment.py`: `AppointmentSlotSchema`, `SlotsResponse`, `BookingRequest`, `BookingResponse`.
- `apps/api/app/schemas/__init__.py`: Exported routing and appointment schemas.
- `apps/api/app/services/routing_service.py`: Deterministic safety policy engine, acute red flags, adversarial screening, and department matching.
- `apps/api/app/services/appointment_service.py`: Slot query, atomic booking transaction, seed data, and concurrency handling.
- `apps/api/app/services/__init__.py`: Exported `RoutingService` and `AppointmentService`.
- `apps/api/app/api/v1/routes/routing.py`: `POST /encounters/{encounter_id}/routing-review`.
- `apps/api/app/api/v1/routes/appointments.py`: `GET /appointments/slots` and `POST /appointments`.
- `apps/api/app/api/v1/router.py`: Registered routing and appointments routers.
- `apps/api/tests/unit/test_routing_policy.py`: 14 unit tests covering acute red flags, adversarial injection, clinical conflicts, out-of-scope input, and allowlisted department routing.
- `apps/api/tests/unit/test_appointment_models.py`: Unit tests for slot and booking models and uniqueness constraint.
- `apps/api/tests/integration/test_routing_flow.py`: Integration tests for routing review endpoint lifecycle and states.
- `apps/api/tests/integration/test_appointment_flow.py`: Integration tests for slots query, date filtering, booking, and idempotency.
- `apps/api/tests/integration/test_concurrency_booking.py`: Multi-threaded race condition tests asserting strictly 1 winner and 4 `SLOT_UNAVAILABLE` rejections.
- `apps/api/tests/contract/test_scheduling_contract.py`: Contract tests validating response structures against `packages/contracts/openapi.json`.
- `.agents/audit/tasks/TASK-P2-401.md`: Task audit record.

## Validation Evidence
- **API Test Suite**: `pytest apps/api -v`
  - Result: 87 passed in 1.87s (100% pass rate)
- **Linter**: `python -m ruff check apps/api`
  - Result: All checks passed! (0 errors, 0 warnings)
- **Alembic Migration Lifecycle**: `alembic downgrade -1 && alembic upgrade head`
  - Result: Upgraded to `0004_add_appointments` cleanly.
- **Contract Validation**: `npm run validate:all`
  - Result: openapi.json is valid OpenAPI 3.1.0 (15 endpoints, 25 schemas), `git diff --check` clean.
- **AI Test Suite**: `pytest apps/ai/tests -v`
  - Result: 63 passed, 2 skipped in 0.29s.
