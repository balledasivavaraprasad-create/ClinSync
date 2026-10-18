# ClinSync API Backend Service

Owner: **Teammate B (Integration Captain)**.
Relevant Skills:
- `.agents/skills/fastapi-backend/SKILL.md`
- `.agents/skills/database-integrity/SKILL.md`
- `.agents/skills/api-contracts/SKILL.md`
- `.agents/skills/security-privacy/SKILL.md`

Documentation:
- `docs/BACKEND_ENGINEERING_STANDARDS.md`
- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `packages/contracts/openapi.json`

## Overview
FastAPI backend service implementing transactional clinical persistence, deterministic scheduling and safety rules, identity gates, and secure orchestration.

## Architecture & Directory Layout
```text
apps/api/
├── app/
│   ├── main.py                 # FastAPI application factory and lifespan handlers
│   ├── api/
│   │   └── v1/
│   │       ├── router.py       # API v1 central router aggregating all endpoints
│   │       └── routes/         # Thin route handlers (encounters, identity, health, patients)
│   ├── core/                   # Central settings, logging, structured error handlers
│   ├── db/                     # SQLAlchemy session, engine lifecycle, SQLite pragma config
│   ├── models/                 # SQLAlchemy ORM models (Patient, Encounter, ClinicalFact, AuditEvent)
│   ├── schemas/                # Pydantic v2 schemas conforming to API contracts
│   ├── services/               # Core business services (PatientService, EncounterService)
│   ├── dependencies/           # FastAPI dependency injection providers (db, request_id)
│   └── audit/                  # Append-only audit logger for sensitive actions
├── migrations/                 # Alembic migration scripts
└── tests/
    ├── unit/                   # Unit tests for models, config, and error handlers
    ├── integration/            # SQLite lifecycle, identity flow, and encounter flow tests
    └── contract/               # API contract conformity tests against openapi.json
```

## Implemented API Endpoints (Phases 1 - 6)

| Method | Endpoint | Description | Phase / Gate |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health, DB connectivity, version check | Phase 1 (`TASK-P2-101`) |
| `POST` | `/api/v1/identity/candidates` | Candidate lookup with masked names (no clinical history) | Phase 2 (`TASK-P2-201`) |
| `POST` | `/api/v1/identity/confirm` | Secondary verification (DOB); issues confirmation token | Phase 2 (`TASK-P2-201`) |
| `GET` | `/api/v1/patients/{patient_id}/context` | Authorized patient clinical context (blocked if unconfirmed) | Phase 2 (`TASK-P2-201`) |
| `POST` | `/api/v1/patients/register` | Non-biometric manual patient registration fallback | Phase 2 (`TASK-P2-201`) |
| `POST` | `/api/v1/encounters` | Create persistent encounter requiring confirmed patient | Phase 2 (`TASK-P2-201`) |
| `POST` | `/api/v1/encounters/{encounter_id}/answers` | Save intake turn, extract facts into ClinicalFact ledger | Phase 2 (`TASK-P2-201`) |
| `POST` | `/api/v1/encounters/{encounter_id}/documents` | Upload/register document with MIME/size checks and sha256 | Phase 3 (`TASK-P2-301`) |
| `GET` | `/api/v1/documents/{document_id}/status` | Query document processing status and extracted facts | Phase 3 (`TASK-P2-301`) |
| `GET` | `/api/v1/encounters/{encounter_id}/ledger` | Authoritative Clinical Context Ledger with provenance & conflicts | Phase 3 (`TASK-P2-301`) |
| `GET` | `/api/v1/encounters/{encounter_id}/diff` | Patient Context Diff comparing historical EHR with current facts | Phase 3 (`TASK-P2-301`) |
| `POST` | `/api/v1/encounters/{encounter_id}/routing-review` | Deterministic safety policy & allowlisted specialty routing | Phase 4 (`TASK-P2-401`) |
| `GET` | `/api/v1/appointments/slots` | Query seeded available appointment slots by department & date | Phase 4 (`TASK-P2-401`) |
| `POST` | `/api/v1/appointments` | Atomically book slot within transaction (idempotent, race-safe) | Phase 4 (`TASK-P2-401`) |
| `GET` | `/api/v1/doctors/{doctor_id}/queue` | Read authorized doctor encounter queue by department & booking | Phase 5 (`TASK-P2-501`) |
| `GET` | `/api/v1/encounters/{encounter_id}/brief` | Evidence-backed clinical brief synthesized from ledger facts | Phase 5 (`TASK-P2-501`) |
| `POST` | `/api/v1/encounters/{encounter_id}/approvals` | Record clinical sign-off, confirm facts, append audit event | Phase 5 (`TASK-P2-501`) |

## Key Engineering & Privacy Invariants
1. **Identity Confirmation Gate**: Candidate lookup returns strictly masked display hints (`J*** D**`). Medical records and patient context are never returned until secondary factor (DOB) confirmation succeeds.
2. **Authoritative Clinical Record**: SQLite/SQLAlchemy is the sole source of truth for patients, encounters, facts, and bookings.
3. **Safe Storage & Immutability**: Uploaded documents (PDF, PNG, JPEG) are checked against magic bytes and size caps (10MB), stored securely on disk under stable UUIDs without executing payloads, and tracked with sha256 checksums.
4. **Clinical Context Ledger & Diff**: Every fact retains source modality (`PATIENT_VOICE`, `PATIENT_FORM`, `UPLOADED_DOCUMENT`), source ID, status, and clinical timestamp. Diffs compute new, changed, and conflicting facts without silent reconciliation.
5. **Deterministic Safety Policy (Rule 10)**: Clinical model outputs cannot independently escalate or schedule emergency patients. High-risk acute red flags (ACS, respiratory distress, FAST acute stroke, anaphylaxis, massive hemorrhage, psychiatric crisis) unconditionally trigger `URGENT_ESCALATION`.
6. **Atomic Booking & Race Safety**: Appointment booking transactions enforce database-level uniqueness constraints and idempotency checking. Concurrent duplicate booking attempts for the same slot strictly result in 1 winner (201 Created) and 409 Conflict (`SLOT_UNAVAILABLE`). Identical concurrent replays return the existing booking idempotently.
7. **Doctor Sign-Off & Fact Confirmation**: Doctor review transitions encounters to `DOCTOR_REVIEWED`, marks facts as `doctor_confirmed` with `reviewed_by`, applies fact corrections, and records immutable `AuditEvent` logs with `actor_role="DOCTOR"`. Unconfirmed patient encounters reject approvals with 403 `IDENTITY_NOT_CONFIRMED`.
8. **Thin Routes, Heavy Services**: Route handlers validate input, invoke domain services (`PatientService`, `EncounterService`, `DocumentService`, `LedgerService`, `RoutingService`, `AppointmentService`, `DoctorService`), and return standard envelopes. No direct DB queries in route modules.
9. **Zero Secret Leakage & Redaction**: Strict log filter masks SSNs, PANs, 10-digit phone numbers, Bearer tokens, and vendor API keys (`AIza...`, `gsk_...`, `AQ...`) across all console and file loggers.

## Demo Data Seeding & Database Reset

A deterministic, idempotent seeder is provided in `apps/api/scripts/seed_demo_data.py`:

```bash
# Seed demo data idempotently (skips already existing records)
python apps/api/scripts/seed_demo_data.py

# Cleanly purge all clinical/audit data and re-seed fresh state
python apps/api/scripts/seed_demo_data.py --reset
```

The script populates:
- Synthetic Patients: Eleanor Vance (`pat_eleanor_001`), Marcus Brody (`pat_marcus_002`), Sarah Jenkins (`pat_sarah_003`)
- Historical EHR records (hypertension, penicillin allergy, chronic migraine)
- Available appointment slots across all 8 hospital departments
- Active cardiology demo encounter (`enc_demo_cardio_01`) booked with Dr. Clara Chen

## Running Locally

```bash
# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run database migrations
alembic upgrade head
```

## Running Tests & Linters

```bash
# Run complete test suite (unit, integration, and security tests)
python -m pytest apps/api -v

# Run End-to-End System Journey test
python -m pytest apps/api/tests/integration/test_end_to_end_journey.py -v

# Run Concurrency & Race Condition tests
python -m pytest apps/api/tests/integration/test_concurrency_booking.py -v

# Run Security & Privacy Audit tests
python -m pytest apps/api/tests/unit/test_security_privacy_audit.py -v

# Run linter
python -m ruff check apps/api
```
