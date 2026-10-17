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
│   │       └── routes/         # Thin route handlers (encounters, identity, slots, etc.)
│   ├── core/                   # Central settings, logging, structured error handlers
│   ├── auth/                   # Hospital/doctor authentication & tenant/encounter tokens
│   ├── db/                     # SQLAlchemy session, engine lifecycle, SQLite pragma config
│   ├── models/                 # SQLAlchemy ORM models (Patient, Encounter, Fact, Slot)
│   ├── schemas/                # Pydantic v2 schemas conforming to API contracts
│   ├── repositories/           # Data access layer isolating DB queries from business logic
│   ├── services/               # Core business services (booking, policy, identity, facts)
│   ├── dependencies/           # FastAPI dependency injection providers (db, auth, services)
│   └── audit/                  # Append-only audit logger for sensitive actions
├── migrations/                 # Alembic migration scripts
└── tests/
    ├── unit/                   # Unit tests for policy rules and business logic
    ├── integration/            # SQLite transaction, concurrency, and repository tests
    └── contract/               # API contract conformity tests against openapi.json
```

## Key Engineering Rules
1. **Authoritative Clinical Record**: SQLite/SQLAlchemy is the sole source of truth for patients, encounters, facts, and bookings.
2. **Thin Routes, Heavy Services**: Route handlers parse requests, call services, and return responses. No database queries in route handlers.
3. **Transaction Safety**: Slot booking must execute inside an explicit atomic transaction with conflict rejection (`SLOT_UNAVAILABLE`).
4. **Deterministic Gatekeeper**: LLMs suggest facts; deterministic backend policies enforce clinical escalation, permissions, and booking.
5. **Zero Secret Leakage**: Redact sensitive content from structured logs; credentials reside in server environment.
