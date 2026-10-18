# Handoff — TASK-P2-301: Document Metadata, Safe Storage API, Clinical Context Ledger & Diff APIs

- **Owner**: Person 2 (Backend & Integration Captain)
- **Branch**: `feat/p2-document-api`
- **Workstream**: Backend & API (`apps/api/**`)
- **Status**: VERIFIED
- **Depends On**: `TASK-P2-201` (INTEGRATED)

## Goal and Acceptance Criteria
- [x] Document upload with safe storage (`POST /api/v1/encounters/{encounter_id}/documents`) accepting PDF, PNG, and JPEG formats, enforcing 10MB size caps, validating magic bytes signatures, computing sha256 checksums, and preserving source file immutability.
- [x] Scoped authorization and patient association: Every document upload is linked to an existing encounter and verified confirmed patient (`identity_status == "CONFIRMED"`). Path traversal in filenames is sanitized to prevent directory escapes.
- [x] Document processing status tracking (`GET /api/v1/documents/{document_id}/status`) reporting lifecycle states (`UPLOADED`, `PROCESSING`, `EXTRACTED`, `FAILED`), error messages, and linked extracted clinical facts.
- [x] Clinical Context Ledger retrieval (`GET /api/v1/encounters/{encounter_id}/ledger`) returning all encounter facts with complete provenance (`source_type`, `source_id`, `source_location`, `confidence`, `extraction_method`) and surfaced unresolved conflicts list.
- [x] Patient Context Diff retrieval (`GET /api/v1/encounters/{encounter_id}/diff`) computing new facts, changed facts (with historical vs current comparison), and surfacing contradictions/conflicts without silent reconciliation.
- [x] Database migration `0003_add_documents.py` defining `documents` table with foreign keys, constraints, and indexes on `patient_id`, `encounter_id`, and `checksum_sha256`.
- [x] Full test coverage with 59 automated API tests passing (unit, integration, and OpenAPI contract tests).

## Files Changed / Created
- `apps/api/app/core/config.py`: Added `STORAGE_DIR`, `MAX_UPLOAD_SIZE_BYTES`, and `ALLOWED_MIME_TYPES` configuration.
- `apps/api/app/models/document.py`: `Document` SQLAlchemy entity tracking display filename, MIME type, size, sha256, storage path, status, and error message.
- `apps/api/app/models/patient.py`: Added relationship to `Document`.
- `apps/api/app/models/encounter.py`: Added relationship to `Document`.
- `apps/api/app/models/__init__.py`: Exported `Document`.
- `apps/api/migrations/versions/0003_add_documents.py`: Alembic migration for `documents` table.
- `apps/api/app/schemas/document.py`: Pydantic `DocumentUploadRequest`, `DocumentStatusData`, and `DocumentStatusResponse` schemas conforming to OpenAPI contracts and web types.
- `apps/api/app/schemas/ledger.py`: `LedgerData`, `LedgerResponse`, `ChangedFact`, `ConflictingFactDetail`, `DiffData`, and `DiffResponse` schemas.
- `apps/api/app/schemas/__init__.py`: Exported document and ledger schemas.
- `apps/api/app/services/document_service.py`: Document upload validation, magic byte checking, sanitization, disk storage, sha256 checksums, and status queries.
- `apps/api/app/services/ledger_service.py`: Ledger fact aggregation, provenance mapping, unresolved conflict detection, and historical diff computation.
- `apps/api/app/services/__init__.py`: Exported `DocumentService` and `LedgerService`.
- `apps/api/app/api/v1/routes/documents.py`: `POST /encounters/{encounter_id}/documents` and `GET /documents/{document_id}/status`.
- `apps/api/app/api/v1/routes/ledger.py`: `GET /encounters/{encounter_id}/ledger` and `GET /encounters/{encounter_id}/diff`.
- `apps/api/app/api/v1/router.py`: Registered documents and ledger routers in API v1.
- `apps/api/README.md`: Documented Phase 3 endpoints, invariants, and architecture.
- `apps/api/tests/unit/test_document_model.py`: Model unit tests for `Document`.
- `apps/api/tests/integration/test_document_flow.py`: Integration tests for PDF/PNG/JPEG upload, magic byte checks, size caps, path traversal sanitization, status lifecycle, and error handling.
- `apps/api/tests/integration/test_ledger_diff_flow.py`: Integration tests for ledger provenance, conflict surfacing, diff calculation (new, changed, conflicting), and patient isolation.
- `apps/api/tests/contract/test_document_contract.py`: Contract tests verifying 100% conformity against `packages/contracts/openapi.json`.

## Validation Evidence
- **Test Command**: `python -m pytest apps/api/tests -v`
  - Result: 59 passed in 1.35s
- **Linter Command**: `python -m ruff check apps/api`
  - Result: All checks passed!
- **Cross-Service Tests**: `python -m pytest apps/ai/tests -v`
  - Result: 36 passed, 2 skipped in 5.51s (total 89 passing automated tests across repo)
- **Contract Validation**: `npm run validate:all`
  - Result: openapi.json is valid OpenAPI 3.1.0 (15 endpoints, 25 schemas), `git diff --check` clean.
