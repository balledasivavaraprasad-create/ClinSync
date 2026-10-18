"""Constrained specialty recommender with ModelGateway adapter and deterministic fallback."""

import re
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel
from clinsync_ai.providers.errors import ModelProviderError
from clinsync_ai.routing.gateway import ModelGateway
from clinsync_ai.routing.specialty_catalog import (
    ALLOWLISTED_DEPARTMENTS,
    get_department,
    is_valid_department_id,
    normalize_department_candidate,
)


class SpecialtyCandidateSchema(BaseModel):
    """Structured candidate output schema validated by ModelGateway."""
    candidate_department_id: str
    confidence: float = 0.8
    clinical_rationale: str
    matched_symptoms: list[str] = Field(default_factory=list)
    is_ambiguous: bool = False


class SpecialtyRecommendation(BaseModel):
    """Validated specialty recommendation strictly constrained to allowlisted departments."""
    department_id: str | None = None
    department_name: str | None = None
    confidence: float = 0.0
    clinical_rationale: str
    matched_symptoms: list[str] = Field(default_factory=list)
    is_ambiguous: bool = False
    source_method: str = "deterministic_rules"  # or "model_gateway"


# Deterministic mapping heuristics for common clinical concepts
KEYWORD_DEPARTMENT_MAPPINGS: list[tuple[list[str], str]] = [
    # Cardiology
    (["palpitation", "fluttering", "irregular heartbeat", "arrhythmia", "elevated blood pressure", "hypertension", "murmur", "tachycardia"], "dept_cardiology"),
    # Pulmonology
    (["cough", "wheezing", "asthma", "bronchitis", "phlegm", "sputum"], "dept_pulmonology"),
    # Neurology
    (["migraine", "chronic headache", "tremor", "tingling", "neuropathy", "carpal tunnel", "vertigo", "dizziness"], "dept_neurology"),
    # Orthopedics
    (["sprained", "ankle", "knee pain", "back pain", "shoulder pain", "joint pain", "fracture", "stiffness", "arthritis", "hip pain", "swollen joint"], "dept_orthopedics"),
    # ENT
    (["sore throat", "earache", "ear pain", "sinus", "congestion", "hoarseness", "hearing loss", "tinnitus", "runny nose", "post-nasal drip"], "dept_ent"),
    # Dermatology
    (["rash", "itching", "pruritus", "eczema", "hives", "lesion", "dry patch", "dermatitis", "mole", "acne"], "dept_dermatology"),
    # General Internal Medicine
    (["fatigue", "unexplained weight loss", "fever", "chills", "diabetes", "multisystem", "general illness", "malaise", "swollen glands"], "dept_internal_med"),
    # General Practice
    (["checkup", "annual exam", "physical", "routine check", "vaccine", "vaccination", "refill"], "dept_general_practice"),
]


class SpecialtyRecommender:
    """Proposes candidate hospital specialty mapped strictly to allowlisted departments."""

    def __init__(self, gateway: ModelGateway | None = None):
        self.gateway = gateway

    def recommend(
        self,
        chief_complaint: str = "",
        symptoms: list[str] | None = None,
        facts: list[ClinicalFactModel] | None = None,
        context_notes: str = "",
    ) -> SpecialtyRecommendation:
        """Formulate a constrained specialty recommendation using gateway or deterministic rules."""
        # 1. Assemble aggregated symptom text
        all_symptom_tokens: list[str] = []
        if chief_complaint:
            all_symptom_tokens.append(chief_complaint)
        if symptoms:
            all_symptom_tokens.extend(symptoms)
        if facts:
            for f in facts:
                if f.fact_type in ("symptom", "condition", "chief_complaint"):
                    all_symptom_tokens.append(f"{f.concept} {f.value}")

        combined_text = " ".join(all_symptom_tokens + ([context_notes] if context_notes else [])).strip()

        # Check for empty / uninformative input
        if not combined_text:
            return SpecialtyRecommendation(
                department_id=None,
                department_name=None,
                confidence=0.0,
                clinical_rationale="Insufficient symptom data provided to recommend a medical specialty.",
                is_ambiguous=True,
                source_method="deterministic_rules",
            )

        # 2. Attempt ModelGateway structured recommendation if available
        if self.gateway is not None:
            try:
                prompt = (
                    "You are a hospital intake routing assistant. Based on the patient's reported symptoms, "
                    "recommend the most appropriate hospital department from the allowlisted departments below.\n\n"
                    "ALLOWLISTED DEPARTMENTS:\n"
                    "- dept_cardiology: Cardiology & Chest Pain Center (arrhythmias, palpitations, hypertension)\n"
                    "- dept_internal_med: General Internal Medicine (complex/multisystem conditions, fatigue, diabetes)\n"
                    "- dept_neurology: Neurology & Stroke Unit (chronic headaches, migraines, tremors, numbness)\n"
                    "- dept_orthopedics: Orthopedics & Musculoskeletal (bones, joints, sprains, back/knee pain)\n"
                    "- dept_pulmonology: Pulmonology & Respiratory Care (chronic cough, asthma, bronchitis, wheezing)\n"
                    "- dept_ent: Otolaryngology / ENT (sore throat, earache, sinusitis, hoarseness)\n"
                    "- dept_dermatology: Dermatology (skin rashes, hives, eczema, itching)\n"
                    "- dept_general_practice: Primary Care / General Practice (routine checkups, general mild complaints)\n\n"
                    f"PATIENT PRESENTATION:\n{combined_text}\n\n"
                    "Respond with candidate_department_id strictly selected from the allowlist above. "
                    "If symptoms are diffuse or fit multiple departments equally, set is_ambiguous=True."
                )
                response = self.gateway.generate_structured(
                    prompt=prompt,
                    schema=SpecialtyCandidateSchema,
                    temperature=0.0,
                )
                if response and response.parsed:
                    cand: SpecialtyCandidateSchema = response.parsed
                    norm_id = normalize_department_candidate(cand.candidate_department_id)
                    dept_meta = get_department(norm_id)
                    return SpecialtyRecommendation(
                        department_id=norm_id,
                        department_name=dept_meta.name if dept_meta else None,
                        confidence=cand.confidence,
                        clinical_rationale=cand.clinical_rationale,
                        matched_symptoms=cand.matched_symptoms,
                        is_ambiguous=cand.is_ambiguous or (norm_id is None),
                        source_method="model_gateway",
                    )
            except (ModelProviderError, Exception):
                # Safe deterministic fallback on any gateway failure or network timeout
                pass

        # 3. Deterministic rule-based matching
        return self._deterministic_recommend(combined_text)

    def _deterministic_recommend(self, text: str) -> SpecialtyRecommendation:
        """Rule-based clinical concept keyword matching against allowlisted departments."""
        text_lower = text.lower()
        dept_scores: dict[str, list[str]] = {}

        for keywords, dept_id in KEYWORD_DEPARTMENT_MAPPINGS:
            for kw in keywords:
                if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                    dept_scores.setdefault(dept_id, []).append(kw)

        if not dept_scores:
            # Fallback to general practice or internal medicine if generic mild illness
            if any(term in text_lower for term in ["sick", "unwell", "feeling bad", "checkup", "doctor"]):
                gp = get_department("dept_general_practice")
                return SpecialtyRecommendation(
                    department_id="dept_general_practice",
                    department_name=gp.name if gp else "Primary Care",
                    confidence=0.6,
                    clinical_rationale="Generic mild complaints routed to Primary Care / General Practice.",
                    matched_symptoms=["general"],
                    is_ambiguous=False,
                    source_method="deterministic_rules",
                )

            return SpecialtyRecommendation(
                department_id=None,
                department_name=None,
                confidence=0.0,
                clinical_rationale="Symptoms do not clearly match any specific allowlisted hospital specialty.",
                is_ambiguous=True,
                source_method="deterministic_rules",
            )

        # Sort by match count
        sorted_depts = sorted(dept_scores.items(), key=lambda x: len(x[1]), reverse=True)
        top_dept_id, matched_kws = sorted_depts[0]

        # Check for ambiguity:
        # A) Multiple top departments with equal match counts
        # B) Or diffuse multi-system complaints spanning 3 or more departments without dominant focus
        has_equal_top = len(sorted_depts) > 1 and len(sorted_depts[0][1]) == len(sorted_depts[1][1])
        is_diffuse_multisystem = len(sorted_depts) >= 3 and len(sorted_depts[0][1]) <= 2

        if has_equal_top or is_diffuse_multisystem:
            matched_all = []
            for d in sorted_depts:
                matched_all.extend(d[1])
            return SpecialtyRecommendation(
                department_id=None,
                department_name=None,
                confidence=0.5,
                clinical_rationale=(
                    f"Ambiguous multi-system presentation matching multiple departments "
                    f"({', '.join([d[0] for d in sorted_depts[:3]])}). Requires clinical triage review."
                ),
                matched_symptoms=matched_all,
                is_ambiguous=True,
                source_method="deterministic_rules",
            )

        dept_meta = get_department(top_dept_id)
        return SpecialtyRecommendation(
            department_id=top_dept_id,
            department_name=dept_meta.name if dept_meta else top_dept_id,
            confidence=min(0.95, 0.6 + 0.1 * len(matched_kws)),
            clinical_rationale=f"Reported symptoms ({', '.join(matched_kws)}) match clinical scope of {dept_meta.name if dept_meta else top_dept_id}.",
            matched_symptoms=matched_kws,
            is_ambiguous=False,
            source_method="deterministic_rules",
        )
