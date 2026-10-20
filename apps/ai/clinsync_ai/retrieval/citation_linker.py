"""Citation linking engine verifying evidence provenance and detecting fabricated citations."""

from typing import Any

from pydantic import BaseModel, Field

from clinsync_ai.retrieval.indexer import ClinicalDocumentIndex, DocumentSearchResult


class CitationLink(BaseModel):
    """Grounded citation linking a clinical claim or fact to an authoritative source document chunk."""

    claim: str
    source_id: str
    source_location: str  # e.g. "Page 1"
    snippet: str
    confidence_score: float
    is_grounded: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class CitationVerificationReport(BaseModel):
    """Report detailing verified citations, ungrounded claims, and fabricated citation IDs."""

    total_claims: int
    grounded_citations: list[CitationLink] = Field(default_factory=list)
    ungrounded_claims: list[str] = Field(default_factory=list)
    fabricated_citation_ids: list[str] = Field(default_factory=list)
    all_grounded: bool = True


class CitationLinker:
    """Verifies that clinical claims map to real indexed document pages and flags hallucinations."""

    def __init__(self, index: ClinicalDocumentIndex):
        self.index = index

    def link_claim(
        self,
        claim: str,
        patient_id: str,
        expected_source_id: str | None = None,
        encounter_id: str | None = None,
    ) -> CitationLink | None:
        """Find the most authoritative page provenance for a specific clinical claim."""
        results = self.index.search(
            query=claim,
            patient_id=patient_id,
            encounter_id=encounter_id,
            top_k=3,
        )

        if not results:
            return None

        # If a specific source_id was expected, prefer matches from that document
        best_match: DocumentSearchResult | None = None
        if expected_source_id:
            for r in results:
                if r.document_id == expected_source_id:
                    best_match = r
                    break

        if best_match is None:
            best_match = results[0]

        return CitationLink(
            claim=claim,
            source_id=best_match.document_id,
            source_location=best_match.page_label,
            snippet=best_match.snippet,
            confidence_score=best_match.score,
            is_grounded=True,
            metadata=best_match.metadata,
        )

    def verify_citations(
        self,
        claims: list[dict[str, str]],
        patient_id: str,
        encounter_id: str | None = None,
    ) -> CitationVerificationReport:
        """Verify a list of claims with claimed citation IDs.

        claims format: [{"claim": "Patient has hypertension", "source_id": "DOC-001"}, ...]
        """
        known_docs = self.index.get_indexed_document_ids(patient_id=patient_id)
        grounded_links: list[CitationLink] = []
        ungrounded_claims: list[str] = []
        fabricated_ids: list[str] = []

        for item in claims:
            claim_text = item.get("claim", "")
            claimed_source = item.get("source_id", "")

            # Check if claimed source_id actually exists in patient's indexed documents
            if claimed_source and claimed_source not in known_docs:
                if claimed_source not in fabricated_ids:
                    fabricated_ids.append(claimed_source)
                ungrounded_claims.append(claim_text)
                continue

            link = self.link_claim(
                claim=claim_text,
                patient_id=patient_id,
                expected_source_id=claimed_source,
                encounter_id=encounter_id,
            )

            if link is not None:
                grounded_links.append(link)
            else:
                ungrounded_claims.append(claim_text)

        all_valid = len(ungrounded_claims) == 0 and len(fabricated_ids) == 0

        return CitationVerificationReport(
            total_claims=len(claims),
            grounded_citations=grounded_links,
            ungrounded_claims=ungrounded_claims,
            fabricated_citation_ids=fabricated_ids,
            all_grounded=all_valid,
        )
