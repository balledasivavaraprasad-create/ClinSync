"""Deterministic clinical safety policy engine and triage guardrails for ClinSync.

Enforces Rule 10: "Safety before scheduling. The model can extract/report facts
but cannot independently decide medical urgency. Run configured deterministic
demo rules and a human escalation path before routine slot matching."
"""

import re
from typing import Any, Literal

from pydantic import BaseModel, Field

from clinsync_ai.guardrails.prompt_guard import PromptGuard

# Comprehensive deterministic acute red flags requiring immediate human escalation
ACUTE_RED_FLAGS: list[tuple[str, str]] = [
    # Cardiovascular / Acute Coronary Syndrome
    (
        r"\b(?:crushing|severe|radiating|acute)\s+chest\s+pain\b",
        "ACUTE_CORONARY_SYNDROME_SUSPECTED",
    ),
    (
        r"\bchest\s+pain\s+(?:radiat\w*|spread\w*)\s+(?:to\s+)?(?:left\s+)?(?:arm|jaw|shoulder|neck|back)\b",
        "ACUTE_CORONARY_SYNDROME_SUSPECTED",
    ),
    (
        r"\b(?:pressure|tightness|squeezing)\s+in\s+(?:my\s+|the\s+)?chest\b",
        "ACUTE_CORONARY_SYNDROME_SUSPECTED",
    ),
    (r"\b(?:severe\s+)?chest\s+pain\b", "CHEST_PAIN_EMERGENCY"),
    # Respiratory Distress / Hypoxia
    (r"\b(?:can(?:'t|not)|unable\s+to)\s+breathe\b", "ACUTE_RESPIRATORY_DISTRESS"),
    (r"\bsevere\s+shortness\s+of\s+breath\b", "ACUTE_RESPIRATORY_DISTRESS"),
    (
        r"\b(?:struggling|difficulty|trouble|fighting)\s+(?:to\s+breathe|breathing)\b",
        "ACUTE_RESPIRATORY_DISTRESS",
    ),
    (r"\bgasping(?:\s+for\s+(?:air|breath))?\b", "ACUTE_RESPIRATORY_DISTRESS"),
    (r"\bstridor\b", "UPPER_AIRWAY_OBSTRUCTION"),
    (r"\bcyanosis|blue\s+lips|turning\s+blue\b", "SEVERE_HYPOXIA"),
    # Neurological / Acute Stroke (FAST criteria)
    (
        r"\b(?:sudden|acute)\s+(?:numbness|paralysis|weakness)\s+(?:on\s+)?(?:one\s+side|unilateral)\b",
        "ACUTE_STROKE_PRESENTATION",
    ),
    (r"\bfacial\s+droop(?:ing)?\b", "ACUTE_STROKE_PRESENTATION"),
    (r"\bslurred\s+speech|trouble\s+speaking|cannot\s+speak\b", "ACUTE_STROKE_PRESENTATION"),
    (r"\bworst\s+headache\s+of\s+(?:my\s+)?life\b", "SUBARACHNOID_HEMORRHAGE_SUSPECTED"),
    (r"\bthunderclap\s+headache\b", "SUBARACHNOID_HEMORRHAGE_SUSPECTED"),
    (r"\bloss\s+of\s+consciousness\b", "SYNCOPE_OR_LOSS_OF_CONSCIOUSNESS"),
    (r"\b(?:passed\s+out|fainted|blacked\s+out|collapsed)\b", "SYNCOPE_OR_LOSS_OF_CONSCIOUSNESS"),
    (r"\bseizure|convulsing|convulsions\b", "ACTIVE_SEIZURE"),
    # Anaphylaxis / Airway Compromise
    (r"\bthroat\s+(?:is\s+)?(?:closing|swelling|tightening)\b", "ANAPHYLAXIS_AIRWAY_COMPROMISE"),
    (
        r"\bswelling\s+of\s+(?:the\s+|my\s+)?(?:lips|tongue|throat|uvula)\b",
        "ANAPHYLAXIS_AIRWAY_COMPROMISE",
    ),
    (r"\banaphylaxis\b", "ANAPHYLAXIS_AIRWAY_COMPROMISE"),
    # Severe Hemorrhage
    (r"\bcoughing\s+(?:up\s+)?(?:large\s+amounts\s+of\s+)?blood\b", "MASSIVE_HEMOPTYSIS"),
    (r"\bvomiting\s+(?:up\s+)?blood\b", "UPPER_GI_BLEED_HEMATEMESIS"),
    (r"\buncontrolled\s+bleeding|profuse\s+bleeding\b", "SEVERE_HEMORRHAGE"),
    # Psychiatric Acute Crisis
    (r"\b(?:kill|harm|end)\s+(?:myself|my\s+life)\b", "ACUTE_PSYCHIATRIC_CRISIS"),
    (r"\bsuicid(?:e|al)(?:\s+(?:thoughts?|ideation|plan))?\b", "ACUTE_PSYCHIATRIC_CRISIS"),
]


class TriageEvaluation(BaseModel):
    """Result of deterministic triage policy evaluation."""

    decision: Literal[
        "ROUTINE_SCHEDULING", "HUMAN_REVIEW", "URGENT_ESCALATION", "UNABLE_TO_DETERMINE"
    ]
    is_emergency: bool
    reason_codes: list[str] = Field(default_factory=list)
    flagged_patterns: list[str] = Field(default_factory=list)
    clinical_rationale: str
    recommended_department_id: str | None = None
    override_applied: bool = False
    policy_version: str = "clinsync-policy-v1.0"


class TriagePolicyGuard:
    """Inviolable deterministic safety gate enforcing clinical escalation thresholds."""

    def __init__(self, policy_version: str = "clinsync-policy-v1.0"):
        self.policy_version = policy_version
        self._compiled_red_flags = [
            (re.compile(pat, re.IGNORECASE), code) for pat, code in ACUTE_RED_FLAGS
        ]
        self.prompt_guard = PromptGuard()

    def evaluate_text_for_emergency(self, text: str) -> tuple[bool, list[str], list[str]]:
        """Scan input text against deterministic red flag patterns."""
        if not text or not text.strip():
            return False, [], []

        matched_codes = []
        matched_patterns = []
        for regex, code in self._compiled_red_flags:
            if regex.search(text):
                matched_codes.append(code)
                matched_patterns.append(regex.pattern)

        return (len(matched_codes) > 0, matched_codes, matched_patterns)

    def guard_candidate_decision(
        self,
        candidate_decision: str,
        candidate_department_id: str | None,
        patient_input: str,
        unresolved_conflicts: list[Any] | None = None,
        is_ambiguous: bool = False,
    ) -> TriageEvaluation:
        """Apply inviolable guardrails to validate or override any model-proposed routing decision."""
        from clinsync_ai.routing.specialty_catalog import (
            is_valid_department_id,
            normalize_department_candidate,
        )

        # 1. Deterministic Red Flag Safety Check (TOP PRIORITY)
        is_emergency, red_flag_codes, red_flag_patterns = self.evaluate_text_for_emergency(
            patient_input
        )
        if is_emergency:
            # Mandatory rule: Emergency symptoms ALWAYS escalate to urgent evaluation regardless of model output
            override_occurred = candidate_decision != "URGENT_ESCALATION"
            return TriageEvaluation(
                decision="URGENT_ESCALATION",
                is_emergency=True,
                reason_codes=["ACUTE_RED_FLAG_DETECTED"] + list(set(red_flag_codes)),
                flagged_patterns=red_flag_patterns,
                clinical_rationale=(
                    f"Immediate emergency escalation triggered by deterministic safety policy: "
                    f"matched acute red flag criteria {', '.join(set(red_flag_codes))}."
                ),
                recommended_department_id=None,
                override_applied=override_occurred,
                policy_version=self.policy_version,
            )

        # 2. Adversarial Prompt Injection Screening
        prompt_safety = self.prompt_guard.evaluate(patient_input)
        if not prompt_safety.is_safe:
            # Adversarial input detected: model instruction override attempted
            return TriageEvaluation(
                decision="HUMAN_REVIEW",
                is_emergency=False,
                reason_codes=["ADVERSARIAL_INJECTION_DETECTED"],
                flagged_patterns=prompt_safety.detected_patterns,
                clinical_rationale=(
                    f"Input contained adversarial prompt injection or instruction override patterns "
                    f"({prompt_safety.reason}). Routed to clinical staff review for safety."
                ),
                recommended_department_id=None,
                override_applied=True,
                policy_version=self.policy_version,
            )

        # 3. Unresolved High-Risk Clinical Conflicts in Ledger
        if unresolved_conflicts and len(unresolved_conflicts) > 0:
            return TriageEvaluation(
                decision="HUMAN_REVIEW",
                is_emergency=False,
                reason_codes=["UNRESOLVED_CLINICAL_CONFLICTS"],
                flagged_patterns=[],
                clinical_rationale=(
                    f"Encounter has {len(unresolved_conflicts)} unresolved clinical conflict(s) "
                    "between historical records and current intake. Requires physician reconciliation."
                ),
                recommended_department_id=normalize_department_candidate(candidate_department_id),
                override_applied=candidate_decision == "ROUTINE_SCHEDULING",
                policy_version=self.policy_version,
            )

        # 4. Ambiguous or Non-Specific Clinical Presentation
        if is_ambiguous:
            return TriageEvaluation(
                decision="HUMAN_REVIEW",
                is_emergency=False,
                reason_codes=["AMBIGUOUS_CLINICAL_PRESENTATION"],
                flagged_patterns=[],
                clinical_rationale=(
                    "Symptom presentation is diffuse or non-specific across multiple medical specialties. "
                    "Routed to human triage review before slot allocation."
                ),
                recommended_department_id=normalize_department_candidate(candidate_department_id),
                override_applied=candidate_decision == "ROUTINE_SCHEDULING",
                policy_version=self.policy_version,
            )

        # 5. Non-clinical / Out of Scope check
        words = patient_input.strip().split()
        if len(words) == 0:
            return TriageEvaluation(
                decision="UNABLE_TO_DETERMINE",
                is_emergency=False,
                reason_codes=["OUT_OF_SCOPE_INPUT"],
                flagged_patterns=[],
                clinical_rationale="Patient input is empty or insufficient to evaluate.",
                recommended_department_id=None,
                override_applied=False,
                policy_version=self.policy_version,
            )

        # 6. Constrained Allowlisted Department Validation
        normalized_dept = normalize_department_candidate(candidate_department_id)
        if candidate_decision == "ROUTINE_SCHEDULING":
            if not is_valid_department_id(normalized_dept):
                # Model suggested a department outside the authorized hospital catalog
                return TriageEvaluation(
                    decision="HUMAN_REVIEW",
                    is_emergency=False,
                    reason_codes=[
                        "UNAUTHORIZED_DEPARTMENT_REJECTED",
                        "AMBIGUOUS_CLINICAL_PRESENTATION",
                    ],
                    flagged_patterns=[f"invalid_dept:{candidate_department_id}"],
                    clinical_rationale=(
                        f"Proposed department '{candidate_department_id}' is not in the hospital's "
                        "allowlisted department catalog. Escalated to human intake review."
                    ),
                    recommended_department_id=None,
                    override_applied=True,
                    policy_version=self.policy_version,
                )

            return TriageEvaluation(
                decision="ROUTINE_SCHEDULING",
                is_emergency=False,
                reason_codes=["ROUTINE_DEPARTMENT_MATCH"],
                flagged_patterns=[],
                clinical_rationale=f"Routine clinical presentation mapped safely to allowlisted department '{normalized_dept}'.",
                recommended_department_id=normalized_dept,
                override_applied=False,
                policy_version=self.policy_version,
            )

        # 7. Default to Human Review for other candidate states
        return TriageEvaluation(
            decision="HUMAN_REVIEW",
            is_emergency=False,
            reason_codes=["CLINICAL_TRIAGE_REVIEW_REQUIRED"],
            flagged_patterns=[],
            clinical_rationale="Case routed for human clinician triage review.",
            recommended_department_id=normalized_dept,
            override_applied=False,
            policy_version=self.policy_version,
        )
