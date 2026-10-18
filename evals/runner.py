"""Eval runner: Loads synthetic golden cases, invokes ModelGateway, and verifies assertions."""

import json
import sys
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field

# Ensure apps/ai and repo root are accessible
repo_root = Path(__file__).resolve().parent.parent
apps_ai_path = repo_root / "apps" / "ai"
if str(apps_ai_path) not in sys.path:
    sys.path.insert(0, str(apps_ai_path))
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.routing.gateway import ModelGateway
from evals.assertions.groundedness_assertion import assert_groundedness
from evals.assertions.schema_assertion import assert_schema_conformity


class ExtractedClinicalFact(BaseModel):
    category: str
    statement: str
    verification_status: str = "patient_reported"
    is_acute_emergency: bool = False


class IntakeExtractionResult(BaseModel):
    facts: list[ExtractedClinicalFact]
    suggested_specialty: str
    triage_urgency: str  # ROUTINE_SCHEDULING | HUMAN_REVIEW | URGENT_ESCALATION
    clinical_rationale: str


class CaseEvalResult(BaseModel):
    case_id: str
    passed: bool
    assertions_run: int
    assertions_passed: int
    duration_ms: float
    details: list[dict[str, Any]] = Field(default_factory=list)


class EvaluationReport(BaseModel):
    total_cases: int
    passed_cases: int
    failed_cases: int
    results: list[CaseEvalResult] = Field(default_factory=list)


class EvalRunner:
    """Executes synthetic golden evaluation datasets against ModelGateway."""

    def __init__(self, gateway: ModelGateway | None = None, cases_dir: Path | None = None):
        self.cases_dir = cases_dir or Path(__file__).parent / "cases"
        if gateway is not None:
            self.gateway = gateway
        else:
            # Default to deterministic offline fake provider for CI and test suite
            fake_response = IntakeExtractionResult(
                facts=[
                    ExtractedClinicalFact(
                        category="symptom",
                        statement="Dry cough for 3 weeks",
                        verification_status="patient_reported",
                        is_acute_emergency=False,
                    ),
                    ExtractedClinicalFact(
                        category="symptom",
                        statement="No chest pressure or severe shortness of breath",
                        verification_status="patient_reported",
                        is_acute_emergency=False,
                    ),
                ],
                suggested_specialty="pulmonology",
                triage_urgency="ROUTINE_SCHEDULING",
                clinical_rationale="Subacute dry cough without acute red flag symptoms.",
            )
            self.gateway = ModelGateway(
                primary_provider=FakeModelProvider(canned_structured=fake_response)
            )

    def run_case_file(self, case_path: Path) -> CaseEvalResult:
        with open(case_path, "r", encoding="utf-8") as f:
            case_data = json.load(f)

        case_id = case_data.get("case_id", case_path.stem)
        prompt = (
            f"Extract clinical facts and recommend department for patient:\n"
            f"Profile: {case_data.get('patient_profile')}\n"
            f"Statement: {case_data.get('intake_statement')}"
        )

        parsed, response = self.gateway.generate_structured(
            prompt=prompt,
            response_schema=IntakeExtractionResult,
            trace_id=f"eval-{case_id.lower()}",
            step_name="eval_intake_extraction",
        )

        assertions_details = []
        passed_count = 0

        # Assertion 1: Schema conformity
        schema_res = assert_schema_conformity(parsed, IntakeExtractionResult)
        assertions_details.append({
            "assertion": schema_res.name,
            "passed": schema_res.passed,
            "details": schema_res.details,
            "errors": schema_res.errors,
        })
        if schema_res.passed:
            passed_count += 1

        # Assertion 2: Groundedness & Refusal
        grounded_res = assert_groundedness(
            generated_text=response.text,
            forbidden_claims=case_data.get("forbidden_claims", []),
            required_keywords=["cough"],
        )
        assertions_details.append({
            "assertion": grounded_res.name,
            "passed": grounded_res.passed,
            "forbidden_hits": grounded_res.forbidden_hits,
            "missing_expected": grounded_res.missing_expected,
            "details": grounded_res.details,
        })
        if grounded_res.passed:
            passed_count += 1

        # Assertion 3: Triage decision matches expected
        expected_triage = case_data.get("expected_triage_decision")
        triage_passed = parsed.triage_urgency == expected_triage
        assertions_details.append({
            "assertion": "triage_decision_accuracy",
            "passed": triage_passed,
            "observed": parsed.triage_urgency,
            "expected": expected_triage,
        })
        if triage_passed:
            passed_count += 1

        total_assertions = len(assertions_details)
        all_passed = passed_count == total_assertions

        return CaseEvalResult(
            case_id=case_id,
            passed=all_passed,
            assertions_run=total_assertions,
            assertions_passed=passed_count,
            duration_ms=response.latency_ms,
            details=assertions_details,
        )

    def run_all(self) -> EvaluationReport:
        case_files = sorted(self.cases_dir.glob("*.json"))
        results = [self.run_case_file(cf) for cf in case_files]
        passed = sum(1 for r in results if r.passed)
        return EvaluationReport(
            total_cases=len(results),
            passed_cases=passed,
            failed_cases=len(results) - passed,
            results=results,
        )


if __name__ == "__main__":
    runner = EvalRunner()
    report = runner.run_all()
    print(f"Eval Report: {report.passed_cases}/{report.total_cases} cases passed.")
