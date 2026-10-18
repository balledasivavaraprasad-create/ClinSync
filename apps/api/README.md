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

## Implemented API Endpoints (Phase 1, Phase 2 & Phase 3)

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

## Key Engineering & Privacy Invariants
1. **Identity Confirmation Gate**: Candidate lookup returns strictly masked display hints (`J*** D**`). Medical records and patient context are never returned until secondary factor (DOB) confirmation succeeds.
2. **Authoritative Clinical Record**: SQLite/SQLAlchemy is the sole source of truth for patients, encounters, facts, and bookings.
3. **Safe Storage & Immutability**: Uploaded documents (PDF, PNG, JPEG) are checked against magic bytes and size caps (10MB), stored securely on disk under stable UUIDs without executing payloads, and tracked with sha256 checksums.
4. **Clinical Context Ledger & Diff**: Every fact retains source modality (`PATIENT_VOICE`, `PATIENT_FORM`, `UPLOADED_DOCUMENT`), source ID, status, and clinical timestamp. Diffs compute new, changed, and conflicting facts without silent reconciliation.
5. **Thin Routes, Heavy Services**: Route handlers validate input, invoke domain services (`PatientService`, `EncounterService`, `DocumentService`, `LedgerService`), and return standard envelopes. No direct DB queries in route modules.
6. **Zero Secret Leakage**: Redact sensitive content from structured logs; credentials reside in server environment.

## Running Locally

```bash
# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run database migrations
alembic upgrade head
```

## Running Tests & Linters

```bash
# Run complete test suite (unit, integration, and contract tests)
python -m pytest apps/api/tests -v

# Run linter
python -m ruff check apps/api
```
