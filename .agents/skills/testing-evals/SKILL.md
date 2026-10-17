---
name: testing-evals
description: Use when writing unit/integration tests, synthetic golden cases, model evals, trace analysis or regression checks.
---

# Testing and AI Evals Skill

## Testing layers

- Unit tests: schemas, policy rules, field-state transitions, provenance and scheduling logic.
- Integration tests: API persistence, identity gate, document processing, booking transaction and doctor brief retrieval.
- Golden evals: synthetic input plus expected structured behavior for intake, extraction, retrieval, tool arguments, policy compliance and final task completion.
- End-to-end smoke test: one routine synthetic patient journey and one escalation/failure path.

## Golden case schema

Each case should have: stable ID, scenario, synthetic input/fixtures, expected fields/statuses, expected allowed workflow route, expected source IDs, forbidden behaviors, test version and notes. Avoid using LLM-generated expected answers as the sole ground truth.

## Metrics

Prefer deterministic assertions for schema validity, identity gates, slot invariants, source-reference validity, max steps and routing reason codes. Track extraction precision/recall against annotated synthetic examples, source attribution coverage, duplicate-question rate, retrieval hit/relevance, invalid schema rate, safe-fallback rate, latency and estimated cost where available.

## LLM-as-a-judge

Use only as an additional sampled signal, not as the sole safety gate. A judge score does not override deterministic assertions or human review for high-impact behaviors.

## Observability

Use a trace/workflow ID and step name. Log model/provider/version, prompt/version/hash where practical, validated input/output metadata, latency, token/cost when available, retries, fallback and eval status. Redact sensitive text and identifiers by default.

## Checks

A test must fail when a prohibited behavior occurs. Do not change expected output merely to make code pass unless the product owner approves the behavior change and documents why. Keep regression cases for each bug.
