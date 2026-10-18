# TASK ID: TASK-P3-401
- **Owner**: person-3
- **Branch**: feat/p3-routing-guardrails
- **Status**: VERIFIED

## Summary of Changes
- Implemented Allowlisted Hospital Department Catalog & Normalization (`apps/ai/clinsync_ai/routing/specialty_catalog.py`):
  - Strictly defines authorized hospital departments (`dept_cardiology`, `dept_internal_med`, `dept_neurology`, `dept_orthopedics`, `dept_pulmonology`, `dept_ent`, `dept_dermatology`, `dept_general_practice`).
  - Implements word-boundary alias mapping and rejection helper `is_valid_department_id`.
  - Guarantees AI candidate specialties cannot route to arbitrary or unauthorized hospital departments.
- Implemented Constrained Specialty Recommender (`apps/ai/clinsync_ai/routing/recommender.py`):
  - Integrates structured candidate extraction schema (`SpecialtyCandidateSchema`) using `ModelGateway`.
  - Features deterministic clinical concept keyword matching fallback for offline execution and provider outage resilience.
  - Detects clinical ambiguity across diffuse multi-system presentations (matching 3+ departments without single dominant specialty) and marks `is_ambiguous=True`.
- Implemented Inviolable Triage Policy Guard (`apps/ai/clinsync_ai/guardrails/triage_guard.py`):
  - Enforces Rule 10 ("Safety before scheduling: The model can extract/report facts but cannot independently decide medical urgency"):
    - Deterministic acute red flags (cardiovascular ACS, respiratory distress/hypoxia, FAST acute stroke, loss of consciousness, anaphylaxis, massive hemoptysis, acute psychiatric crisis).
    - Inviolable invariant: If an acute red flag is present, output is unconditionally forced to `URGENT_ESCALATION` (`override_applied=True`), rejecting any model-proposed routine scheduling.
  - Integrates `PromptGuard` defense: detects prompt injection / instruction override attacks attempting to bypass triage policies, safely routing them to `HUMAN_REVIEW` with `ADVERSARIAL_INJECTION_DETECTED`.
  - Surfaces unresolved clinical ledger conflicts (e.g. penicillin allergy vs candidate amoxicillin) and forces `HUMAN_REVIEW` with `UNRESOLVED_CLINICAL_CONFLICTS`.
  - Rejects unauthorized department suggestions and routes to `HUMAN_REVIEW` with `UNAUTHORIZED_DEPARTMENT_REJECTED`.
  - Rejects empty or out-of-scope non-clinical input with `UNABLE_TO_DETERMINE` and `OUT_OF_SCOPE_INPUT`.
- Implemented Routing Review Service (`apps/ai/clinsync_ai/routing/service.py`):
  - Provides `RoutingReviewService.review_encounter` returning `DecisionResultResponse` strictly conforming to the OpenAPI 3.1.0 contract (`decision`, `reason_codes`, `recommended_department_id`, `policy_version`, `evaluated_at`, `request_id`).
- Synthetic Golden Evals & Test Suite:
  - Added golden cases `case_010_specialty_recommendation_and_triage_guardrail.json` and `case_011_adversarial_triage_override.json`.
  - Updated `evals/runner.py` with Branches 6 & 7 (11/11 golden benchmark cases passed, 100%).
  - Added comprehensive unit and guardrail tests in `apps/ai/tests/test_routing_and_triage_guard.py` (12/12 passed).

## Files Created / Modified / Deleted
- Created:
  - `apps/ai/clinsync_ai/routing/specialty_catalog.py`
  - `apps/ai/clinsync_ai/routing/recommender.py`
  - `apps/ai/clinsync_ai/routing/service.py`
  - `apps/ai/clinsync_ai/guardrails/triage_guard.py`
  - `apps/ai/tests/test_routing_and_triage_guard.py`
  - `evals/cases/case_010_specialty_recommendation_and_triage_guardrail.json`
  - `evals/cases/case_011_adversarial_triage_override.json`
  - `.agents/audit/tasks/TASK-P3-401.md`
- Modified (Person 3 permitted paths only):
  - `apps/ai/clinsync_ai/guardrails/__init__.py`
  - `apps/ai/clinsync_ai/routing/__init__.py`
  - `apps/ai/tests/test_eval_runner.py`
  - `evals/runner.py`
  - `evals/reports/golden_benchmark_report.json`
- Deleted: None

## Contracts & Dependencies
- Contracts Respected: `/api/v1/encounters/{id}/routing-review` -> `DecisionResultResponse` in `packages/contracts/openapi.json`.
- Dependencies Satisfied: `TASK-P3-301`, `TASK-P3-201`, `TASK-P3-101`
- Unblocks / Informs: `TASK-P2-401` (Backend deterministic safety policy engine & atomic slot booking transaction) and `TASK-P1-401` (Appointment slot selection and escalation UI)

## Verification & Test Results
- Commands Run:
  - `pytest apps/ai/tests`: 63 passed, 2 skipped in 0.68s (100% pass rate)
  - `pytest apps/ai/tests/test_routing_and_triage_guard.py -v`: 12 passed in 0.01s
  - `python3 evals/runner.py`: 11/11 golden benchmark cases passed (100.0% pass rate)
  - `pytest apps/api/tests`: 59 passed in 0.52s
  - `npm --prefix apps/web test`: 50 passed in 1.95s
  - `npm --prefix apps/web run build`: built successfully in 745ms
  - `npm run contracts:validate`: Contracts OK (15 endpoints, 25 schemas)
  - `git diff --check`: 0 errors / clean whitespace

## Security & Safety Checks
- Model output cannot override deterministic acute emergency escalation thresholds: YES
- Red flag keywords and clinical patterns unconditionally force URGENT_ESCALATION: YES
- Candidate departments strictly constrained to allowlisted hospital catalog: YES
- Adversarial prompt injection attacks blocked and routed to human review: YES
- Unresolved clinical conflicts in Context Ledger force human clinician review: YES
- Synthetic patient and scenario data only: YES
- Zero secrets committed: YES

## Next Dependency-Ready Task
- `TASK-P3-501` (Doctor Brief Generation constrained to validated Context Ledger facts and citations)
