---
name: database-integrity
description: Use for SQLAlchemy entities, database constraints, migrations, seeding, transactions, provenance, audit events and persistence invariants.
---

# Database Integrity Skill

## Read first

`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/BACKEND_ENGINEERING_STANDARDS.md`, `docs/API_CONTRACTS.md`, and `docs/TEAM_OWNERSHIP.md`.

## Owned paths

The API owner is the sole routine editor of `apps/api/**` and migrations. Teammates propose schema needs in an issue or contract PR; do not create competing migrations independently.

## Rules

- SQL is authoritative for patient records, encounters, bookings, review states and approval history.
- Give primary entities stable IDs, timestamps and explicit status fields. Use foreign keys and uniqueness constraints for invariants, not just application checks.
- Preserve fact provenance: source type/id, date, extraction status, author/actor and review state as applicable.
- Store source candidate facts separately from doctor-confirmed facts; record correction history instead of silently overwriting clinically meaningful values.
- Make booking atomic and protect unique slots at the database layer. Handle duplicate requests with idempotency where needed.
- Keep migrations deterministic and tested on both empty and existing database states. Never delete/reset user data as a side effect of app startup; demo reset must be an explicit command and use synthetic data only.
- Add indexes only for real query patterns; document why a migration adds them.
- Avoid putting the same authoritative field in multiple tables without a defined consistency rule.
- Do not store raw biometric templates in the prototype. Minimize sensitive log payloads.

## Tests

Cover foreign keys/uniqueness, migration path, source linkage, audit events, patient/tenant isolation, booking concurrency, idempotent retry and demo seed/reset.
