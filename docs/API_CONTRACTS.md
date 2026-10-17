# ClinSync API Contracts — Freeze Before Parallel Coding

**Status: DRAFT.** Integration Captain must align this document and typed backend/frontend schemas before feature work starts. Change this file only through a reviewed contract-change PR. All examples use synthetic identifiers.

## Contract conventions

- Prefix API with `/api/v1`.
- JSON requests/responses; ISO-8601 UTC timestamps.
- IDs are opaque strings/UUIDs. Never trust a patient ID supplied by the model without server-side permission checks.
- Every error has `code`, safe `message`, `request_id` and optional field errors. Never return stack traces.
- Mutating requests should accept an idempotency key where retries could create duplicate records/bookings.
- The API returns statuses/metadata, not invented clinical conclusions.

## Common response shape

```json
{
  "data": {},
  "request_id": "req_demo_001"
}
```

## Minimum endpoint map

| Method | Path | Purpose | Owner |
|---|---|---|---|
| POST | `/api/v1/encounters` | Start an intake encounter after identity workflow | API |
| POST | `/api/v1/identity/candidates` | Demo-only candidate lookup; returns no medical details | API / mocked identity adapter |
| POST | `/api/v1/identity/confirm` | Confirm candidate via demo secondary check | API |
| GET | `/api/v1/patients/{patient_id}/context` | Retrieve allowed patient context after authorization | API |
| POST | `/api/v1/encounters/{encounter_id}/answers` | Save validated intake answer | API |
| POST | `/api/v1/encounters/{encounter_id}/documents` | Register/upload file and start extraction | API |
| GET | `/api/v1/documents/{document_id}/status` | Read processing state and extraction result | API |
| GET | `/api/v1/encounters/{encounter_id}/ledger` | Read facts with provenance/status | API |
| GET | `/api/v1/encounters/{encounter_id}/diff` | Previous versus current context | API / AI adapter |
| POST | `/api/v1/encounters/{encounter_id}/routing-review` | Run configured demo policy; returns decision and reason codes | API policy engine |
| GET | `/api/v1/appointments/slots` | Query seeded available slots by department/window | API |
| POST | `/api/v1/appointments` | Atomically book a validated slot | API |
| GET | `/api/v1/doctors/{doctor_id}/queue` | Read authorized doctor queue | API |
| GET | `/api/v1/encounters/{encounter_id}/brief` | Get source-linked brief | API / AI adapter |
| POST | `/api/v1/encounters/{encounter_id}/approvals` | Record doctor review/approval/correction | API |

## Core data concepts

### Patient

`id`, `display_name`, `date_of_birth` (optional demo), `contact_hint` (masked), `hospital_id`, `created_at`, `identity_status`. Store biometric templates only if separately approved; none are needed for this demo.

### Encounter

`id`, `patient_id`, `status`, `started_at`, `intake_language`, `intake_status`, `identity_confirmation_id`, `assigned_department_id`, `appointment_id` (optional), `created_by`.

### Clinical fact / ledger entry

`id`, `patient_id`, `encounter_id` (nullable for historical fact), `concept`, `value`, `unit` (optional), `clinical_time` (nullable), `recorded_at`, `fact_type`, `status`, `source_type`, `source_id`, `source_location` (page/section/utterance when available), `extraction_method`, `confidence` (optional calibrated/defined score), `reviewed_by` (optional), `supersedes_fact_id` (optional). Enumerations must be typed centrally.

Recommended `fact_type`: `symptom`, `medication`, `allergy`, `condition`, `investigation`, `procedure`, `other`.

Recommended `status`: `reported`, `extracted_unverified`, `historical_recorded`, `doctor_confirmed`, `uncertain`, `conflicting`, `rejected`.

### Document

`id`, `patient_id`, `encounter_id`, `filename_display`, `mime_type`, `checksum`, `storage_key`, `processing_status`, `uploaded_at`. Extraction facts refer to `document_id` and page/region where possible. Do not persist arbitrary client paths.

### Appointment slot and booking

`slot_id`, `doctor_id`, `department_id`, `start_at`, `end_at`, `status`, `booking_id`. The database transaction must re-check that the slot is available and claim it atomically. A second concurrent booking must fail with `SLOT_UNAVAILABLE` and fresh alternatives.

### Decision result

`decision`: `ROUTINE_SCHEDULING`, `HUMAN_REVIEW`, `URGENT_ESCALATION`, `UNABLE_TO_DETERMINE`; `reason_codes`: allowlisted strings; `policy_version`; `evaluated_at`. This is a synthetic policy output for the demo, not a validated clinical triage result.

## Minimum error codes

`IDENTITY_NOT_CONFIRMED`, `ACCESS_DENIED`, `VALIDATION_ERROR`, `DOCUMENT_PARSE_FAILED`, `EXTRACTION_UNCERTAIN`, `POLICY_REVIEW_REQUIRED`, `SLOT_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `MODEL_TIMEOUT`, `MODEL_OUTPUT_INVALID`, `NOT_FOUND`, `INTERNAL_ERROR`.

## Contract change protocol

1. Open an issue describing the incompatibility and why it is needed.
2. Update examples and schema definitions with a version/changelog note.
3. Get frontend, API and AI owners to agree before merge.
4. Merge the contract PR before implementing the new shape in parallel.
5. Update mock fixtures and compatibility tests in the same contract PR.
