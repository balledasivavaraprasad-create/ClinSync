"""Tests for LlamaIndex-backed clinical document indexing, retrieval, and citation verification."""

import pytest
from clinsync_ai.documents.parser import DocumentParser, ParsedDocument
from clinsync_ai.documents.extractor import DocumentFactExtractor
from clinsync_ai.retrieval.indexer import ClinicalDocumentIndex
from clinsync_ai.retrieval.citation_linker import CitationLinker


@pytest.fixture
def sample_parsed_document() -> ParsedDocument:
    parser = DocumentParser()
    content = (
        "--- Page 1 ---\n"
        "Patient: John Doe, DOB: 1980-05-12\n"
        "Diagnosis: Essential Hypertension, Hyperlipidemia\n"
        "Blood Pressure: 142/90 mmHg\n"
        "\f--- Page 2 ---\n"
        "Current Medications: Lisinopril 20mg daily, Atorvastatin 40mg bedtime\n"
        "Allergies: Penicillin (hives)\n"
        "HbA1c: 6.8%\n"
    )
    return parser.parse(
        document_id="DOC-CARDIO-101",
        filename="cardiology_consult.pdf",
        mime_type="application/pdf",
        content=content,
    )


def test_document_index_patient_isolation(sample_parsed_document):
    """Assert that clinical document indexing strictly isolates data between patients."""
    index = ClinicalDocumentIndex()

    # Index doc for Patient A
    index.index_parsed_document(
        document=sample_parsed_document,
        patient_id="PAT-ALPHA",
        encounter_id="ENC-001",
    )

    # Index doc for Patient B
    parser = DocumentParser()
    doc_b = parser.parse(
        document_id="DOC-DERM-202",
        filename="dermatology_note.pdf",
        mime_type="application/pdf",
        content="Diagnosis: Severe Psoriasis on extensor surfaces.",
    )
    index.index_parsed_document(
        document=doc_b,
        patient_id="PAT-BETA",
        encounter_id="ENC-002",
    )

    # Search for "Hypertension" for Patient A -> Should find DOC-CARDIO-101
    results_a = index.search(query="Hypertension", patient_id="PAT-ALPHA")
    assert len(results_a) > 0
    assert results_a[0].document_id == "DOC-CARDIO-101"
    assert results_a[0].patient_id == "PAT-ALPHA"
    assert results_a[0].page_number == 1
    assert "Page 1" in results_a[0].page_label

    # Search for "Hypertension" for Patient B -> Must be strictly empty (zero cross-leakage)
    results_b = index.search(query="Hypertension", patient_id="PAT-BETA")
    assert len(results_b) == 0

    # Search without patient_id must fail fast
    with pytest.raises(ValueError, match="patient_id is required"):
        index.search(query="Hypertension", patient_id="")


def test_document_index_relevance_and_page_provenance(sample_parsed_document):
    """Assert search returns accurate page coordinates and context snippets."""
    index = ClinicalDocumentIndex()
    index.index_parsed_document(
        document=sample_parsed_document,
        patient_id="PAT-ALPHA",
        encounter_id="ENC-001",
    )

    # Query term on Page 2 ("Atorvastatin")
    results = index.search(query="Atorvastatin", patient_id="PAT-ALPHA")
    assert len(results) >= 1
    hit = results[0]
    assert hit.page_number == 2
    assert hit.page_label == "Page 2"
    assert "Atorvastatin" in hit.snippet
    assert hit.score > 0.0


def test_empty_retrieval_handling(sample_parsed_document):
    """Assert empty queries, unindexed terms, or unindexed patients return clean empty lists."""
    index = ClinicalDocumentIndex()
    index.index_parsed_document(
        document=sample_parsed_document,
        patient_id="PAT-ALPHA",
    )

    # 1. Unindexed clinical terms
    res_none = index.search(query="astrophysics celestial mechanics", patient_id="PAT-ALPHA")
    assert res_none == []

    # 2. Empty query string
    res_empty = index.search(query="   ", patient_id="PAT-ALPHA")
    assert res_empty == []

    # 3. Unindexed patient ID
    res_unregistered = index.search(query="Hypertension", patient_id="PAT-UNKNOWN-999")
    assert res_unregistered == []


def test_citation_linker_grounds_real_claims(sample_parsed_document):
    """Assert CitationLinker grounds valid claims to specific document page coordinates."""
    index = ClinicalDocumentIndex()
    index.index_parsed_document(
        document=sample_parsed_document,
        patient_id="PAT-ALPHA",
    )

    linker = CitationLinker(index=index)

    link = linker.link_claim(
        claim="Lisinopril 20mg",
        patient_id="PAT-ALPHA",
    )
    assert link is not None
    assert link.is_grounded is True
    assert link.source_id == "DOC-CARDIO-101"
    assert link.source_location == "Page 2"
    assert "Lisinopril" in link.snippet


def test_citation_linker_catches_fabricated_citations(sample_parsed_document):
    """Assert CitationLinker flags citations referencing non-existent document IDs as fabricated."""
    index = ClinicalDocumentIndex()
    index.index_parsed_document(
        document=sample_parsed_document,
        patient_id="PAT-ALPHA",
    )

    linker = CitationLinker(index=index)

    claims_to_check = [
        {"claim": "Blood Pressure: 142/90", "source_id": "DOC-CARDIO-101"},
        {"claim": "Underwent emergency appendectomy", "source_id": "DOC-FABRICATED-999"},
    ]

    report = linker.verify_citations(
        claims=claims_to_check,
        patient_id="PAT-ALPHA",
    )

    assert report.total_claims == 2
    assert len(report.grounded_citations) == 1
    assert report.grounded_citations[0].source_id == "DOC-CARDIO-101"
    assert "DOC-FABRICATED-999" in report.fabricated_citation_ids
    assert report.all_grounded is False


def test_document_extractor_marks_ocr_uncertainty():
    """Assert extracted facts with low confidence or uncertainty markers receive status='uncertain'."""
    parser = DocumentParser()
    content = (
        "--- Page 1 ---\n"
        "Blood Pressure: 120/80\n"
        "Medications: Aspirin 81mg [?]\n"
        "Diagnosis: Unclear presentation\n"
    )
    doc = parser.parse(
        document_id="DOC-UNCERTAIN-001",
        filename="scanned_clinic_note.pdf",
        mime_type="application/pdf",
        content=content,
    )

    extractor = DocumentFactExtractor()
    facts = extractor.extract_from_document(
        document=doc,
        patient_id="PAT-001",
        encounter_id="ENC-001",
    )

    bp_fact = next((f for f in facts if f.concept == "blood_pressure"), None)
    assert bp_fact is not None
    assert bp_fact.status == "extracted_unverified"

    med_fact = next((f for f in facts if f.concept == "medication"), None)
    assert med_fact is not None
    # Contains [?] marker, so status must be marked uncertain
    assert med_fact.status == "uncertain"


def test_blank_document_handling():
    """Assert empty or blank documents produce zero facts without throwing an exception."""
    parser = DocumentParser()
    blank_doc = parser.parse(
        document_id="DOC-BLANK-001",
        filename="blank_scan.pdf",
        mime_type="application/pdf",
        content="   \n\n\f  ",
    )
    assert blank_doc.total_pages == 1
    assert "Empty Document Content" in blank_doc.pages[0].text

    extractor = DocumentFactExtractor()
    facts = extractor.extract_from_document(
        document=blank_doc,
        patient_id="PAT-BLANK",
    )
    assert len(facts) == 0
