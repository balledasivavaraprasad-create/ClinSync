# ClinSync — Repository Starter Kit

ClinSync is a hospital-controlled, voice-first patient intake and clinician handoff prototype. The intended journey is:

**consent and identity confirmation → adaptive intake → source-linked document extraction → Clinical Context Ledger → Patient Context Diff → safety-gated routing → validated appointment → evidence-backed doctor brief → reviewed save**

This repository is an engineering scaffold, not a clinically validated medical device. Use synthetic patient data, documents and identities only.

## Initial setup

1. Copy/extract the starter kit into the GitHub repository root, preserving hidden folders.
2. Commit the scaffold before implementation.
3. Add the three contributors and assign the roles in `docs/TEAM_OWNERSHIP.md`.
4. Read `AGENTS.md`, `.agents/README.md`, `docs/TEAM_OWNERSHIP.md` and `AUDIT.md`.
5. Review and agree on `docs/UI_UX_DIRECTION.md`, `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md`.
6. Create focused issues from `docs/IMPLEMENTATION_ROADMAP.md` and assign one owner per issue.
7. Each person works on a separate branch and working directory. Do not run concurrent Antigravity sessions on the same working tree.

## Repository map

```text
AGENTS.md                         # global contributor and AI-agent rules
AUDIT.md                          # central integrated status; single writer
.agents/skills/*/SKILL.md         # focused skill instructions
.agents/audit/                    # one handoff record per issue/PR
apps/web/                         # React + TypeScript patient kiosk and doctor console
apps/api/                         # FastAPI, SQLAlchemy, persistence and scheduling
apps/ai/                          # LangGraph, extraction, retrieval and brief workflow
evals/                            # synthetic golden cases and evaluation scripts
packages/contracts/               # shared/versioned interface contracts
docs/                             # product, UX, architecture, API, ownership and roadmap
.github/workflows/ci.yml          # repository CI; app jobs activate when manifests exist
```

## Model providers (Gemini primary; Groq optional)

- **Gemini** is the primary generative model for conversational intake, structured extraction and doctor-brief synthesis. Configure `GEMINI_API_KEY` and `GEMINI_MODEL`.
- **Groq is optional** as a fallback for explicitly approved text-only generation tasks after eligible transient Gemini failures. It uses `GROQ_API_KEY` and `GROQ_MODEL` and is disabled by default.
- Bounded decisions should use deterministic state machines, allowlists and backend policy logic wherever practical. Gemini may suggest a candidate, but the backend validates it and remains authoritative for identity, access, clinical escalation and appointment transactions.
- No OpenAI key or separate paid decision-model API is required for this baseline. Do not add another provider without documenting its value, cost, data flow, evaluations and fallback behavior.

Configuration is documented in `.env.example` and `docs/MODEL_PROVIDER_STRATEGY.md`. Never place real keys in Git, browser code, prompts, screenshots or traces. Use synthetic patients and documents only.

## Source of truth

- Product scope: `docs/PRODUCT_BRIEF.md`
- Visual experience: `docs/UI_UX_DIRECTION.md`
- Architecture and trust boundaries: `docs/ARCHITECTURE.md`
- Cross-workstream decisions: `docs/ARCHITECTURE_DECISIONS.md`
- ChatGPT/Antigravity collaboration loop: `docs/COLLABORATION_PROTOCOL.md`
- Backend engineering: `docs/BACKEND_ENGINEERING_STANDARDS.md`
- Request/response contracts: `docs/API_CONTRACTS.md`
- Ownership and file boundaries: `docs/TEAM_OWNERSHIP.md`
- Outcome-driven build order: `docs/IMPLEMENTATION_ROADMAP.md`
- Demo flow: `docs/DEMO_SCRIPT.md`
- Acceptance tests: `docs/QUALITY_GATES.md`
- Current integrated status: `AUDIT.md`
- Coding instructions: `AGENTS.md` plus relevant `.agents/skills/*/SKILL.md`

If two documents conflict, stop and ask the Integration Captain to resolve the conflict and record the decision before coding around it.

## Prototype safety boundaries

- Use synthetic patients, documents, identities and appointments only.
- Face matching is only candidate lookup; confirm identity before revealing a record.
- An LLM must not diagnose, prescribe, assign unreviewed clinical urgency, execute SQL or directly commit an appointment.
- A deterministic demo ruleset controls escalation; configured urgent scenarios must not flow into routine scheduling.
- Every extracted fact used in a brief preserves source and extraction status. Never silently reconcile conflicts.
- The doctor owns clinical decisions and approval of persistent clinical information.

## Before every PR

Read the relevant skill. Keep the PR small. Run the checks for your area. Update your own `.agents/audit/<ISSUE-ID>.md`, not `AUDIT.md`. Include screenshots/API examples/tests as evidence. The Integration Captain updates the central audit after merging and smoke testing.
