"""Specialized LangGraph workflow nodes for adaptive clinical intake."""

import re
import uuid
from typing import Any
from pydantic import BaseModel, Field

from clinsync_ai.graph.state import ClinicalFactModel, IntakeState
from clinsync_ai.guardrails.prompt_guard import PromptGuard
from clinsync_ai.routing.gateway import ModelGateway

# Deterministic acute red flags requiring immediate human escalation
ACUTE_RED_FLAGS = [
    r"\b(?:crushing|severe)\s+chest\s+pain\b",
    r"\bchest\s+pain\s+(?:radiat|spread)",
    r"\b(?:severe\s+)?chest\s+pain\b",
    r"\b(?:sudden|acute)\s+(?:numbness|paralysis|weakness)\s+on\s+one\s+side\b",
    r"\bfacial\s+droop\b",
    r"\bcan(?:'t|not)\s+breathe\b",
    r"\bsevere\s+shortness\s+of\s+breath\b",
    r"\b(?:struggling|difficulty|trouble)\s+(?:to\s+breathe|breathing)\b",
    r"\bgasping(?:\s+for\s+air)?\b",
    r"\bcoughing\s+(?:up\s+)?blood\b",
    r"\bloss\s+of\s+consciousness\b",
    r"\b(?:passed\s+out|fainted|blacked\s+out)\b",
    r"\bthroat\s+(?:is\s+)?(?:closing|swelling|tightening)\b",
    r"\bswelling\s+of\s+(?:the\s+|my\s+)?(?:lips|tongue|throat)\b",
    r"\bworst\s+headache\s+of\s+(?:my\s+)?life\b",
    r"\bthunderclap\s+headache\b",
]

COMPLETION_PHRASES = [
    r"^(?:no|none|nothing|that'?s\s+all|nope|that is all|nothing\s+else)[\s.!,]*$",
    r"\bthat'?s\s+(?:pretty\s+much\s+)?everything\b",
    r"\bthat\s+is\s+all\b",
    r"\bnothing\s+more\s+to\s+add\b",
]


class ExtractedTurnSchema(BaseModel):
    """Schema validated by ModelGateway for structured fact extraction from a patient utterance."""
    chief_complaint: str | None = None
    duration_onset: str | None = None
    severity_progression: str | None = None
    associated_symptoms: list[str] = Field(default_factory=list)
    medications_mentioned: list[str] = Field(default_factory=list)
    allergies_mentioned: list[str] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    patient_indicated_done: bool = False


class NextQuestionSchema(BaseModel):
    """Schema for single targeted next question."""
    question: str
    target_field: str
    clinical_intent: str


def _deterministic_extract(text: str, state: IntakeState) -> ExtractedTurnSchema:
    """Deterministic extractor fallback when model gateway is offline or unavailable."""
    text_lower = text.lower()
    
    # Identify chief complaint
    chief = None
    common_complaints = [
        "sore throat", "cough", "fever", "headache", "dizzy", "dizziness",
        "sprained ankle", "abdominal pain", "back pain", "knee pain",
        "fatigue", "rash", "earache", "nausea"
    ]
    for c in common_complaints:
        if c in text_lower:
            chief = c
            break
    if not chief and len(text.strip().split()) <= 6:
        chief = text.strip()

    # Identify duration/onset
    duration = None
    dur_match = re.search(r"(\d+\s+(?:days?|weeks?|months?|hours?)|yesterday(?:\s+morning)?)", text_lower)
    if dur_match:
        duration = dur_match.group(1)

    # Identify severity
    severity = None
    sev_match = re.search(r"(\d+\s*(?:out of|\/)\s*10|mild|moderate|severe)", text_lower)
    if sev_match:
        severity = sev_match.group(1)

    # Identify allergies
    allergies = []
    if "penicillin" in text_lower:
        allergies.append("penicillin")
    if "sulfa" in text_lower:
        allergies.append("sulfa")
    if "aspirin allergy" in text_lower or "allergic to aspirin" in text_lower:
        allergies.append("aspirin")

    # Identify medications
    meds = []
    if "aspirin" in text_lower and "allergic" not in text_lower:
        meds.append("aspirin")
    if "amoxicillin" in text_lower:
        meds.append("amoxicillin")
    if "ibuprofen" in text_lower:
        meds.append("ibuprofen")
    if "paracetamol" in text_lower or "acetaminophen" in text_lower:
        meds.append("acetaminophen")

    return ExtractedTurnSchema(
        chief_complaint=chief,
        duration_onset=duration,
        severity_progression=severity,
        allergies_mentioned=allergies,
        medications_mentioned=meds,
    )


def safety_triage_node(state: IntakeState) -> dict[str, Any]:
    """Node 1: Deterministic safety gate for acute medical emergencies and adversarial inputs."""
    raw_input = state.last_patient_input or ""
    input_text = raw_input.lower()

    # 1. Deterministic acute red flags check
    for pattern in ACUTE_RED_FLAGS:
        if re.search(pattern, input_text):
            modality_src = "PATIENT_FORM" if getattr(state, "input_modality", "VOICE") == "TOUCH_TEXT" else "PATIENT_VOICE"
            emergency_fact = ClinicalFactModel(
                id=f"FACT-EMERG-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="emergency_symptom",
                value=raw_input or "acute emergency detected",
                fact_type="symptom",
                status="reported",
                source_type=modality_src,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="deterministic_safety_policy",
            )
            return {
                "emergency_detected": True,
                "status": "ESCALATE_EMERGENCY",
                "emergency_rationale": f"Acute red flag detected matching safety policy pattern: '{pattern}'",
                "next_question": "ESCALATION REQUIRED: A clinical staff member has been notified immediately due to your reported symptoms. Please remain seated while assistance arrives.",
                "extracted_facts": state.extracted_facts + [emergency_fact],
                "notes": state.notes + ["Emergency escalation triggered by safety policy."],
            }

    # 2. Adversarial prompt injection defense
    prompt_guard = PromptGuard()
    safety = prompt_guard.evaluate(raw_input)
    if not safety.is_safe:
        return {
            "emergency_detected": False,
            "status": state.status,
            "emergency_rationale": None,
            "next_question": "Please describe your physical health symptoms or reason for your doctor visit.",
            "notes": state.notes + [f"Adversarial prompt injection pattern blocked: {safety.reason}"],
        }

    return {
        "emergency_detected": False,
        "status": state.status,
        "emergency_rationale": None,
    }


def extract_facts_node(state: IntakeState, gateway: ModelGateway | None = None) -> dict[str, Any]:
    """Node 2: Structured extraction of clinical facts with schema validation, provenance, and conflict detection."""
    input_text = state.last_patient_input or ""
    if not input_text.strip():
        return {
            "extracted_facts": state.extracted_facts,
            "known_fields": state.known_fields,
            "missing_fields": state.missing_fields,
            "uncertain_fields": state.uncertain_fields,
            "conflicting_fields": state.conflicting_fields,
        }

    # Check for direct completion phrase
    for comp_pat in COMPLETION_PHRASES:
        if re.search(comp_pat, input_text.strip().lower()):
            return {
                "notes": state.notes + ["Patient indicated completion."],
                "extracted_facts": state.extracted_facts,
                "known_fields": state.known_fields,
                "missing_fields": state.missing_fields,
                "uncertain_fields": state.uncertain_fields,
                "conflicting_fields": state.conflicting_fields,
            }

    extracted = None
    if gateway is not None:
        try:
            extraction_prompt = (
                f"You are a clinical intake assistant. Extract clinical facts from this patient response:\n"
                f"Patient Statement: '{input_text}'\n"
                f"Existing Known Fields: {state.known_fields}\n"
                f"Extract chief complaint, duration/onset, severity, symptoms, medications, and allergies."
            )
            extracted, _ = gateway.generate_structured(
                prompt=extraction_prompt,
                response_schema=ExtractedTurnSchema,
                trace_id=state.trace_id,
                step_name="intake_turn_extraction",
            )
        except Exception:
            extracted = None

    if extracted is None or (
        not extracted.chief_complaint
        and not extracted.duration_onset
        and not extracted.severity_progression
        and not extracted.associated_symptoms
        and not extracted.medications_mentioned
        and not extracted.allergies_mentioned
    ):
        extracted = _deterministic_extract(input_text, state)

    modality_source = "PATIENT_FORM" if getattr(state, "input_modality", "VOICE") == "TOUCH_TEXT" else "PATIENT_VOICE"
    updated_conflicts = list(state.conflicting_fields)
    updated_facts = [f.model_copy() for f in state.extracted_facts]
    new_facts: list[ClinicalFactModel] = []

    # Conflict check 1: Competing Chief Complaint (Rule 11: No silent conflict resolution)
    if extracted.chief_complaint and state.chief_complaint:
        if extracted.chief_complaint.lower() != state.chief_complaint.lower():
            if "chief_complaint" not in updated_conflicts:
                updated_conflicts.append("chief_complaint")
            for f in updated_facts:
                if f.concept == "chief_complaint":
                    f.status = "conflicting"

    # Conflict check 2: Medication vs Allergy contraindication
    known_allergies = [a.lower() for a in state.known_fields.get("allergies", [])]
    for med in extracted.medications_mentioned:
        for alg in known_allergies:
            if alg in med.lower() or ("penicillin" in alg and "amox" in med.lower()):
                if "medication_allergy" not in updated_conflicts:
                    updated_conflicts.append("medication_allergy")

    # Determine fact status
    cc_status = "conflicting" if "chief_complaint" in updated_conflicts else "reported"
    med_status = "conflicting" if "medication_allergy" in updated_conflicts else "reported"

    if extracted.chief_complaint:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="chief_complaint",
                value=extracted.chief_complaint,
                fact_type="symptom",
                status=cc_status,
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    if extracted.duration_onset and "duration_onset" not in state.known_fields:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="duration_onset",
                value=extracted.duration_onset,
                fact_type="symptom",
                status="reported",
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    if extracted.severity_progression and "severity_progression" not in state.known_fields:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="severity_progression",
                value=extracted.severity_progression,
                fact_type="symptom",
                status="reported",
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    for sym in extracted.associated_symptoms:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="symptom",
                value=sym,
                fact_type="symptom",
                status="reported",
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    for med in extracted.medications_mentioned:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="medication",
                value=med,
                fact_type="medication",
                status=med_status,
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    for alg in extracted.allergies_mentioned:
        new_facts.append(
            ClinicalFactModel(
                id=f"FACT-INTAKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=state.patient_id,
                encounter_id=state.encounter_id,
                concept="allergy",
                value=alg,
                fact_type="allergy",
                status="reported",
                source_type=modality_source,
                source_id=f"TURN-{state.turn_count + 1}",
                extraction_method="adaptive_intake_extraction",
            )
        )

    # Update known, missing, uncertain, and conflicting sets
    updated_known = dict(state.known_fields)
    if extracted.chief_complaint:
        updated_known["chief_complaint"] = extracted.chief_complaint
    if extracted.duration_onset:
        updated_known["duration_onset"] = extracted.duration_onset
    if extracted.severity_progression:
        updated_known["severity_progression"] = extracted.severity_progression
    if extracted.associated_symptoms:
        updated_known["associated_symptoms"] = extracted.associated_symptoms
    if extracted.medications_mentioned:
        updated_known["medications"] = list(set(updated_known.get("medications", []) + extracted.medications_mentioned))
    if extracted.allergies_mentioned:
        updated_known["allergies"] = list(set(updated_known.get("allergies", []) + extracted.allergies_mentioned))

    updated_missing = [f for f in state.missing_fields if f not in updated_known]
    updated_uncertain = list(set(state.uncertain_fields + extracted.uncertainties))

    return {
        "extracted_facts": updated_facts + new_facts,
        "known_fields": updated_known,
        "missing_fields": updated_missing,
        "uncertain_fields": updated_uncertain,
        "conflicting_fields": updated_conflicts,
        "chief_complaint": updated_known.get("chief_complaint", state.chief_complaint),
    }


def check_stopping_node(state: IntakeState) -> dict[str, Any]:
    """Node 3: Evaluates bounded loop termination and stopping conditions."""
    input_text = (state.last_patient_input or "").strip().lower()

    if state.emergency_detected:
        return {"status": "ESCALATE_EMERGENCY", "next_question": None}

    # Condition A: Patient signaled they are finished
    for comp_pat in COMPLETION_PHRASES:
        if re.search(comp_pat, input_text):
            return {"status": "COMPLETED", "next_question": None}

    # Condition B: Max turn count limit reached (Bounded Loop Guardrail)
    if state.turn_count >= state.max_turns:
        return {
            "status": "COMPLETED",
            "next_question": None,
            "notes": state.notes + [f"Intake reached maximum bounded turn count ({state.max_turns})."],
        }

    # Condition C: All core required intake fields collected
    required_core = {"chief_complaint", "duration_onset"}
    if required_core.issubset(set(state.known_fields.keys())) and len(state.uncertain_fields) == 0 and len(state.conflicting_fields) == 0:
        if state.turn_count >= 2:
            return {"status": "COMPLETED", "next_question": None}

    return {"status": "IN_PROGRESS"}


def generate_question_node(state: IntakeState, gateway: ModelGateway | None = None) -> dict[str, Any]:
    """Node 4: Generates the single next relevant question prioritizing conflicting and missing fields."""
    if state.status != "IN_PROGRESS":
        return {"next_question": None}

    # Default fallback question templates
    fallback_questions = {
        "chief_complaint": "What is the primary reason for your visit today?",
        "duration_onset": "How long have you been experiencing these symptoms, and when did they start?",
        "severity_progression": "How severe is your discomfort right now, and has it been getting better, worse, or staying the same?",
        "associated_symptoms": "Are you experiencing any other symptoms, such as fever, fatigue, or changes in appetite?",
        "allergies": "Do you have any known allergies to medications, foods, or other substances?",
        "medications": "Are you currently taking any prescription or over-the-counter medications?",
        "medication_allergy": "I noticed you mentioned a medication that may conflict with a reported allergy. Could you clarify this for the doctor?",
    }

    # Prioritize conflicting fields first (Rule 11), then uncertain, then missing in clinical order
    target_field = None
    if state.conflicting_fields:
        target_field = state.conflicting_fields[0]
        if target_field not in fallback_questions:
            fallback_questions[target_field] = f"Could you please clarify the details regarding your {target_field.replace('_', ' ')} for the medical record?"
    elif state.uncertain_fields:
        target_field = state.uncertain_fields[0]
    elif "chief_complaint" in state.missing_fields:
        target_field = "chief_complaint"
    elif "duration_onset" in state.missing_fields:
        target_field = "duration_onset"
    elif "severity_progression" in state.missing_fields:
        target_field = "severity_progression"
    elif "associated_symptoms" in state.missing_fields:
        target_field = "associated_symptoms"

    question_text = None
    if gateway is not None:
        try:
            question_prompt = (
                f"You are a clinical intake assistant. Generate ONE concise, empathetic question for the patient.\n"
                f"Target Clinical Area: {target_field or 'any other concerns'}\n"
                f"Already Known Facts: {state.known_fields}\n"
                f"Conflicting Fields: {state.conflicting_fields}\n"
                f"Do NOT ask about facts already known. Ask only ONE question."
            )
            result, _ = gateway.generate_structured(
                prompt=question_prompt,
                response_schema=NextQuestionSchema,
                trace_id=state.trace_id,
                step_name="intake_generate_question",
            )
            question_text = result.question
        except Exception:
            question_text = None

    if not question_text:
        # Deterministic template fallback
        question_text = fallback_questions.get(
            target_field,
            "Is there anything else regarding your symptoms or health you would like the doctor to know?"
        )

    return {
        "next_question": question_text,
        "turn_count": state.turn_count + 1,
        "dialog_history": state.dialog_history + [{"role": "assistant", "content": question_text}],
    }
