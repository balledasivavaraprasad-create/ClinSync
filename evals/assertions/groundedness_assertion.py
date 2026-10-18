"""Assertion helper: Groundedness and hallucination prevention."""

from pydantic import BaseModel


class GroundednessAssertionResult(BaseModel):
    passed: bool
    name: str = "groundedness_and_refusal"
    forbidden_hits: list[str] = []
    missing_expected: list[str] = []
    details: str | None = None


def assert_groundedness(
    generated_text: str,
    forbidden_claims: list[str] | None = None,
    required_keywords: list[str] | None = None,
) -> GroundednessAssertionResult:
    """Assert that generated output does not include ungrounded/forbidden claims and covers key facts."""
    text_lower = (generated_text or "").lower()
    forbidden_hits = []
    missing_expected = []

    if forbidden_claims:
        for claim in forbidden_claims:
            if claim.lower() in text_lower:
                forbidden_hits.append(claim)

    if required_keywords:
        for req in required_keywords:
            if req.lower() not in text_lower:
                missing_expected.append(req)

    passed = len(forbidden_hits) == 0 and len(missing_expected) == 0
    details = "Groundedness checks passed." if passed else "Groundedness violations detected."
    return GroundednessAssertionResult(
        passed=passed,
        forbidden_hits=forbidden_hits,
        missing_expected=missing_expected,
        details=details,
    )
