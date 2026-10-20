"""Unit tests for Evidence-Backed Doctor Brief & Audio Summary Generation."""

import pytest
from clinsync_ai.brief.audio import AudioBriefService
from clinsync_ai.brief.models import AudioStatus, DoctorBriefResponse
from clinsync_ai.brief.service import DoctorBriefService
from clinsync_ai.graph.state import ClinicalFactModel
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.routing.gateway import ModelGateway


@pytest.fixture
def fake_gateway() -> ModelGateway:
    """Offline deterministic model gateway."""
    fake = FakeModelProvider()
    return ModelGateway(primary_provider=fake)


@pytest.fixture
def sample_facts() -> tuple[list[ClinicalFactModel], list[ClinicalFactModel], list[str]]:
    """Synthetic clinical facts representing intake, documents, history, and conflicts."""
    pid = "PAT-SYNTH-ELEANOR"
    current_facts = [
        ClinicalFactModel(
            id="FACT-INTAKE-001",
            patient_id=pid,
            concept="chief_complaint",
            value="Worsening dry cough and mild dyspnea for 5 days",
            source_type="PATIENT_VOICE",
            status="reported",
            source_id="ENC-SYNTH-501",
        ),
        ClinicalFactModel(
            id="FACT-INTAKE-002",
            patient_id=pid,
            concept="medication_candidate",
            value="Amoxicillin 500mg TID prescribed by urgent care",
            source_type="PATIENT_VOICE",
            status="conflicting",
            source_id="ENC-SYNTH-501",
        ),
        ClinicalFactModel(
            id="FACT-DOC-001",
            patient_id=pid,
            concept="blood_pressure",
            value="142/88 mmHg",
            source_type="UPLOADED_DOCUMENT",
            status="extracted_unverified",
            source_id="DOC-CARDIO-REPORT-01",
        ),
        ClinicalFactModel(
            id="FACT-DOC-002",
            patient_id=pid,
            concept="oxygen_saturation",
            value="97% on room air",
            source_type="UPLOADED_DOCUMENT",
            status="extracted_unverified",
            source_id="DOC-CARDIO-REPORT-01",
        ),
    ]

    historical_facts = [
        ClinicalFactModel(
            id="FACT-HIST-001",
            patient_id=pid,
            concept="allergy",
            value="Penicillin (Anaphylaxis)",
            source_type="HISTORICAL_EHR",
            status="historical_recorded",
            source_id="EHR-HIST-RECORDS-2023",
        ),
        ClinicalFactModel(
            id="FACT-HIST-002",
            patient_id=pid,
            concept="past_medical_history",
            value="Essential Hypertension diagnosed 2019",
            source_type="HISTORICAL_EHR",
            status="historical_recorded",
            source_id="EHR-HIST-RECORDS-2023",
        ),
        ClinicalFactModel(
            id="FACT-HIST-003",
            patient_id=pid,
            concept="confirmed_finding",
            value="Normal baseline ECG recorded 2024-01",
            source_type="DOCTOR_INPUT",
            status="doctor_confirmed",
            source_id="EHR-HIST-RECORDS-2024",
        ),
    ]

    unresolved_conflicts = [
        "Contraindication: Candidate medication 'Amoxicillin 500mg' conflicts with historical anaphylactic allergy to 'Penicillin'.",
    ]

    return current_facts, historical_facts, unresolved_conflicts


def test_brief_generation_happy_path(fake_gateway, sample_facts):
    """Test generating a structured doctor brief conforming to the OpenAPI contract."""
    current, historical, conflicts = sample_facts
    service = DoctorBriefService(gateway=fake_gateway)

    response = service.generate_brief(
        encounter_id="ENC-SYNTH-501",
        patient_id="PAT-SYNTH-ELEANOR",
        patient_name="Eleanor Johnson",
        chief_complaint="Worsening dry cough and mild dyspnea for 5 days",
        current_facts=current,
        historical_facts=historical,
        unresolved_conflicts=conflicts,
        missing_information=["Immunization history not recorded in EHR"],
    )

    assert isinstance(response, DoctorBriefResponse)
    assert response.request_id.startswith("req-brief-")
    assert response.data.summary_text is not None
    assert len(response.data.summary_text) > 30
    assert len(response.data.sections) == 4


def test_zero_fabricated_citations(fake_gateway, sample_facts):
    """Assert that 100% of generated citations map strictly to known context fact IDs."""
    current, historical, conflicts = sample_facts
    service = DoctorBriefService(gateway=fake_gateway)

    all_valid_ids = {f.id for f in current + historical}
    all_valid_source_ids = {f.source_id for f in current + historical}

    response = service.generate_brief(
        encounter_id="ENC-SYNTH-501",
        patient_id="PAT-SYNTH-ELEANOR",
        current_facts=current,
        historical_facts=historical,
        unresolved_conflicts=conflicts,
    )

    citations = response.data.citations
    assert len(citations) > 0, "Brief should contain citations to verified facts."

    for c in citations:
        assert c.fact_id in all_valid_ids, f"Fabricated fact ID detected: {c.fact_id}"
        assert c.source_id in all_valid_source_ids, f"Fabricated source ID detected: {c.source_id}"


def test_provenance_separation(fake_gateway, sample_facts):
    """Verify that patient-reported, historical, extracted, and confirmed facts are distinct."""
    current, historical, conflicts = sample_facts
    service = DoctorBriefService(gateway=fake_gateway)

    response = service.generate_brief(
        encounter_id="ENC-SYNTH-501",
        patient_id="PAT-SYNTH-ELEANOR",
        current_facts=current,
        historical_facts=historical,
        unresolved_conflicts=conflicts,
    )

    data = response.data

    # Check distinct categories
    assert any("chief_complaint" in pr for pr in data.patient_reported)
    assert any("allergy" in hr for hr in data.historical_records)
    assert any("blood_pressure" in ef for ef in data.extracted_facts)
    assert any("confirmed_finding" in vf for vf in data.verified_facts)


def test_conflict_preservation(fake_gateway, sample_facts):
    """Rule 11: Assert that clinical conflicts are preserved and explicitly highlighted."""
    current, historical, conflicts = sample_facts
    service = DoctorBriefService(gateway=fake_gateway)

    response = service.generate_brief(
        encounter_id="ENC-SYNTH-501",
        patient_id="PAT-SYNTH-ELEANOR",
        current_facts=current,
        historical_facts=historical,
        unresolved_conflicts=conflicts,
    )

    data = response.data
    assert len(data.unresolved_conflicts) > 0
    assert any("Penicillin" in c for c in data.unresolved_conflicts)
    assert any("Amoxicillin" in c for c in data.unresolved_conflicts)

    # Check that conflicts are highlighted in the sections
    conflict_section = next((s for s in data.sections if "Conflict" in s.title), None)
    assert conflict_section is not None
    assert (
        "Contraindication" in conflict_section.content or "Amoxicillin" in conflict_section.content
    )


def test_audio_summary_spoken_script_and_graceful_degradation():
    """Verify spoken script generation and graceful degradation when audio synthesis is unavailable."""
    audio_svc = AudioBriefService(tts_adapter=None)

    script = audio_svc.compose_spoken_script(
        patient_name="Eleanor Johnson",
        chief_complaint="Dry cough and chest tightness",
        patient_reported=["chief_complaint: dry cough", "symptom: chest tightness"],
        extracted_facts=["blood_pressure: 142/88 mmHg"],
        historical_records=["allergy: Penicillin"],
        unresolved_conflicts=[
            "Contraindication: Amoxicillin prescribed despite Penicillin allergy"
        ],
    )

    assert "Eleanor Johnson" in script
    assert "Dry cough" in script
    assert "Attention required" in script
    assert "Penicillin" in script

    # Test synthesis with no TTS adapter configured
    text, status, url, est_secs = audio_svc.generate_audio_summary(script, "ENC-501")
    assert text == script
    assert status == AudioStatus.UNAVAILABLE
    assert url is None
    assert est_secs > 10.0  # Reasonable speech duration estimate


def test_audio_summary_with_mock_tts_adapter():
    """Verify that when a TTS adapter is available, status is READY and audio_url is provided."""

    class MockTTS:
        def synthesize(self, text: str, encounter_id: str) -> str:
            return f"https://cdn.clinsync.internal/audio/{encounter_id}_brief.mp3"

    audio_svc = AudioBriefService(tts_adapter=MockTTS())
    script = "ClinSync test spoken summary script."
    text, status, url, est_secs = audio_svc.generate_audio_summary(script, "ENC-501")

    assert status == AudioStatus.READY
    assert url == "https://cdn.clinsync.internal/audio/ENC-501_brief.mp3"
    assert est_secs > 0.0


def test_missing_information_tracking(fake_gateway, sample_facts):
    """Verify that absent/unrecorded clinical domains are surfaced as missing information."""
    current, historical, _ = sample_facts
    service = DoctorBriefService(gateway=fake_gateway)

    response = service.generate_brief(
        encounter_id="ENC-SYNTH-501",
        patient_id="PAT-SYNTH-ELEANOR",
        current_facts=current,
        historical_facts=historical,
        unresolved_conflicts=[],
        missing_information=[
            "No recorded surgical history",
            "No baseline pulmonary function tests",
        ],
    )

    data = response.data
    assert len(data.missing_information) == 2
    assert "No recorded surgical history" in data.missing_information
