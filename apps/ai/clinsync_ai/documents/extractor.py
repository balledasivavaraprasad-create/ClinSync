"""Clinical fact extractor for uploaded medical documents with page provenance."""

import re
import uuid
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.documents.parser import DocumentPage, ParsedDocument
from clinsync_ai.graph.state import ClinicalFactModel, FactStatus, FactType, SourceType
from clinsync_ai.providers.errors import ModelProviderError
from clinsync_ai.routing.gateway import ModelGateway


class CandidateDocumentFact(BaseModel):
    """Pydantic schema for extracted clinical fact candidates from document pages."""
    concept: str
    value: str
    fact_type: FactType = "symptom"
    unit: str | None = None
    clinical_time: str | None = None
    confidence: float = 0.95


class DocumentPageExtractionSchema(BaseModel):
    """Structured extraction output returned by model gateway."""
    facts: list[CandidateDocumentFact] = Field(default_factory=list)
    summary_of_findings: str | None = None


def _deterministic_page_extract(text: str) -> list[CandidateDocumentFact]:
    """Deterministic extraction fallback for offline execution, synthetic tests, and provider outages."""
    candidates: list[CandidateDocumentFact] = []
    text_lower = text.lower()

    # 1. Allergies
    allergy_match = re.search(r"\ballerg(?:y|ies)\s*:\s*([^.\n]+)", text, re.IGNORECASE)
    if allergy_match:
        for alg in allergy_match.group(1).split(","):
            alg_clean = alg.strip()
            if alg_clean and "none" not in alg_clean.lower() and "nkda" not in alg_clean.lower():
                candidates.append(
                    CandidateDocumentFact(
                        concept="allergy",
                        value=alg_clean,
                        fact_type="allergy",
                    )
                )

    # 2. Medications
    med_match = re.search(r"\bmedications?\s*:\s*([^.\n]+)", text, re.IGNORECASE)
    if med_match:
        for med in med_match.group(1).split(","):
            med_clean = med.strip()
            if med_clean and "none" not in med_clean.lower():
                candidates.append(
                    CandidateDocumentFact(
                        concept="medication",
                        value=med_clean,
                        fact_type="medication",
                    )
                )

    # 3. Blood Pressure / Vitals
    bp_match = re.search(r"\b(?:blood\s+pressure|bp)\s*:\s*(\d{2,3}\/\d{2,3})", text, re.IGNORECASE)
    if bp_match:
        candidates.append(
            CandidateDocumentFact(
                concept="blood_pressure",
                value=bp_match.group(1),
                fact_type="investigation",
                unit="mmHg",
            )
        )

    # 4. Lab / Investigation results
    hba1c_match = re.search(r"\b(?:hba1c|a1c)\s*:\s*(\d+(?:\.\d+)?)\s*(%?)", text, re.IGNORECASE)
    if hba1c_match:
        candidates.append(
            CandidateDocumentFact(
                concept="hba1c",
                value=hba1c_match.group(1),
                fact_type="investigation",
                unit="%" if hba1c_match.group(2) else None,
            )
        )

    # 5. Diagnoses / Conditions
    cond_match = re.search(r"\b(?:diagnosis|diagnoses|assessment|impression)\s*:\s*([^.\n]+)", text, re.IGNORECASE)
    if cond_match:
        for cond in cond_match.group(1).split(","):
            cond_clean = cond.strip()
            if cond_clean and len(cond_clean) > 2:
                candidates.append(
                    CandidateDocumentFact(
                        concept="condition",
                        value=cond_clean,
                        fact_type="condition",
                    )
                )

    # 6. Specific symptom keywords
    if "shortness of breath" in text_lower or "dyspnea" in text_lower:
        candidates.append(
            CandidateDocumentFact(
                concept="symptom",
                value="shortness of breath",
                fact_type="symptom",
            )
        )
    if "cough" in text_lower and not any(c.concept == "symptom" and "cough" in c.value for c in candidates):
        candidates.append(
            CandidateDocumentFact(
                concept="symptom",
                value="cough",
                fact_type="symptom",
            )
        )

    return candidates


class DocumentFactExtractor:
    """Extracts clinical facts from parsed document pages preserving precise page provenance."""

    def __init__(self, gateway: ModelGateway | None = None):
        self.gateway = gateway

    def extract_from_document(
        self,
        document: ParsedDocument,
        patient_id: str,
        encounter_id: str | None = None,
    ) -> list[ClinicalFactModel]:
        """Process all pages of a parsed document and return validated ClinicalFactModel items."""
        extracted_facts: list[ClinicalFactModel] = []

        for page in document.pages:
            page_facts = self._extract_page_facts(
                page=page,
                document_id=document.document_id,
                patient_id=patient_id,
                encounter_id=encounter_id,
            )
            extracted_facts.extend(page_facts)

        return extracted_facts

    def _extract_page_facts(
        self,
        page: DocumentPage,
        document_id: str,
        patient_id: str,
        encounter_id: str | None = None,
    ) -> list[ClinicalFactModel]:
        """Extract candidate facts from a single page with page-coordinate source location."""
        candidate_facts: list[CandidateDocumentFact] = []

        if self.gateway is not None:
            try:
                prompt = (
                    f"You are a clinical document extraction assistant. Extract all clinical facts from this document page:\n"
                    f"Page Content:\n'''{page.text}'''\n"
                    f"Extract medications, allergies, diagnoses/conditions, vital signs, investigations, and symptoms."
                )
                parsed_schema, _ = self.gateway.generate_structured(
                    prompt=prompt,
                    response_schema=DocumentPageExtractionSchema,
                    step_name="document_page_fact_extraction",
                )
                if parsed_schema.facts:
                    candidate_facts = parsed_schema.facts
            except Exception:
                candidate_facts = []

        if not candidate_facts:
            candidate_facts = _deterministic_page_extract(page.text)

        # Wrap in canonical ClinicalFactModel with page provenance and unverified status
        result_models: list[ClinicalFactModel] = []
        for cand in candidate_facts:
            fact_id = f"FACT-DOC-{uuid.uuid4().hex[:8].upper()}"
            status: FactStatus = "extracted_unverified"
            val_lower = cand.value.lower()
            if cand.confidence < 0.75 or "?" in cand.value or "~" in cand.value or "unclear" in val_lower or "[?]" in cand.value:
                status = "uncertain"

            result_models.append(
                ClinicalFactModel(
                    id=fact_id,
                    patient_id=patient_id,
                    encounter_id=encounter_id,
                    concept=cand.concept,
                    value=cand.value,
                    unit=cand.unit,
                    clinical_time=cand.clinical_time,
                    fact_type=cand.fact_type,
                    status=status,
                    source_type="UPLOADED_DOCUMENT",
                    source_id=document_id,
                    source_location=f"Page {page.page_number}",
                    extraction_method="document_provenance_extractor",
                    confidence=cand.confidence,
                )
            )

        return result_models
