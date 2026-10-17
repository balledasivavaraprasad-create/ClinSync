# ClinSync Evaluations Harness

Owner: Teammate C. See `.agents/skills/testing-evals/SKILL.md` and `docs/QUALITY_GATES.md`.

## Purpose
This directory contains deterministic evaluation sets, test cases, and safety assertions for ClinSync's generative workflows and LangGraph pipelines.

## Directory Structure
- `datasets/`: Versioned synthetic patient profiles, intake dialog scripts, and sample documents.
- `cases/`: Discrete test scenario fixtures (routine intake, allergy conflict, prompt injection, emergency escalation).
- `assertions/`: Evaluation assertions checking schema compliance, source citation validity, and deterministic safety rules.
- `reports/`: Run reports and metrics summaries (redacted, synthetic data only).

## Core Evaluation Principles
1. **Zero Real Patient Data**: Only synthetic cases are permitted.
2. **Deterministic Evaluation**: Tests must run without requiring live network calls in CI by utilizing recorded mock fixtures.
3. **Safety First**: Grounding, citation accuracy, and refusal of unauthorized/high-risk actions are primary metrics.
4. **No LLM Self-Grading on Medical Urgency**: Evaluation logic uses deterministic criteria and strict schemas.
