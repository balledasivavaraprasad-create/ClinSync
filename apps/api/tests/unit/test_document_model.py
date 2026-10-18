"""Unit tests for Document model and relationships."""

from app.models.document import Document
from app.models.encounter import Encounter
from app.models.patient import Patient


def test_document_model_creation_and_relationships(db_session):
    """Document model instantiates with proper defaults and foreign keys."""
    patient = Patient(
        display_name="Test Patient",
        identity_status="CONFIRMED",
    )
    db_session.add(patient)
    db_session.commit()

    encounter = Encounter(
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    doc = Document(
        patient_id=patient.id,
        encounter_id=encounter.id,
        filename_display="test_report.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
        checksum_sha256="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        storage_path="/data/documents/test.bin",
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    assert doc.id is not None
    assert doc.processing_status == "UPLOADED"
    assert doc.filename_display == "test_report.pdf"
    assert doc.mime_type == "application/pdf"
    assert doc.patient_id == patient.id
    assert doc.encounter_id == encounter.id
    assert doc.patient.display_name == "Test Patient"
    assert doc.encounter.status == "IN_PROGRESS"
    assert doc in patient.documents
    assert doc in encounter.documents
