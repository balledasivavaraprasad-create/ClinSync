# Backend Engineering Standards

These conventions guide `apps/api/**`. The API is the trust boundary between the browser, agentic workflow, database, and any external providers.

## Suggested module structure

```text
apps/api/
├── pyproject.toml
├── app/
│   ├── main.py
│   ├── core/          # settings, logging, request IDs, errors
│   ├── api/v1/        # versioned route modules
│   ├── schemas/       # Pydantic request/response models
│   ├── models/        # SQLAlchemy entities
│   ├── repositories/  # data access; no business policy
│   ├── services/      # validated business rules and use cases
│   ├── policies/      # deterministic escalation/permission policies
│   ├── adapters/      # Gemini/Groq generation, OCR/files/tracing
│   └── db/            # session, migrations, seed/reset
└── tests/
    ├── unit/
    ├── integration/
    └── security/
```

The API owner may adjust the structure with an architecture decision before significant code is added. Keep modules small; do not create abstraction layers that have no current use.

## Mandatory backend rules

- Keep route handlers thin: parse/validate input, authenticate/authorize, call a service, return a typed response.
- Use Pydantic request/response schemas; never return ORM objects or internal exception strings directly.
- Use SQLAlchemy sessions with clear transaction boundaries. Add database constraints for invariants such as one active booking per slot.
- Put policy and workflow invariants in Python services/database constraints, not only in prompts.
- Verify hospital/user/patient/encounter scope on every protected operation. An identifier from the browser or LLM is a requested identifier, not authorization.
- Use generated storage keys, size limits, allowlisted content types, parsing limits and safe error responses for uploaded documents.
- Give mutating endpoints idempotency support where retries/double clicks could duplicate effects.
- Separate candidate/extracted values from doctor-confirmed values. Preserve source references and change history.
- Use explicit enums for fact status, extraction state, booking status and escalation state.
- Use a consistent error envelope containing stable error code, safe message, request ID and optional field errors.
- Add request/trace correlation IDs. Do not log raw symptom transcripts, PDF contents, tokens, biometric payloads or full patient data by default.
- Wrap Gemini generation, optional Groq fallback, OCR/vector/search/notification providers behind adapters so tests and offline demos can use deterministic fakes. Keep bounded decision rules in ordinary, tested Python modules.
- Read `docs/MODEL_PROVIDER_STRATEGY.md` before adding a provider. The baseline has no direct OpenAI API/provider; do not add `OPENAI_API_KEY` without a recorded ADR.
- Keep model suggestions separate from deterministic decision logic. Preserve task contracts, provider metadata, timeouts and failure policies; do not let prompts replace backend rules.
- Gemini is primary for generation; Groq is an optional text-only fallback disabled by default. If enabled, it must pass the same schema and provenance validation.
- Model failure must use a task-specific deterministic fallback or review path. Do not treat generated prose as proof that a decision, extraction or side effect succeeded.
- Bound timeouts, retries and concurrency. A provider outage must not leave the UI showing a successful extraction or booking.
- Do not add Celery, Redis, a service mesh or microservices unless an actual requirement and runnable test justify them; the initial app should remain understandable as a modular monolith.

## Booking transaction pattern

1. Validate patient encounter and authorization.
2. Validate policy outcome permits routine booking.
3. Start a database transaction.
4. Atomically claim the requested available slot under a unique constraint/locking strategy.
5. Create appointment and audit event within the same transaction.
6. Commit; on conflict return a stable `SLOT_UNAVAILABLE` response with refreshed availability.
7. Make retries idempotent using a request/idempotency key where appropriate.

Never trust “slot is available” based only on a stale frontend list.

## File processing pattern

1. Create an upload record and generated storage reference.
2. Validate size/type and store bytes without trusting the submitted filename/path.
3. Track processing state (`uploaded`, `processing`, `processed`, `failed`, `needs_review`).
4. Extract text/facts through an adapter with source/page provenance.
5. Validate output and store candidate facts separately from approved facts.
6. On failure preserve the upload record and provide retry/manual-review behavior; never fabricate successful extraction.

## Required tests

- Request/response schema validation and stable error formats.
- Unconfirmed identity and cross-patient/tenant access denied.
- Patient/encounter ownership checks for reads and mutations.
- Slot concurrency, stale slot, duplicate submit and idempotent retry.
- Failed/malformed document processing and file size/type limits.
- AI adapter timeout/invalid schema/fallback behavior.
- Audit events for sensitive state changes and doctor approval.
- Health endpoint and startup/seed/reset behavior from a clean checkout.
