---
name: fastapi-backend
description: Use when implementing FastAPI routes, Pydantic schemas, SQLAlchemy models, authorization, patient records or appointment transactions.
---

# FastAPI Backend Skill

## Read first

`AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`, `docs/BACKEND_ENGINEERING_STANDARDS.md`, `docs/API_CONTRACTS.md`, `docs/QUALITY_GATES.md`.

## Owned paths

`apps/api/**` and API-specific tests. API owner is the sole editor of database migrations during the hackathon; coordinate migration order before creating a second one.

## Implementation rules

- Use typed Pydantic request/response schemas and structured, safe error payloads.
- Keep business rules in tested service functions, not route handlers or LLM prompts.
- Validate tenant/hospital scope, user permissions, identity confirmation and resource ownership server-side for every read/write.
- Use transactions/constraints for slot booking and idempotency for retried mutations.
- Do not trust patient IDs, department IDs, source IDs or action arguments produced by a model without database lookup and authorization.
- Store uploaded files under generated keys; do not trust client file paths or MIME type alone. Use size/type limits and safe filenames.
- Keep database records authoritative; document indexes/caches are derived.
- Log request IDs, codes, timing and safe metadata; do not log raw clinical text or file contents by default.
- Provide a mockable LLM/document adapter so API tests run without external credentials.

## Checks

Test access before identity confirmation, unauthorized cross-record reads, request schema errors, booking double-submit/concurrency, idempotent retry, document upload failure and safe error mapping. Apply schema/migration updates with tests. Never alter shared contracts without a reviewed contract-change PR.
