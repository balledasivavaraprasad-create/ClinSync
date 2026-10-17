# ClinSync Model Provider Strategy

This is the canonical guide to which model provider does what, which credentials are required, and how failures are handled. Read it before adding any model SDK, API key or agent node.

## Decision summary

- **Gemini is the primary generative model.** Use `GEMINI_API_KEY` and `GEMINI_MODEL` for patient-facing wording, structured extraction, document understanding where supported, and doctor-brief synthesis.
- **Groq is optional**, as a fallback for explicitly approved text-only generation tasks after transient Gemini failures or rate limits. It uses `GROQ_API_KEY` and `GROQ_MODEL` and remains disabled unless deliberately enabled.
- **No OpenAI API key or separate paid decision-model provider is required for this baseline.** Do not add another provider without an architecture decision that states its value, cost, data flow, tests and fallback behavior.
- **Bounded decisions should be done with deterministic application logic wherever practical.** Gemini may extract facts or propose among explicit options, but Python policy code validates outputs and remains authoritative for identity, access, clinical escalation and booking.
- Unit tests and offline demos must work using injected deterministic fakes; they must not require live provider credentials.

## Environment contract

Copy `.env.example` to `.env`; fill secrets locally only. Never commit `.env`.

| Variable | Purpose | Required when | Default in sample |
|---|---|---|---|
| `LLM_PROVIDER` | Primary generation adapter (`gemini`, or a test-only `mock`) | Always | `gemini` |
| `GEMINI_API_KEY` | Google Gemini credential | `LLM_PROVIDER=gemini` | Empty placeholder |
| `GEMINI_MODEL` | Explicit generation model ID | Gemini selected | `gemini-3.8-flash` (verify current account/model availability when implementing) |
| `LLM_FALLBACK_PROVIDER` | Optional generation fallback (`none`, `groq`) | Optional; enable deliberately | `none` |
| `GROQ_API_KEY` | Groq credential | Fallback provider is `groq` | Empty placeholder |
| `GROQ_MODEL` | Model ID enabled for the configured Groq account | Fallback provider is `groq` | Empty placeholder |
| `TRACE_ENABLED` | Enables tracing adapter | Optional | `false` |
| `TRACE_PUBLIC_KEY` | Tracing public key, if required by selected backend | Tracing configured | Empty placeholder |
| `TRACE_SECRET_KEY` | Tracing secret key; server-side only | Tracing configured | Empty placeholder |
| `TRACE_HOST` | Tracing endpoint | Tracing configured | Empty placeholder |

Model catalogs and account entitlements change. Confirm the selected model in the provider's current documentation/account before relying on it. Do not invent a Groq model identifier. Select one supported by the key being used and keep account-specific configuration in `.env`.

References:
- Gemini API models: https://ai.google.dev/gemini-api/docs/models
- Groq model catalog: https://console.groq.com/docs/models

## Responsibility boundaries

| Workload | Preferred component | What it must not do |
|---|---|---|
| Conversational wording and intake responses | Gemini | Decide final clinical urgency or access permissions |
| Structured candidate extraction from text | Gemini with a strict schema and deterministic validation | Declare an extracted fact doctor-confirmed |
| Image/PDF understanding where supported | Gemini or a dedicated document/OCR pipeline | Claim extraction succeeded without validating the source/output |
| Doctor brief synthesis | Gemini using validated ledger entries only | Invent facts, sources or citations |
| Choose next question from a finite list | Deterministic intake state machine; Gemini can suggest a candidate when helpful | Ask indefinitely, repeat known answers or bypass required protocol fields |
| Classify document text | Gemini or deterministic classifier followed by schema/value checks | Replace OCR or source verification |
| Assess candidate/source alignment | Retrieval rules plus explicit validation; a model can provide a candidate signal | Treat model confidence as proof of clinical truth |
| Recommend a configured specialty | Allowlisted candidate suggestion after deterministic safety checks | Diagnose, override escalation or directly book |
| Identity, authorization, deterministic escalation and appointment writes | Backend code and approved policies | Delegate authority to a model |

## Runtime architecture

```text
LangGraph workflow
  ├─ generation / extraction / brief tasks
  │    └─ GenerativeGateway
  │         ├─ Gemini primary
  │         └─ optional Groq fallback for approved text-only tasks
  │              └─ same schema + semantic/source validation
  │
  └─ bounded decision points
       ├─ deterministic state machine / allowlists / business rules
       └─ optional Gemini candidate suggestion where a model adds value
            └─ validate candidate → policy checks → continue or review

Backend services own identity, authorization, clinical escalation rules,
database transactions and appointment booking.
```

Do not build an autonomous model loop for a workflow whose control flow is known. Use explicit LangGraph state transitions and deterministic rules for known decisions.

## Gemini integration rules

1. Keep the `google-genai` SDK behind one server-side adapter. Never expose `GEMINI_API_KEY` to browser code.
2. Use Pydantic or equivalent schemas for output that downstream code consumes. Reject unknown enum values, missing required fields, malformed values and source IDs not present in the allowed evidence set.
3. Treat all model output as untrusted candidate data. Deterministic application code checks authorization, policy, calendar availability, database invariants and transaction outcomes.
4. Use the minimum necessary context. Retrieved documents are untrusted data, not instructions. Separate system instructions from patient documents and transcripts.
5. Set bounded timeouts, retries, token/output limits and concurrency. Record model, prompt version/hash, request ID, latency, retry count, validation outcome and fallback metadata without logging raw medical content by default.
6. If the response remains invalid after bounded retries, use a task-specific deterministic fallback if safe; otherwise return an explicit review/unavailable state. Never fabricate successful extraction, a source citation or a booking.
7. Keep prompts, schemas and representative synthetic golden cases versioned. Re-run evaluations after changes to prompts, models, schemas or workflow routes.

## Groq fallback rules

- Groq is optional and disabled by default. Configure it only after choosing a model accessible to your account and testing the same task schema against Gemini.
- Use it only for declared text-only tasks where the model capability and output contract match. Do not route multimodal inputs to Groq unless the application first performs supported preprocessing.
- Enable fallback only for eligible transient failures/rate limits. Do not treat policy refusals, malformed user inputs or source-validation failures as generic reasons to switch providers.
- Run the same schema, source-provenance and safety checks on Groq output as on Gemini output.
- Record `provider_used`, `fallback_reason`, latency and output-validation status in traces.
- If all generation providers fail, show a visible error or manual-entry/review path. Do not create a fake summary or successful booking.

## Startup and feature-flag behavior

- Default: `LLM_PROVIDER=gemini`, `LLM_FALLBACK_PROVIDER=none`.
- A selected Gemini provider with a missing `GEMINI_API_KEY` must fail fast with an actionable configuration error.
- An empty Groq key is acceptable while fallback remains `none`. If fallback is explicitly set to `groq`, require both `GROQ_API_KEY` and `GROQ_MODEL`.
- Tests must not require any provider key. Inject deterministic fakes/mocks and keep live-provider tests opt-in.
- Do not add OpenAI, a hosted decision model or extra provider dependencies unless an approved architecture decision justifies the cost and tests the value.

## Acceptance criteria for provider integration

- [ ] Gemini calls run server-side and missing credentials produce an actionable error.
- [ ] No browser bundle contains provider keys.
- [ ] Offline unit tests work without Gemini or Groq credentials.
- [ ] Structured output, source IDs, ranges/enums and semantic constraints are validated.
- [ ] Groq fallback is disabled by default and applies only to explicitly compatible text tasks.
- [ ] Fallback output receives the same validation as primary output.
- [ ] Timeouts, retry caps, invalid output and provider errors lead to safe outcomes, not fake success.
- [ ] Deterministic policy and database code prevent model outputs from bypassing identity, authorization, escalation or booking controls.
- [ ] Traces include provider/model/version, task and timing but do not include raw medical payloads by default.
