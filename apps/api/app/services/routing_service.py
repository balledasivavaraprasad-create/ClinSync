"""Deterministic Clinical Safety Policy Engine and Specialty Routing Service."""

import re
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.core.errors import ClinSyncAppException, ErrorCode
from app.models.encounter import Encounter
from app.schemas.routing import DecisionResult, DecisionResultResponse

# Allowlisted hospital departments strictly constrained to real hospital facilities
ALLOWLISTED_DEPARTMENTS: dict[str, dict] = {
    "dept_cardiology": {
        "name": "Cardiology & Chest Pain Center",
        "symptoms": [
            "palpitations",
            "fluttering heart",
            "elevated blood pressure",
            "hypertension",
            "murmur",
            "mild chest tightness",
            "irregular heartbeat",
        ],
        "keywords": ["cardiology", "cardiologist", "cardiac", "heart"],
    },
    "dept_internal_med": {
        "name": "General Internal Medicine",
        "symptoms": [
            "fatigue",
            "unexplained weight loss",
            "chronic malaise",
            "diabetes",
            "multisystem symptoms",
            "general illness",
        ],
        "keywords": ["internal medicine", "internist", "general medicine", "internal med"],
    },
    "dept_neurology": {
        "name": "Neurology & Stroke Unit",
        "symptoms": [
            "chronic migraine",
            "tension headache",
            "tingling",
            "peripheral neuropathy",
            "tremor",
            "dizziness",
        ],
        "keywords": ["neurology", "neurologist", "neuro"],
    },
    "dept_orthopedics": {
        "name": "Orthopedics & Musculoskeletal",
        "symptoms": [
            "joint pain",
            "sprained ankle",
            "knee pain",
            "lower back pain",
            "shoulder pain",
            "arthritis",
            "stiff neck",
        ],
        "keywords": ["orthopedics", "orthopaedics", "orthopedic", "bone doctor", "sports medicine"],
    },
    "dept_pulmonology": {
        "name": "Pulmonology & Respiratory Care",
        "symptoms": [
            "subacute cough",
            "dry cough",
            "chronic cough",
            "mild wheezing",
            "asthma",
            "bronchitis",
        ],
        "keywords": ["pulmonology", "pulmonologist", "lung doctor", "respiratory"],
    },
    "dept_ent": {
        "name": "Otolaryngology / ENT",
        "symptoms": [
            "sore throat",
            "earache",
            "sinus pressure",
            "nasal congestion",
            "hoarseness",
            "ear pain",
        ],
        "keywords": ["ent", "otolaryngology", "ear nose throat"],
    },
    "dept_dermatology": {
        "name": "Dermatology",
        "symptoms": [
            "rash",
            "pruritus",
            "itching",
            "eczema",
            "hives",
            "skin lesion",
            "dermatitis",
        ],
        "keywords": ["dermatology", "dermatologist", "skin"],
    },
    "dept_general_practice": {
        "name": "Primary Care / General Practice",
        "symptoms": [
            "annual physical",
            "checkup",
            "mild cold",
            "routine review",
            "vaccination",
        ],
        "keywords": ["general practice", "gp", "primary care", "family medicine", "pcp"],
    },
}

# Deterministic acute red flags requiring immediate human emergency escalation
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

# Adversarial prompt injection defense patterns
ADVERSARIAL_PATTERNS: list[str] = [
    r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions",
    r"override\s+(?:triage|safety|policy)",
    r"disregard\s+(?:safety|rules|instructions)",
    r"you\s+are\s+now\s+(?:an?\s+)?(?:unfiltered|jailbroken|doctor|admin)",
    r"system\s*:\s*admin",
    r"bypass\s+(?:filters|guardrails)",
]


class RoutingService:
    """Service enforcing deterministic clinical safety policies and specialty routing."""

    def __init__(self, policy_version: str = "clinsync-policy-v1.0"):
        self.policy_version = policy_version
        self._compiled_red_flags = [
            (re.compile(pat, re.IGNORECASE), code) for pat, code in ACUTE_RED_FLAGS
        ]
        self._compiled_adversarial = [
            re.compile(pat, re.IGNORECASE) for pat in ADVERSARIAL_PATTERNS
        ]

    def evaluate_routing(
        self,
        db: Session,
        encounter_id: str,
        request_id: str,
    ) -> DecisionResultResponse:
        """Run deterministic triage policy and specialty routing review."""
        encounter = (
            db.query(Encounter)
            .options(joinedload(Encounter.patient), joinedload(Encounter.facts))
            .filter(Encounter.id == encounter_id)
            .first()
        )
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter '{encounter_id}' not found.",
            )

        # Scoped authorization check: Patient identity must be confirmed
        if not encounter.patient or encounter.patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message=(
                    "Patient identity must be confirmed before clinical routing review can proceed."
                ),
            )

        # Collect clinical texts and facts from encounter
        clinical_snippets: list[str] = []
        has_conflicts = False

        for fact in encounter.facts:
            clinical_snippets.append(f"{fact.concept}: {fact.value}")
            if fact.status == "conflicting":
                has_conflicts = True

        combined_text = " ".join(clinical_snippets).strip()

        # Gate 1: Deterministic Emergency Red Flag Safety Check (HIGHEST PRIORITY)
        is_emergency, red_codes = self._check_emergency_red_flags(combined_text)
        if is_emergency:
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="URGENT_ESCALATION",
                    reason_codes=["ACUTE_RED_FLAG_DETECTED"] + sorted(list(set(red_codes))),
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        # Gate 2: Adversarial Prompt Injection Defense
        if self._check_adversarial(combined_text):
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="HUMAN_REVIEW",
                    reason_codes=["ADVERSARIAL_INJECTION_DETECTED"],
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        # Gate 3: Unresolved Clinical Ledger Contradictions
        if has_conflicts:
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="HUMAN_REVIEW",
                    reason_codes=["UNRESOLVED_CLINICAL_CONFLICTS"],
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        # Gate 4: Out-of-Scope / Empty Clinical Context Check
        if not combined_text:
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="UNABLE_TO_DETERMINE",
                    reason_codes=["OUT_OF_SCOPE_INPUT", "NO_CLINICAL_FACTS_RECORDED"],
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        # Gate 5: Constrained Specialty Department Matching
        dept_match, is_ambiguous = self._match_department(combined_text)

        if is_ambiguous:
            return DecisionResultResponse(
                data=DecisionResult(
                    decision="HUMAN_REVIEW",
                    reason_codes=["AMBIGUOUS_MULTI_SYSTEM_PRESENTATION"],
                    recommended_department_id=None,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        if dept_match:
            # Update encounter state in database
            encounter.assigned_department_id = dept_match
            if encounter.status == "IN_PROGRESS":
                encounter.status = "TRIAGED"
            db.commit()

            return DecisionResultResponse(
                data=DecisionResult(
                    decision="ROUTINE_SCHEDULING",
                    reason_codes=[
                        f"{dept_match.upper()}_SYMPTOM_MATCH",
                        "NO_UNSTABLE_VITALS",
                    ],
                    recommended_department_id=dept_match,
                    policy_version=self.policy_version,
                    evaluated_at=datetime.now(timezone.utc),
                    encounter_id=encounter_id,
                ),
                request_id=request_id,
            )

        # Indeterminate clinical presentation
        return DecisionResultResponse(
            data=DecisionResult(
                decision="HUMAN_REVIEW",
                reason_codes=["SPECIALTY_INDETERMINATE"],
                recommended_department_id=None,
                policy_version=self.policy_version,
                evaluated_at=datetime.now(timezone.utc),
                encounter_id=encounter_id,
            ),
            request_id=request_id,
        )

    def _check_emergency_red_flags(self, text: str) -> tuple[bool, list[str]]:
        """Check for acute emergency red flags."""
        if not text:
            return False, []
        matched = []
        for regex, code in self._compiled_red_flags:
            if regex.search(text):
                matched.append(code)
        return len(matched) > 0, matched

    def _check_adversarial(self, text: str) -> bool:
        """Check for prompt injection attempts."""
        if not text:
            return False
        for regex in self._compiled_adversarial:
            if regex.search(text):
                return True
        return False

    def _match_department(self, text: str) -> tuple[Optional[str], bool]:
        """Match clinical text against allowlisted hospital departments."""
        text_lower = text.lower()
        dept_scores: dict[str, int] = {}

        for dept_id, info in ALLOWLISTED_DEPARTMENTS.items():
            score = 0
            for sym in info["symptoms"]:
                if sym.lower() in text_lower:
                    score += 2
            for kw in info["keywords"]:
                if re.search(rf"\b{re.escape(kw.lower())}\b", text_lower):
                    score += 1
            if score > 0:
                dept_scores[dept_id] = score

        if not dept_scores:
            return None, False

        # If 3 or more distinct departments match with equal top scores, flag as ambiguous
        top_score = max(dept_scores.values())
        top_depts = [d for d, s in dept_scores.items() if s == top_score]

        if len(dept_scores) >= 3 and len(top_depts) >= 2:
            return None, True

        return top_depts[0], False
