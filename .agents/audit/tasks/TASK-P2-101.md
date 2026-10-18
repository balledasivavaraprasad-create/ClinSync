# Handoff — TASK-P2-101: FastAPI App Core, SQLite Lifecycle & Base Persistence Models

- **Owner**: Person 2 (Backend & Integration Captain)
- **Branch**: `feat/p2-api-core`
- **Workstream**: Backend & API (`apps/api/**`)
- **Status**: IMPLEMENTED / VERIFIED

## Goal and Acceptance Criteria
- [x] FastAPI application factory and versioned router `/api/v1` initialized.
- [x] Application settings using `pydantic-settings` reading from `.env` and environment variables.
- [x] SQLite database engine configured with `PRAGMA foreign_keys = ON;` and `PRAGMA journal_mode = WAL;`.
- [x] Base SQLAlchemy models for `Patient`, `Encounter`, and `AuditEvent` conforming to OpenAPI 3.1 contracts.
- [x] Standard error envelope (`ErrorDetail` with `code`, `message`, `request_id`, `field_errors`) and centralized exception handlers.
- [x] Alembic migrations configured with initial migration `0001_initial_core_models`.
- [x] Health check endpoint `GET /api/v1/health` with database probe and request ID propagation.
- [x] Comprehensive test suite (12 tests across unit, integration, and contract tests) passing.

## Files Changed / Created
- `apps/api/pyproject.toml`
- `apps/api/requirements.txt`
- `apps/api/alembic.ini`
- `apps/api/app/__init__.py`
- `apps/api/app/main.py`
- `apps/api/app/core/config.py`
- `apps/api/app/core/logging.py`
- `apps/api/app/core/errors.py`
- `apps/api/app/db/base.py`
- `apps/api/app/db/session.py`
- `apps/api/app/models/patient.py`
- `apps/api/app/models/encounter.py`
- `apps/api/app/models/audit.py`
- `apps/api/app/schemas/common.py`
- `apps/api/app/schemas/health.py`
- `apps/api/app/schemas/patient.py`
- `apps/api/app/schemas/encounter.py`
- `apps/api/app/schemas/audit.py`
- `apps/api/app/dependencies/request_id.py`
- `apps/api/app/dependencies/db.py`
- `apps/api/app/api/v1/router.py`
- `apps/api/app/api/v1/routes/health.py`
- `apps/api/migrations/env.py`
- `apps/api/migrations/script.py.mako`
- `apps/api/migrations/versions/0001_initial_core_models.py`
- `apps/api/tests/conftest.py`
- `apps/api/tests/unit/test_config.py`
- `apps/api/tests/unit/test_errors.py`
- `apps/api/tests/unit/test_models.py`
- `apps/api/tests/integration/test_health.py`
- `apps/api/tests/integration/test_db_lifecycle.py`
- `apps/api/tests/contract/test_error_contract.py`
- `.gitignore` (added `*.db-wal`, `*.db-shm`)
- `pyproject.toml` (added `B008` ignore for FastAPI `Depends`)

## Validation Evidence
- **Test Command**: `python -m pytest apps/api/tests -v`
  - Result: 12 passed in 0.23s
- **Linter Command**: `python -m ruff check apps/api`
  - Result: All checks passed!
- **Contract Validation**: `npm run contracts:validate`
  - Result: openapi.json is valid OpenAPI 3.1.0 (15 endpoints, 25 schemas)
- **Whitespace / Diff Check**: `git diff --check`
  - Result: Clean, 0 errors
- **Alembic Migration Test**:
  - `alembic upgrade head` -> Success (`0001_initial_core_models`)
  - `alembic downgrade base` -> Success (clean rollback)
  - `alembic upgrade head` -> Success

### Sample Health API Output
```json
{
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "database": "connected",
    "timestamp": "2026-10-18T05:54:30.123456+00:00"
  },
  "request_id": "req_demo_test_01"
}
```

## Contract / Schema Impact
- Conforms directly to `packages/contracts/openapi.json`. No breaking contract changes introduced.

## Known Gaps / Deferred Work
- Full patient lookup/registration routes deferred to `TASK-P2-201` (Patient API).
- AI gateway integration belongs to Person 3 (`TASK-P3-101`).

## Next Step
- Stage and commit task files to `feat/p2-api-core`.
- Push branch and open PR targeting `main`.
