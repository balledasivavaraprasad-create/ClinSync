"""Tests for offline EvalRunner and synthetic golden dataset assertions."""

from pathlib import Path
from evals.assertions.groundedness_assertion import assert_groundedness
from evals.assertions.schema_assertion import assert_schema_conformity
from evals.runner import EvalRunner, IntakeExtractionResult


def test_eval_runner_on_golden_cases():
    """Verify that EvalRunner evaluates CASE-ROUTINE-001 and passes all assertions offline."""
    runner = EvalRunner()
    report = runner.run_all()

    assert report.total_cases >= 1
    assert report.failed_cases == 0
    assert report.passed_cases == report.total_cases

    first_result = report.results[0]
    assert first_result.case_id == "CASE-ROUTINE-001"
    assert first_result.passed is True
    assert first_result.assertions_run == 3
    assert first_result.assertions_passed == 3


def test_groundedness_assertion_catches_forbidden_claims():
    bad_output = "Patient was diagnosed with acute myocardial infarction and routed to emergency room."
    res = assert_groundedness(
        generated_text=bad_output,
        forbidden_claims=["acute myocardial infarction", "emergency room"],
    )
    assert res.passed is False
    assert len(res.forbidden_hits) == 2


def test_schema_assertion_catches_invalid_payload():
    bad_payload = {"facts": []}  # Missing required suggested_specialty & triage_urgency
    res = assert_schema_conformity(bad_payload, IntakeExtractionResult)
    assert res.passed is False
    assert len(res.errors) > 0
