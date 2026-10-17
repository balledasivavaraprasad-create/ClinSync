# ClinSync Architecture Decision Log

This is the durable place for decisions that affect multiple workstreams. Keep decisions short, dated only when actually made, and linked to the issue/PR that implements them. Proposed options are not approved decisions.

## How decisions are made

1. Any contributor may open an issue proposing a change, stating the problem, options, impact on consumers, migration plan and verification.
2. The affected workstream owners review it. The Integration Captain records the decision after the human project lead/team approves it.
3. Do not change a shared contract, stack, data model or ownership boundary until the decision is recorded and a linked implementation issue exists.
4. ChatGPT can serve as an on-demand architecture/review copilot when the project lead supplies current files, diffs and evidence. It does not monitor the Git repository in the background and its advice is not an approved decision until the team records it here.
5. Antigravity must follow this log plus `AGENTS.md` and skills; it must not infer a new architecture from a task prompt if the repository already has an approved rule.

## Active baseline decisions

### ADR-001 — Three workstreams and one integration owner

- **Status:** Proposed baseline; confirm owners during repository setup.
- **Decision:** A owns web/UI/UX, B owns API/database and is default Integration Captain, C owns AI/RAG/evals. Shared contracts, central audit and CI have one writer.
- **Why:** Reduce overlapping edits and integration ambiguity while allowing parallel implementation.
- **Revisit when:** The team explicitly reassigns a role or observed workload makes the current split impractical.

### ADR-002 — Web-first, tablet-first interface

- **Status:** Proposed baseline.
- **Decision:** Use React + TypeScript + Vite for the web prototype. Build separate patient-kiosk and doctor-console experiences using shared design tokens and reusable components.
- **Why:** The patient kiosk must be inviting and simple; the doctor workflow must be scannable and efficient.
- **Revisit when:** The repository already contains a working framework or a concrete requirement justifies another one.

### ADR-003 — Motion first; 3D only when it adds product value

- **Status:** Proposed baseline.
- **Decision:** Use CSS/SVG for simple effects and Motion for React (`motion/react`) for meaningful transitions. Do not require Three.js/React Three Fiber for core product functionality.
- **Why:** Clinical clarity, performance, reduced-motion support and predictable tablet behavior are more important than decorative complexity.
- **Revisit when:** A scoped prototype demonstrates that a small 3D scene improves the welcome/listening experience and passes fallback/performance QA.

### ADR-004 — Modular monolith for the initial backend

- **Status:** Proposed baseline.
- **Decision:** FastAPI + Pydantic + SQLAlchemy with routers, services, repositories, policies, adapters and database modules in one deployable API.
- **Why:** Clear boundaries without premature microservices or infrastructure overhead.
- **Revisit when:** Measured scaling, deployment or reliability requirements justify a split.

### ADR-005 — Structured database is authoritative

- **Status:** Proposed baseline.
- **Decision:** SQL owns patient, encounter, appointment, review and clinical fact records. LlamaIndex indexes are rebuildable derived data; Mem0 is optional conversational memory and cannot overwrite the clinical record.
- **Why:** Preserve deterministic access, source provenance, auditability and consistent updates.
- **Revisit when:** A reviewed data design demonstrates a clear need for another authoritative store.

### ADR-006 — Deterministic control for clinical escalation and booking

- **Status:** Required safety boundary.
- **Decision:** LLMs may extract structured facts and suggest a route. Application policy and authorized services decide whether routine booking is allowed, confirm identity/permissions, validate availability and commit transactions.
- **Why:** Model output is probabilistic and cannot bypass safety or data-integrity rules.
- **Revisit when:** Clinical and governance stakeholders approve a formally validated policy change; never bypass the boundary for convenience.

### ADR-007 — Gemini generation, deterministic decisions and optional Groq fallback

- **Status:** Accepted as the provider baseline; runtime integration remains unimplemented until a reviewed PR proves it.
- **Owner:** Teammate C for `apps/ai/**`; Integration Captain for shared settings/docs/CI.
- **Related issue/PR:** Create an issue before implementation; record the link here when available.
- **Problem:** Provider configuration should remain simple, affordable and testable without requiring a second paid model/API before it demonstrates value.
- **Options considered:** (A) One remote provider for generation plus deterministic decision logic; (B) Gemini plus optional Groq fallback for compatible text tasks; (C) add separate paid decision providers immediately.
- **Decision:** Use Gemini as the primary generative model (`GEMINI_API_KEY`, `GEMINI_MODEL`). Use deterministic state machines, allowlists and backend policy code for bounded decisions. Groq (`GROQ_API_KEY`, `GROQ_MODEL`) is optional and disabled by default. No direct OpenAI provider/key or separate paid decision-model API is required by the baseline.
- **Why:** Keep the starter architecture easy to run and economical while preserving strong decision controls. Additional providers can be added later if evaluations show a measurable benefit.
- **Safety consequence:** Model outputs are candidate data, not final authority. Identity, clinical escalation policy, permissions, database writes and appointment transactions remain in deterministic application services.
- **Fallback:** Gemini may fall back to Groq only for eligible text-only generation after configured transient failures. If generation remains unavailable or output invalid, use a task-specific deterministic fallback when safe or request review. Never report a fake success.
- **Configuration:** `.env.example`; details in `docs/MODEL_PROVIDER_STRATEGY.md`. Groq remains off unless explicitly configured.
- **Verification:** Unit tests for adapter selection, missing-key configuration, invalid output, timeout, fallback behavior, sensitive-data minimization and no direct OpenAI dependency.
- **Revisit when:** Evaluations demonstrate material quality/cost benefit from another provider, API/SDK behavior changes, or the team explicitly approves a different provider.

## Decision template

Copy for a new decision:

```markdown
### ADR-XXX — <short title>

- **Status:** Proposed / Accepted / Rejected / Superseded
- **Owner:** <person>
- **Related issue/PR:** <link>
- **Problem:** <what needs a decision>
- **Options considered:** <A / B / C>
- **Decision:** <what is selected>
- **Consequences:** <trade-offs and affected paths>
- **Migration/compatibility:** <contract, schema, data or UI impact>
- **Verification:** <tests, benchmarks, screenshots or review evidence>
- **Revisit when:** <objective condition>
```
