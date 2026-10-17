# ClinSync Implementation Roadmap

This is an outcome-driven sequence. Workstreams can progress in parallel after ownership and contracts are agreed. Reorder only when a dependency requires it; record the reason in the decision log.

## Milestone A — Repository foundation

**Owner:** Teammate B / Integration Captain, with input from A and C.

- [ ] Assign three contributors and confirm path ownership.
- [ ] Commit scaffold and ensure governance CI passes.
- [ ] Agree the core domain objects and freeze the first API contract.
- [ ] Confirm `.env.example` provider variables and synthetic seed data; use no secrets in Git.
- [ ] Agree provider split: Gemini for generation, deterministic application logic for bounded decisions, and optional Groq text fallback disabled by default; no OpenAI key/provider or extra paid decision-model API in the baseline.
- [ ] Establish frontend design tokens and application shell.
- [ ] Establish automated CI verification and auto-merge protocol (`quality-gates` status check).
- [ ] Create issues with exact paths and acceptance criteria.

**Exit criteria:** Contributors can work in distinct paths using the same documented contracts; repository checks run from a clean checkout; automated PR merge lifecycle (`docs/CI_CD_AND_AUTO_MERGE.md`) is active.

## Milestone B — Application foundation (parallel)

### Teammate A — Experience and frontend

- [ ] Build the design system: typography, color tokens, spacing, surfaces, focus states, interaction states and motion rules.
- [ ] Build the patient-facing kiosk shell: language/consent, identity candidate, secondary confirmation, fallback registration.
- [ ] Build the conversational intake UI with mic, text-entry fallback, progress, correction and interruption states.
- [ ] Build document attach/review, slot selection, confirmation and completion states.
- [ ] Build the doctor console shell: queue, patient context, evidence ledger, conflict markers, brief and audio state.
- [ ] Use contract-conforming mock adapters until live endpoints are ready.

**Exit criteria:** All core views are navigable with synthetic data; tablet and desktop layouts work; loading/error/empty/success states are present; keyboard and reduced-motion behavior are verified.

### Teammate B — API and data foundation

- [ ] Build FastAPI application settings, health endpoint, router/service/repository layout and error contract.
- [ ] Define SQLAlchemy entities and migration/initialization path for patients, encounters, source documents, clinical facts, appointments, audit events and review/approval state.
- [ ] Implement synthetic seed and reset commands.
- [ ] Implement patient registration and server-side identity-confirmation gate.
- [ ] Implement encounter/intake persistence and document metadata endpoints.
- [ ] Implement departments, doctors, available slots and transaction-safe booking.
- [ ] Add request IDs, structured safe logging and authorization tests.

**Exit criteria:** Core records persist and reload; identity is verified on the server; booking concurrency tests prevent double booking; errors use documented schemas.

### Teammate C — Agentic workflow, retrieval and evals

- [ ] Define typed LangGraph state with known/missing/uncertain/conflicting fields, pending question, retry count and stopping conditions.
- [ ] Implement a provider abstraction for Gemini primary generation and optional Groq fallback for compatible text-only generation tasks. Keep bounded decisions in deterministic state machines and policy services.
- [ ] Add configuration validation: offline tests work without remote keys; Gemini selected requires `GEMINI_API_KEY`; Groq fallback selected requires `GROQ_API_KEY` and a configured model.
- [ ] Add provider-specific retry/fallback behavior. Invalid model output ends in deterministic task fallback or `REVIEW_REQUIRED`; never let a provider response replace deterministic policy checks.
- [ ] Implement bounded adaptive follow-up for synthetic intake inputs.
- [ ] Implement structured document fact extraction with document/page provenance and extraction status.
- [ ] Implement Context Ledger assembly and Patient Context Diff from source records and fixtures.
- [ ] Implement doctor brief generation constrained to validated facts and source IDs.
- [ ] Add golden tests for ordinary intake, missing data, source conflict, invalid output, empty retrieval, prompt injection and configured escalation inputs.
- [ ] Add trace instrumentation behind a thin adapter; use only redacted/synthetic content.

**Exit criteria:** Graph execution terminates within limits; schemas validate; source attribution is preserved; unsupported facts are marked rather than invented; regression tests are runnable.

## Milestone C — Core patient workflow

- [ ] Connect frontend to the frozen API contracts.
- [ ] Connect intake answers to a persisted encounter and explicit workflow state.
- [ ] Connect upload to extraction, source storage and the Context Ledger.
- [ ] Show new/changed/historical/uncertain/conflicting facts in the UI.
- [ ] Run the deterministic demo policy before routine scheduling.
- [ ] Connect booking to the actual seeded slot service and update the doctor queue.
- [ ] Generate the doctor brief from validated facts and enable audio as an optional enhancement.

**Exit criteria:** A synthetic patient can complete the full flow from approach to doctor handoff without manually editing the database or faking a successful backend result.

## Milestone D — Clinical intelligence

- [ ] Clinical Context Ledger with provenance tracking and status distinctions.
- [ ] Patient Context Diff showing new, changed, historical and conflicting facts.
- [ ] Evidence-aware retrieval and extraction validation.
- [ ] Controlled summary generation with source citations.
- [ ] Safety and uncertainty handling: test malformed model output, timeout, retries, empty retrieval, parse failure, Gemini-to-Groq fallback for eligible text tasks, and provider failure-to-review behavior.
- [ ] Confirm clinical conflicts are never silently overwritten.

**Exit criteria:** Important negative paths behave predictably and have automated tests or documented limitations.

## Milestone E — Doctor handoff

- [ ] Specialty routing and deterministic triage policies.
- [ ] Validated appointment booking with atomic slot locking.
- [ ] Doctor dashboard with scannable queue, alerts, and patient brief.
- [ ] Audio brief interface with safe text fallback.
- [ ] Clinical review and record update approval flow.
- [ ] Visual QA against agreed tablet viewport sizes.

**Exit criteria:** The app feels intentionally designed, remains fast and accessible, and never sacrifices clinical clarity for visual spectacle.

## Milestone F — Verification and delivery

- [ ] CI covers every initialized workstream and runs the relevant tests/builds.
- [ ] Run the synthetic golden evaluation set and save a non-sensitive report.
- [ ] Run a full happy path and selected failure paths from a clean checkout.
- [ ] Verify seed/reset behavior and document required environment variables.
- [ ] Capture screenshots and safe trace identifiers for the demo narrative.
- [ ] Document which parts are implemented, mocked, deferred or not clinically validated.
- [ ] Ensure `AUDIT.md` reflects merged, tested evidence rather than intentions.

**Exit criteria:** Another teammate can clone the repository, follow the README, run the system, replay the demonstration and understand its limitations.

## Priority rule

When choosing between another feature and a stronger end-to-end flow, prioritize in this order:

1. Identity/session isolation and reliable encounter persistence.
2. Polished kiosk experience with conversational fallback states.
3. Source-linked Context Ledger and meaningful prior/current diff.
4. Deterministic escalation and validated booking.
5. Doctor console and source-grounded brief.
6. Automated tests, observability and safe failure recovery.
7. Audio, extra languages, advanced reranking, Mem0 and optional 3D enhancements.

This order is about dependencies and value, not dates. Adjust based on demonstrated progress and update the audit with evidence.
