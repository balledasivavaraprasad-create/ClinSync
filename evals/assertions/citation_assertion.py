"""Assertion helper: Citation integrity and source grounding."""

import re
from pydantic import BaseModel


class CitationAssertionResult(BaseModel):
    passed: bool
    name: str = "citation_integrity"
    valid_citations_found: list[str] = []
    fabricated_citations: list[str] = []
    details: str | None = None


def assert_no_fabricated_citations(
    citations_or_text: str | list[str],
    valid_source_ids: set[str] | list[str],
) -> CitationAssertionResult:
    """Assert that all cited document or fact IDs exist in the verified source catalog."""
    valid_set = set(valid_source_ids)
    # Extract citation patterns like [DOC-001], [FACT-123], (DOC-002:p3), etc.
    if isinstance(citations_or_text, list):
        cited_ids = citations_or_text
    else:
        cited_ids = re.findall(r"\[([A-Z0-9_-]+)(?::[^\]]+)?\]", citations_or_text or "")


    fabricated = []
    valid = []
    for cid in cited_ids:
        # Check base id before colon or sub-anchor
        base_id = cid.split(":")[0]
        if base_id in valid_set:
            valid.append(base_id)
        else:
            fabricated.append(base_id)

    passed = len(fabricated) == 0
    details = (
        f"All {len(valid)} citations grounded."
        if passed
        else f"Detected {len(fabricated)} fabricated citation(s): {', '.join(fabricated)}"
    )

    return CitationAssertionResult(
        passed=passed,
        valid_citations_found=valid,
        fabricated_citations=fabricated,
        details=details,
    )
