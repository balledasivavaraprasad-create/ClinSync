# ClinSync AI Workflow and Provider Adapters

Owner: **Teammate C**.
Relevant Skills:
- `.agents/skills/agentic-workflow/SKILL.md`
- `.agents/skills/clinical-context-ledger/SKILL.md`
- `.agents/skills/document-ingestion-rag/SKILL.md`
- `.agents/skills/testing-evals/SKILL.md`

Documentation:
- `docs/MODEL_PROVIDER_STRATEGY.md`
- `docs/ARCHITECTURE.md`
- `docs/QUALITY_GATES.md`
- `packages/contracts/openapi.json`

## Overview
Engineered AI orchestration layer utilizing LangGraph for bounded workflow state transitions, Gemini as primary generation provider, Groq as optional fallback, and LlamaIndex for document indexing and retrieval.

## Architecture & Directory Layout
```text
apps/ai/
├── clinsync_ai/
│   ├── providers/              # Model provider client adapters
│   │   ├── base.py             # Abstract base provider interface & completion types
│   │   ├── gemini.py           # Gemini 3.8 / 2.5 adapter (multimodal, extraction, brief)
│   │   └── groq.py             # Optional text-only fallback provider (disabled by default)
│   ├── routing/                # Provider selection, fallback switcher, circuit breaker
│   ├── graph/                  # LangGraph core definitions
│   │   ├── state.py            # Typed state schema (collected fields, turns, citations)
│   │   ├── nodes/              # Specialized workflow nodes (greet, interview, extract, brief)
│   │   └── workflows/          # Compiled state graph workflows
│   ├── intake/                 # Adaptive follow-up question logic & intent extraction
│   ├── documents/              # Document parser, OCR integration, text extractors
│   ├── retrieval/              # LlamaIndex retrieval adapters & source citation linkers
│   ├── clinical_context/       # Clinical Context Ledger & Patient Context Diff engines
│   ├── memory/                 # Scoped conversational memory (non-authoritative)
│   ├── guardrails/             # Prompt injection filters, hallucination checkers, safety gates
│   ├── evaluators/             # Assertion evaluators (groundedness, schema, latency)
│   ├── prompts/                # Versioned prompt templates with strict system directives
│   └── observability/          # Structured telemetry, trace emitter, latency metrics
└── tests/                      # Unit tests for adapters, nodes, graph states, and mock workflows
```

## Key Engineering Rules
1. **Gemini Primary**: Gemini is the primary generative model. All structured outputs must validate against Pydantic models.
2. **Deterministic Bounded Graphs**: Workflows must have maximum steps, explicit timeout limits, and safe termination states.
3. **No Direct OpenAI Dependencies**: Baseline uses Gemini and optional Groq. No OpenAI SDK or keys.
4. **Untrusted LLM Output**: LLM outputs are candidates. Application code validates medical facts, and doctor confirms them.
5. **Citations Are Mandatory**: Doctor brief claims must map to known fact IDs in the Clinical Context Ledger.
