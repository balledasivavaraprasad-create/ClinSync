# Quality Gates and Acceptance Tests

## Gate 1 — Identity and authorization

- Unconfirmed identity cannot access patient history.
- Candidate lookup returns minimal non-sensitive data only.
- Every patient/encounter read verifies authorized hospital/user scope on the server.
- No biometric template is stored in development or demonstration data.

## Gate 2 — Intake and structured model output

- Intake has an explicit field schema, stop condition and maximum question count.
- Existing known answers are not asked again unless confirmation is needed.
- Invalid JSON/schema output is rejected and boundedly retried/falls back.
- Low-confidence or contradictory answers are marked `uncertain` / `conflicting` rather than silently guessed.

## Gate 3 — Evidence ledger and brief

- Every extracted fact references a known source record/document; document facts include page/section where available.
- Summary generation cannot invent source IDs. Every citation resolves to a document/fact visible to the authorized user.
- Distinguish patient-reported, extracted-unverified, historical-recorded and doctor-confirmed values.
- Conflicts remain visible until reviewed; one source is not silently overwritten by another.
- Empty retrieval is reported honestly.

## Gate 4 — Routing and scheduling

- Demo policy rules are versioned and deterministic; model may extract symptom facts but cannot alter rule thresholds.
- Predefined high-risk scenario enters escalation; ambiguous case enters human review.
- Routine scheduling only occurs after policy permits it.
- Booking transaction prevents double-booking; stale slot returns safe alternatives.
- Every booking and policy outcome is auditable.

## Gate 5 — Security and privacy

- Only synthetic fixtures in source control and demo.
- No tracked `.env`, token or key; check `git diff` and CI for accidental secrets.
- Treat user text, PDFs, OCR and retrieval results as untrusted; test indirect prompt-injection fixture.
- Never execute LLM-generated SQL, shell or arbitrary tool actions.
- Logs contain request/trace IDs and redacted metadata, not raw medical content by default.

## Gate 6 — Agentic system quality

- Every graph node has defined input/output schema, timeout, retry cap and fallback.
- Tool calls are allowlisted, authorized, schema-validated and observable.
- Evaluate at least intent/field extraction, retrieval/source relevance, tool args, policy behavior and final task completion.
- Keep a versioned synthetic golden dataset and record model/prompt/eval version with result.
- At least one integration test covers a full happy path and one important failure path.

## Gate 7 — Model providers and failure behavior

- Gemini is the configured primary generation provider; its key is server-side and missing-key errors are actionable.
- Groq is optional and disabled by default; if enabled, only declared text-only tasks may fall back, and the same output/schema/source validation runs again.
- Gemini is the only required remote model provider; offline tests work with deterministic fakes and do not require a model key.
- Groq is optional and disabled by default. Enabling it requires a configured key/model and tests proving the same task contract is preserved.
- All model-proposed choices are checked against allowlists; numeric values are range-checked; missing fields, unknown IDs and malformed payloads are rejected.
- Gemini/Groq failures cannot report false success or bypass review, authorization, escalation rules or transactional booking.
- Unit/integration tests cover timeout, non-retryable auth/validation errors, retryable overload, fallback metadata and sensitive-data redaction.

## Phase Integration Gates (G0 — G6)

Every milestone transition and pull request integration must verify the corresponding phase gate:

### Gate G0 — Repository & Contracts Foundation
- Ownership boundaries are clear (`docs/TEAM_OWNERSHIP.md`, `.github/CODEOWNERS`).
- Canonical API contracts are frozen and validated (`packages/contracts/openapi.json`).
- Master task register and dependency graph established (`docs/DEPENDENCY_GRAPH.md`).
- Repository CI baseline verified (`quality-gates` job).
- Branching and auto-merge instructions established (`docs/CI_CD_AND_AUTO_MERGE.md`).

### Gate G1 — Parallel Engineering Foundations
- Frontend shell and configured checks work (`apps/web`).
- Backend skeleton, SQLite lifecycle, and health tests work (`apps/api`).
- AI provider abstraction can be tested offline without remote keys (`apps/ai`).
- Trace hooks and evaluation runner work with synthetic test cases (`evals/`).
- Shared interfaces remain consistent.

### Gate G2 — Patient Identity & Adaptive Intake
- Patient registration and safe identity candidate flow.
- Validated intake turn persistence in SQLite.
- Structured AI outputs with missing-information handling.
- Appropriate error and trace behavior.
- Relevant unit tests and golden evaluations pass.

### Gate G3 — Document Ingestion & Clinical Context
- Safe document upload and patient association.
- Extracted facts preserve traceable document and page provenance.
- Clinical Context Ledger and Patient Context Diff work against real data.
- Contradictions and unsupported claims are handled appropriately without silent reconciliation.
- Relevant retrieval and extraction evaluations pass.

### Gate G4 — Safety, Specialty Routing & Scheduling
- Backend-enforced safety policies: emergency red-flags trigger mandatory escalation.
- Valid specialty and available-slot handling.
- Atomic booking transactions with concurrency conflict prevention (`SLOT_UNAVAILABLE`).
- Required human-review escalation behavior.
- Tests for invalid input, provider failure, and concurrent booking.

### Gate G5 — Doctor Handoff
- The authorized doctor sees the correct patient and encounter queue.
- Evidence-backed doctor brief renders with verified source citations.
- Consultation review and updates persist with audit provenance.
- In-app notifications correspond to actual committed bookings.
- Summary evaluations pass with 100% citation grounding.

### Gate G6 — Integrated Release Verification
- End-to-end synthetic patient journey functions from kiosk approach to doctor sign-off.
- Full regression test suite passes.
- CI `quality-gates` job is green on `main`.
- No unresolved critical dependency or contract mismatches.
- Tablet visual QA and accessibility verified.

---

## Minimum release bar

- CI green (`quality-gates` passed).
- No known identity leak or double booking.
- No test case permits a model output to bypass deterministic server checks.
- Every must-ship screen has loading, error and empty states.
- Demo can be reset/replayed from documented seed data.
- All known mocks/limitations are documented.
