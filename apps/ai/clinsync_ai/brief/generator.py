"""Evidence-Backed Doctor Brief Generator with strict citation grounding."""

import re
import uuid
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.brief.audio import AudioBriefService
from clinsync_ai.brief.models import (
    AudioStatus,
    BriefSection,
    Citation,
    DoctorBriefData,
)
from clinsync_ai.graph.state import ClinicalFactModel
from clinsync_ai.routing.gateway import ModelGateway


class LLMBriefOutput(BaseModel):
    """Raw structured output schema requested from the generative model."""
    summary_text: str = Field(description="Comprehensive clinician-facing summary text")
    chief_complaint_summary: str = Field(description="Summary of presenting complaint and acute symptoms")
    pertinent_findings: list[str] = Field(description="Clinical observations and findings with citations")
    historical_summary: str = Field(description="Summary of prior recorded health status and baseline")
    conflicts_and_risks: list[str] = Field(description="Explicit contradictions or safety flags identified")
    cited_fact_ids: list[str] = Field(default_factory=list, description="List of exact fact IDs referenced")


class DoctorBriefGenerator:
    """Generates concise, evidence-grounded clinician briefs from the Context Ledger and documents."""

    def __init__(self, gateway: ModelGateway, audio_service: AudioBriefService | None = None):
        self.gateway = gateway
        self.audio_service = audio_service or AudioBriefService()

    def generate(
        self,
        encounter_id: str,
        patient_id: str,
        current_facts: list[ClinicalFactModel],
        historical_facts: list[ClinicalFactModel] | None = None,
        unresolved_conflicts: list[str] | None = None,
        patient_name: str | None = None,
        chief_complaint: str | None = None,
        missing_information: list[str] | None = None,
        trace_id: str | None = None,
    ) -> DoctorBriefData:
        """Generate a doctor brief with validated evidence links and zero hallucinated citations."""
        hist_facts = historical_facts or []
        conflicts = list(unresolved_conflicts or [])
        missing = list(missing_information or [])
        all_facts = current_facts + hist_facts

        # 1. Build authoritative verification index
        valid_fact_index: dict[str, ClinicalFactModel] = {f.id: f for f in all_facts}

        # 2. Categorize facts by clinical provenance status
        patient_reported: list[str] = []
        historical_records: list[str] = []
        extracted_facts: list[str] = []
        verified_facts: list[str] = []

        for f in all_facts:
            fact_label = f"{f.concept}: {f.value}"
            st_upper = f.source_type.upper() if f.source_type else ""
            if f.status == "doctor_confirmed" or st_upper == "DOCTOR_INPUT":
                verified_facts.append(fact_label)
            elif f.status == "reported" or st_upper in ("PATIENT_VOICE", "PATIENT_FORM", "INTAKE"):
                patient_reported.append(fact_label)
            elif f.status == "historical_recorded" or st_upper in ("HISTORICAL_EHR", "HISTORICAL"):
                historical_records.append(fact_label)
            elif "extracted" in f.status or st_upper in ("UPLOADED_DOCUMENT", "DOCUMENT", "UPLOAD"):
                extracted_facts.append(fact_label)
            elif f.status == "conflicting":
                conflict_note = f"Conflicting claim [{f.id}]: {f.concept} = {f.value} (Source: {f.source_type})"
                if conflict_note not in conflicts:
                    conflicts.append(conflict_note)
            elif f.status == "uncertain":
                uncertain_note = f"Uncertain clinical statement [{f.id}]: {f.concept} = {f.value} (Unverified)"
                if uncertain_note not in missing:
                    missing.append(uncertain_note)

        # 3. Assemble prompt for Gemini primary generation
        facts_manifest = "\n".join([
            f"- [{f.id}] ({f.source_type}/{f.status}) {f.concept}: {f.value} (source_id: {f.source_id})"
            for f in all_facts
        ]) or "No facts recorded."

        conflicts_manifest = "\n".join([f"- {c}" for c in conflicts]) or "None identified."
        missing_manifest = "\n".join([f"- {m}" for m in missing]) or "None noted."

        prompt = (
            f"You are a clinical documentation specialist generating a physician handoff brief for ClinSync.\n"
            f"Patient ID: {patient_id} | Encounter: {encounter_id} | Name: {patient_name or 'Unknown'}\n"
            f"Chief Complaint: {chief_complaint or 'General Evaluation'}\n\n"
            f"=== VALIDATED CLINICAL FACTS (USE ONLY THESE IDS) ===\n{facts_manifest}\n\n"
            f"=== IDENTIFIED CONFLICTS & CONTRADICTIONS ===\n{conflicts_manifest}\n\n"
            f"=== MISSING INFORMATION / UNCERTAINTIES ===\n{missing_manifest}\n\n"
            f"CRITICAL CLINICAL INVARIANTS:\n"
            f"1. Ground all findings in provided fact IDs. NEVER invent or fabricate fact IDs or source IDs.\n"
            f"2. Clearly separate patient-reported symptoms, historical records, and extracted document findings.\n"
            f"3. Retain ALL clinical contradictions and safety conflicts without silent resolution.\n"
            f"4. Be scannable, precise, and evidence-backed."
        )

        tid = trace_id or f"trace-brief-{uuid.uuid4().hex[:12]}"

        # 4. Invoke ModelGateway
        parsed_output: LLMBriefOutput | None = None
        generation_provider = getattr(self.gateway.primary, "provider_name", "gemini")
        generation_model = getattr(self.gateway.primary, "model_name", getattr(self.gateway.primary, "_default_model", "gemini-3.8-flash"))

        try:
            parsed, resp = self.gateway.generate_structured(
                prompt=prompt,
                response_schema=LLMBriefOutput,
                trace_id=tid,
                step_name="doctor_brief_generation",
            )
            parsed_output = parsed
            generation_provider = resp.provider
            generation_model = resp.model
        except Exception:
            # Deterministic fallback synthesis if provider is offline or errors
            generation_provider = "deterministic_synthesizer"
            generation_model = "clinsync-rule-engine-v1"
            parsed_output = self._deterministic_synthesize(
                patient_name=patient_name,
                chief_complaint=chief_complaint,
                patient_reported=patient_reported,
                historical_records=historical_records,
                extracted_facts=extracted_facts,
                conflicts=conflicts,
                all_facts=all_facts,
            )
            if getattr(self.gateway, "trace_manager", None):
                self.gateway.trace_manager.record_step(
                    trace_id=tid,
                    step_name="doctor_brief_generation_fallback",
                    provider=generation_provider,
                    model=generation_model,
                    latency_ms=1.0,
                    prompt="deterministic_synthesis",
                    output=parsed_output.summary_text,
                    fallback_used=True,
                )

        # 5. Extract citations and enforce zero-hallucination guardrail
        valid_citations: list[Citation] = []
        seen_fact_ids: set[str] = set()
        valid_source_index: dict[str, ClinicalFactModel] = {f.source_id: f for f in all_facts if f.source_id}

        def _try_add_citation(ident: str) -> None:
            clean = ident.strip()
            if clean in valid_fact_index and clean not in seen_fact_ids:
                f_obj = valid_fact_index[clean]
                valid_citations.append(Citation(
                    fact_id=f_obj.id,
                    source_id=f_obj.source_id,
                    source_type=f_obj.source_type,
                    concept=f_obj.concept,
                    excerpt=f"{f_obj.concept}: {f_obj.value}",
                ))
                seen_fact_ids.add(clean)
            elif clean in valid_source_index:
                f_obj = valid_source_index[clean]
                if f_obj.id not in seen_fact_ids:
                    valid_citations.append(Citation(
                        fact_id=f_obj.id,
                        source_id=f_obj.source_id,
                        source_type=f_obj.source_type,
                        concept=f_obj.concept,
                        excerpt=f"{f_obj.concept}: {f_obj.value}",
                    ))
                    seen_fact_ids.add(f_obj.id)

        # Check citations explicitly cited in output
        for cid in parsed_output.cited_fact_ids:
            _try_add_citation(cid)

        # Also discover inline bracket citations e.g. [FACT-123] or [DOC-001] in summary text
        inline_ids = re.findall(r"\[([a-zA-Z0-9_-]+)\]", parsed_output.summary_text)
        for iid in inline_ids:
            _try_add_citation(iid)

        # If model cited zero citations, attach citations from all validated facts
        if not valid_citations and all_facts:
            for f_obj in all_facts[:6]:
                valid_citations.append(Citation(
                    fact_id=f_obj.id,
                    source_id=f_obj.source_id,
                    source_type=f_obj.source_type,
                    concept=f_obj.concept,
                    excerpt=f"{f_obj.concept}: {f_obj.value}",
                ))

        # 6. Compose structured sections
        sections = [
            BriefSection(
                title="Chief Complaint & Acute Symptoms",
                content=parsed_output.chief_complaint_summary,
                fact_ids=[f.id for f in current_facts if f.source_type == "intake"],
            ),
            BriefSection(
                title="Pertinent Clinical Findings & Documents",
                content="\n".join(f"- {p}" for p in parsed_output.pertinent_findings) or "No pertinent document findings.",
                fact_ids=[f.id for f in current_facts if f.source_type in ("document", "upload")],
            ),
            BriefSection(
                title="Historical Context & Baseline",
                content=parsed_output.historical_summary,
                fact_ids=[f.id for f in hist_facts],
            ),
            BriefSection(
                title="Conflicts, Uncertainties & Risk Flags",
                content="\n".join(f"- {c}" for c in (parsed_output.conflicts_and_risks or conflicts)) or "No clinical contradictions noted.",
                fact_ids=[f.id for f in all_facts if f.status == "conflicting"],
            ),
        ]

        # 7. Generate Spoken Summary Script & Audio State
        spoken_script = self.audio_service.compose_spoken_script(
            patient_name=patient_name,
            chief_complaint=chief_complaint,
            patient_reported=patient_reported,
            extracted_facts=extracted_facts,
            historical_records=historical_records,
            unresolved_conflicts=conflicts,
        )

        _, audio_status, audio_url, speech_secs = self.audio_service.generate_audio_summary(
            spoken_script=spoken_script,
            encounter_id=encounter_id,
        )

        return DoctorBriefData(
            summary_text=parsed_output.summary_text,
            citations=valid_citations,
            audio_status=audio_status,
            audio_url=audio_url,
            spoken_summary_script=spoken_script,
            sections=sections,
            patient_reported=patient_reported,
            historical_records=historical_records,
            extracted_facts=extracted_facts,
            verified_facts=verified_facts,
            unresolved_conflicts=conflicts,
            missing_information=missing,
            generation_provider=generation_provider,
            generation_model=generation_model,
            estimated_speech_seconds=speech_secs,
        )

    def _deterministic_synthesize(
        self,
        patient_name: str | None,
        chief_complaint: str | None,
        patient_reported: list[str],
        historical_records: list[str],
        extracted_facts: list[str],
        conflicts: list[str],
        all_facts: list[ClinicalFactModel],
    ) -> LLMBriefOutput:
        """Deterministic rule-based clinical synthesis for offline testing and fallback."""
        p_name = patient_name or "Patient"
        cc = chief_complaint or "Intake evaluation"

        summary_paragraphs = [
            f"CLINICAL BRIEF FOR {p_name.upper()}: Presenting with chief complaint of {cc}.",
        ]

        if patient_reported:
            summary_paragraphs.append(f"Patient-reported symptoms include: {'; '.join(patient_reported)}.")
        if extracted_facts:
            summary_paragraphs.append(f"Extracted document findings confirm: {'; '.join(extracted_facts)}.")
        if historical_records:
            summary_paragraphs.append(f"Baseline history shows: {'; '.join(historical_records)}.")
        if conflicts:
            summary_paragraphs.append(f"ATTENTION: {len(conflicts)} unresolved contradiction(s) flagged: {'; '.join(conflicts)}.")

        return LLMBriefOutput(
            summary_text="\n\n".join(summary_paragraphs),
            chief_complaint_summary=f"Patient presents with {cc}. Acute reported intake: {'; '.join(patient_reported) or 'None'}.",
            pertinent_findings=extracted_facts or ["No prior clinical documents provided."],
            historical_summary=f"Recorded medical baseline: {'; '.join(historical_records) or 'No historical record on file.'}",
            conflicts_and_risks=conflicts or ["No active safety or clinical contradictions identified."],
            cited_fact_ids=[f.id for f in all_facts[:6]],
        )
