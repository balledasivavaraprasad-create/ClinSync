"""Allowlisted hospital department catalog and specialty mapping rules for ClinSync."""

from pydantic import BaseModel, Field


class HospitalDepartment(BaseModel):
    """Specification of an authorized hospital department."""

    department_id: str
    name: str
    description: str
    primary_symptoms: list[str] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)


# Authoritative hospital department catalog strictly constrained to real facilities
ALLOWLISTED_DEPARTMENTS: dict[str, HospitalDepartment] = {
    "dept_cardiology": HospitalDepartment(
        department_id="dept_cardiology",
        name="Cardiology & Chest Pain Center",
        description="Cardiovascular evaluations, non-acute chest discomfort, palpitations, hypertension, arrhythmias.",
        primary_symptoms=[
            "palpitations",
            "fluttering heart",
            "elevated blood pressure",
            "hypertension",
            "murmur",
            "mild chest tightness",
        ],
        aliases=["cardiology", "cardiologist", "cardiac", "heart", "heart doctor"],
    ),
    "dept_internal_med": HospitalDepartment(
        department_id="dept_internal_med",
        name="General Internal Medicine",
        description="Comprehensive evaluation for chronic conditions, complex multi-system complaints, diabetes, hypertension, fatigue.",
        primary_symptoms=[
            "fatigue",
            "unexplained weight loss",
            "chronic malaise",
            "diabetes",
            "multisystem symptoms",
            "general illness",
        ],
        aliases=["internal medicine", "internist", "general medicine", "internal med"],
    ),
    "dept_neurology": HospitalDepartment(
        department_id="dept_neurology",
        name="Neurology & Stroke Unit",
        description="Central and peripheral nervous system disorders, chronic headaches, migraines, tremors, neuropathic symptoms.",
        primary_symptoms=[
            "chronic migraine",
            "tension headache",
            "tingling",
            "peripheral neuropathy",
            "tremor",
            "dizziness",
        ],
        aliases=["neurology", "neurologist", "neuro", "brain doctor"],
    ),
    "dept_orthopedics": HospitalDepartment(
        department_id="dept_orthopedics",
        name="Orthopedics & Musculoskeletal",
        description="Bones, joints, ligaments, tendons, spine, sports injuries, arthritis, sprains.",
        primary_symptoms=[
            "joint pain",
            "sprained ankle",
            "knee pain",
            "lower back pain",
            "shoulder pain",
            "arthritis",
            "stiff neck",
        ],
        aliases=["orthopedics", "orthopaedics", "orthopedic", "bone doctor", "sports medicine"],
    ),
    "dept_pulmonology": HospitalDepartment(
        department_id="dept_pulmonology",
        name="Pulmonology & Respiratory Care",
        description="Lungs, respiratory tract, subacute cough, asthma, bronchitis, chronic wheezing.",
        primary_symptoms=[
            "subacute cough",
            "dry cough",
            "chronic cough",
            "mild wheezing",
            "asthma",
            "bronchitis",
        ],
        aliases=["pulmonology", "pulmonologist", "lung doctor", "respiratory"],
    ),
    "dept_ent": HospitalDepartment(
        department_id="dept_ent",
        name="Otolaryngology / ENT",
        description="Ear, nose, throat, sinuses, hearing, hoarseness, pharyngitis, sinusitis.",
        primary_symptoms=[
            "sore throat",
            "earache",
            "sinus pressure",
            "nasal congestion",
            "hoarseness",
            "ear pain",
        ],
        aliases=["ent", "otolaryngology", "ear nose throat", "ent specialist"],
    ),
    "dept_dermatology": HospitalDepartment(
        department_id="dept_dermatology",
        name="Dermatology",
        description="Skin, hair, nails, rash, eczema, dermatitis, localized lesions, itching.",
        primary_symptoms=[
            "rash",
            "pruritus",
            "itching",
            "eczema",
            "hives",
            "skin lesion",
            "dermatitis",
        ],
        aliases=["dermatology", "dermatologist", "skin doctor", "skin"],
    ),
    "dept_general_practice": HospitalDepartment(
        department_id="dept_general_practice",
        name="Primary Care / General Practice",
        description="Routine primary care, preventive checkups, general minor ailments, vaccinations.",
        primary_symptoms=[
            "annual physical",
            "checkup",
            "mild cold",
            "routine review",
            "vaccination",
        ],
        aliases=["general practice", "gp", "primary care", "family medicine", "pcp"],
    ),
}


def is_valid_department_id(department_id: str | None) -> bool:
    """Validate whether department_id belongs to the allowlisted hospital catalog."""
    if not department_id:
        return False
    return department_id.strip().lower() in ALLOWLISTED_DEPARTMENTS


def get_department(department_id: str | None) -> HospitalDepartment | None:
    """Retrieve hospital department metadata if registered."""
    if not department_id:
        return None
    return ALLOWLISTED_DEPARTMENTS.get(department_id.strip().lower())


def normalize_department_candidate(candidate: str | None) -> str | None:
    """Map natural language specialty names or department IDs to an allowlisted department ID."""
    if not candidate or not candidate.strip():
        return None
    cand_lower = candidate.strip().lower()

    # Direct match on ID
    if cand_lower in ALLOWLISTED_DEPARTMENTS:
        return cand_lower

    # Alias / name match with strict word boundaries
    import re

    for dept_id, dept in ALLOWLISTED_DEPARTMENTS.items():
        if cand_lower == dept.name.lower():
            return dept_id
        for alias in dept.aliases:
            if cand_lower == alias.lower():
                return dept_id
            if re.search(rf"\b{re.escape(alias.lower())}\b", cand_lower):
                return dept_id

    return None
