# ClinSync Architecture and Trust Boundaries

## System topology

```text
Browser kiosk / doctor console (apps/web)
                |
                v
        FastAPI service (apps/api)
       /          |             \
SQL database   AI workflow      file storage
patients,      (apps/ai)        synthetic docs
encounters,        |
slots, audit       +-- LLM provider behind adapter
                   +-- document retrieval/index when ready
                   +-- evaluation events

All state-changing operations return through validated FastAPI services.
```

## Suggested technology choices

- Web demo: React + TypeScript + Vite (confirm chosen versions and package manager before implementation).
- API: FastAPI + Pydantic + SQLAlchemy; SQLite is acceptable for local development and synthetic demonstrations. Use transaction constraints for slots.
- Workflow: LangGraph for bounded intake, document-processing and brief workflow state. Avoid excessive agent autonomy.
- Documents/RAG: LlamaIndex only for a real ingestion/retrieval path; keep PDF/OCR extraction adapter modular.
- Memory: structured SQL records remain authoritative. Mem0 is optional and can be deferred if it doesn't add a testable benefit. Never rely on semantic memory as the only medical record.
- Tracing/evals: structured trace events and a small golden test runner first; integrate the chosen tracing/eval provider behind a thin adapter.
- CI: GitHub Actions, only enabling frontend/backend checks when those app manifests exist.

## Runtime flow

1. Start encounter and bind it to a server-verified, confirmed patient ID.
2. Load minimum necessary history using tenant/hospital and patient access checks.
3. Ask intake questions using explicit state (`known`, `missing`, `uncertain`, `conflict`, `skipped`) and bounded turn counts.
4. Extract document facts into a typed schema with source document, page/region when available, extraction status and confidence.
5. Retrieve only relevant history with metadata filters. Treat retrieved content as untrusted data, never as instructions.
6. Create ledger entries; preserve raw input and extracted candidate separately from doctor-confirmed facts.
7. Run deterministic policy rules for demo escalation. Unknown/ambiguous high-impact cases go to human review.
8. For routine cases, ask scheduling service for real seeded slots, then re-check availability inside the booking transaction.
9. Generate doctor brief exclusively from validated encounter state and sourced facts. Reject or mark unsupported factual claims.
10. Doctor reviews; approved changes are stored with actor, timestamp and previous/new value audit events.

## State vs. memory vs. source of truth

- **Workflow state:** current node, collected fields, pending question, retry count, active document job, confirmation flag, current outcome. Store in graph state/durable execution state.
- **Structured clinical record:** patient identity, encounters, medications, allergies, appointment, review/approval, facts and provenance. SQL is authoritative.
- **Document archive:** original synthetic file plus checksum, MIME type, upload event and storage reference.
- **Retrieval index:** derived, rebuildable index over allowed documents; every retrieved item has access metadata and source IDs. A vector index is not the source of truth.
- **Conversational memory:** optional and narrowly scoped; never let a memory summary silently overwrite a verified record.
- **Audit log:** append-only semantic events. Keep sensitive payloads out of ordinary app logs.

## API / tool boundaries

Every tool/service needs a name, purpose, typed input and output, permission scope, timeout, retry policy, idempotency strategy, structured errors and tests. Separate read-only operations from writes. LLM-proposed action → schema validation → deterministic authorization/policy check → explicit user/doctor confirmation where appropriate → transaction → audit event.

Never expose a general `execute_sql`, shell tool, arbitrary filesystem tool or generic `update_patient_from_text` function to the model. Use allowlisted operations with stable identifiers and server-side authorization.

## Model routing and provider separation

ClinSync uses Gemini as the only required generative provider and supports Groq as an optional text-only fallback. Bounded decisions should use deterministic application rules wherever practical.

- **Generative interface — Gemini primary:** `GEMINI_API_KEY`, `GEMINI_MODEL`. Use for patient-facing conversational wording, schema-constrained extraction/normalization and doctor-brief synthesis from validated facts. Validate all output with Pydantic and source/semantic checks.
- **Optional generation fallback — Groq:** `GROQ_API_KEY`, `GROQ_MODEL`, activated only by `LLM_FALLBACK_PROVIDER=groq`. Use only for eligible text-only tasks after transient Gemini failure/rate limit. Fallback output must satisfy the same schema, citation and safety checks. Do not assume Groq supports Gemini-specific multimodal functions. If no valid Groq model/key is configured, fallback is disabled.
- **Decision authority:** deterministic backend services own identity confirmation, authorization, clinical escalation policy, allowed specialty options, database writes and appointment transactions. Gemini may suggest candidates among explicit options; the application validates any suggestion before use.
- **No extra provider by default:** no OpenAI key or separate paid decision-model API is needed for the baseline. New providers require an architecture decision explaining the expected benefit, cost, privacy implications and evaluation plan.

Failure policy:

1. Gemini transient error → bounded retry → optional Groq only for eligible text generation → explicit unavailable/manual path.
2. Malformed or ungrounded model output → bounded repair/retry if appropriate → deterministic fallback if safe, otherwise `REVIEW_REQUIRED` / human review.
3. Missing/uncertain context → ask a targeted clarification or route to review. Model confidence is not proof of correctness or authorization.

Every model call specifies provider/model, typed input and output, timeout, retry cap, permitted fallback, data-minimization policy, trace metadata and golden tests. Keep credentials server-side. Do not create a generic `call_any_model(prompt)` helper that bypasses task-specific schemas or policy controls. Configuration and exact responsibilities are in `docs/MODEL_PROVIDER_STRATEGY.md`.

## Failure and degradation behavior

- Model timeout/invalid JSON: bounded retry, then deterministic fallback or human review.
- Document parse failure: save upload status and allow manual review/retry; don't pretend extraction succeeded.
- Retrieval empty/low-quality: say no supporting history was found; don't fabricate citations.
- Slot conflict: fail transaction and return updated availability.
- Identity uncertain: do not display record; use secondary confirmation/staff registration.
- Safety policy unavailable: don't route to routine scheduling automatically; use a clearly defined human escalation fallback.
- Audio generation failure: render the text brief with a visible playback-unavailable state.

## Trust and privacy

Use only synthetic patient data in this repo and demos. Store API keys in environment/secret manager, never in tracked files. Redact identifiers and raw transcripts from logs/traces. Enforce hospital/tenant and patient scopes server-side. Treat prompt inputs, PDFs, OCR output and tool results as untrusted. Set explicit retention and deletion policies before any real pilot. Prototype development tests do not establish clinical validity or production compliance.


## Frontend experience architecture

Follow `docs/UI_UX_DIRECTION.md`. The patient kiosk and doctor console are distinct interaction surfaces over the same API. The frontend uses typed API clients, explicit loading/error/empty/success states, and a reusable design system. Motion should clarify state transitions; reduced-motion and non-voice input paths are mandatory. Use CSS/SVG/Motion first; Three.js/React Three Fiber is optional, isolated and non-blocking only if it improves a defined experience.

## Backend module boundaries

Follow `docs/BACKEND_ENGINEERING_STANDARDS.md`. Keep the API as a modular monolith with routers, typed schemas, services, repositories, persistence, policies and provider adapters. The backend owns identity authorization, transaction boundaries, deterministic scheduling checks, source record persistence and audit events. AI tools can propose structured actions but cannot bypass server authorization or domain services.
