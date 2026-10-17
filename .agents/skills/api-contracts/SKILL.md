---
name: api-contracts
description: Use when authoring, reviewing or changing request/response schemas shared by the web, API and AI workstreams.
---

# API Contracts Skill

## Read first

`AGENTS.md`, `docs/API_CONTRACTS.md`, `docs/TEAM_OWNERSHIP.md`, and `packages/contracts/README.md`.

## Ownership

The Integration Captain is the sole routine editor of canonical contracts in `docs/API_CONTRACTS.md` and `packages/contracts/**`. Other contributors propose changes with rationale and sample request/response payloads; they do not silently invent fields.

## Rules

- Define stable request, success response, error response, enum and identifier shapes.
- Use explicit versioning when a change is breaking. Prefer additive, backward-compatible changes.
- Include examples and validation requirements for nullable/optional fields; distinguish absent, unknown, uncertain and empty values.
- Define error codes and retryability. Never expose stack traces or provider-specific exceptions as the API contract.
- Keep patient/encounter/slot identifiers server-validated; a schema is not permission.
- Define idempotency behavior for mutating calls that may be retried.
- If an API change crosses web/AI/backend, create a contract-change issue and specify which consumers need updates.
- Add contract tests or schema checks; update mocks/fixtures and docs in the same reviewed change.

## Definition of done

The API owner, web owner and AI owner can independently implement against the same examples; CI or tests catch incompatible schema changes; migration or rollout behavior is documented.
