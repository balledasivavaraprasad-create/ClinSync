"""ClinSync Evaluation Assertions.

Exports the core deterministic evaluation functions specified in evals/assertions/README.md:
1. assert_schema_validity
2. assert_groundedness
3. assert_no_fabricated_citations
4. assert_deterministic_escalation
5. assert_privacy_preserved
"""

from evals.assertions.citation_assertion import (
    CitationAssertionResult,
    assert_no_fabricated_citations,
)
from evals.assertions.groundedness_assertion import (
    GroundednessAssertionResult,
    assert_groundedness,
)
from evals.assertions.safety_assertion import (
    PrivacyAssertionResult,
    SafetyAssertionResult,
    assert_deterministic_escalation,
    assert_privacy_preserved,
)
from evals.assertions.schema_assertion import (
    SchemaAssertionResult,
    assert_schema_conformity,
    assert_schema_validity,
)

__all__ = [
    "assert_schema_validity",
    "assert_schema_conformity",
    "assert_groundedness",
    "assert_no_fabricated_citations",
    "assert_deterministic_escalation",
    "assert_privacy_preserved",
    "SchemaAssertionResult",
    "GroundednessAssertionResult",
    "CitationAssertionResult",
    "SafetyAssertionResult",
    "PrivacyAssertionResult",
]
