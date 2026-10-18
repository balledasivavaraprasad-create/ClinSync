"""Integration tests for safe document upload, validation, storage, and status tracking."""

import base64
import hashlib
from pathlib import Path
from unittest import mock

from app.db.base import generate_uuid
from app.models.audit import AuditEvent
from app.models.document import Document
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact as ClinicalFactModel
from app.models.patient import Patient
from app.services.document_service import DocumentService
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

VALID_PDF_BYTES = b"%PDF-1.4\n%EOF\n"
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
    b"\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r"
    b"\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)
VALID_JPEG_BYTES = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"
)


def _seed_confirmed_encounter(db: Session) -> tuple[Patient, Encounter]:
    """Helper to seed confirmed patient and in-progress encounter."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Confirmed Patient",
        identity_status="CONFIRMED",
    )
    db.add(patient)
    db.commit()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db.add(encounter)
    db.commit()
    db.refresh(patient)
    db.refresh(encounter)
    return patient, encounter


def test_upload_document_valid_pdf_success(client: TestClient, db_session: Session):
    """Uploading a valid PDF returns 202 Accepted, writes file to disk, and computes sha256."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    payload = {
        "filename": "cardiology_referral.pdf",
        "mime_type": "application/pdf",
        "content_base64": b64_content,
    }

    res = client.post(f"/api/v1/encounters/{encounter.id}/documents", json=payload)
    assert res.status_code == 202
    data = res.json()["data"]

    assert data["document_id"] is not None
    assert data["filename"] == "cardiology_referral.pdf"
    assert data["status"] == "UPLOADED"
    assert data["extracted_facts"] == []

    # Check persistence and checksum in database
    doc = db_session.query(Document).filter(Document.id == data["document_id"]).first()
    assert doc is not None
    assert doc.patient_id == encounter.patient_id
    assert doc.encounter_id == encounter.id
    assert doc.mime_type == "application/pdf"
    assert doc.file_size_bytes == len(VALID_PDF_BYTES)
    expected_sha256 = hashlib.sha256(VALID_PDF_BYTES).hexdigest()
    assert doc.checksum_sha256 == expected_sha256

    # Verify physical file on disk matches checksum (immutability)
    disk_file = Path(doc.storage_path)
    assert disk_file.exists()
    assert disk_file.read_bytes() == VALID_PDF_BYTES

    # Verify audit event
    audit = (
        db_session.query(AuditEvent)
        .filter(AuditEvent.resource_id == doc.id, AuditEvent.action == "DOCUMENT_UPLOADED")
        .first()
    )
    assert audit is not None


def test_upload_document_valid_images_png_and_jpeg(client: TestClient, db_session: Session):
    """PNG and JPEG image uploads are accepted with correct signatures."""
    _, encounter = _seed_confirmed_encounter(db_session)

    # PNG upload
    png_b64 = base64.b64encode(VALID_PNG_BYTES).decode("utf-8")
    res_png = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "skin_rash.png",
            "mime_type": "image/png",
            "content_base64": png_b64,
        },
    )
    assert res_png.status_code == 202
    assert res_png.json()["data"]["status"] == "UPLOADED"

    # JPEG upload
    jpeg_b64 = base64.b64encode(VALID_JPEG_BYTES).decode("utf-8")
    res_jpeg = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "xray_sample.jpeg",
            "mime_type": "image/jpeg",
            "content_base64": jpeg_b64,
        },
    )
    assert res_jpeg.status_code == 202
    assert res_jpeg.json()["data"]["status"] == "UPLOADED"


def test_upload_document_path_traversal_sanitized(client: TestClient, db_session: Session):
    """Malicious filename with path traversal is sanitized to base filename."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    payload = {
        "filename": "../../../../../etc/passwd_exploit.pdf",
        "mime_type": "application/pdf",
        "content_base64": b64_content,
    }

    res = client.post(f"/api/v1/encounters/{encounter.id}/documents", json=payload)
    assert res.status_code == 202
    data = res.json()["data"]

    # Traversal stripped
    assert data["filename"] == "passwd_exploit.pdf"
    assert "/" not in data["filename"]
    assert "\\" not in data["filename"]


def test_upload_document_unsupported_mime_type_fails_400(
    client: TestClient, db_session: Session
):
    """Unsupported MIME types (e.g. bash scripts, HTML, webp) return 400 VALIDATION_ERROR."""
    _, encounter = _seed_confirmed_encounter(db_session)

    payload = {
        "filename": "malicious.sh",
        "mime_type": "application/x-sh",
        "content_base64": base64.b64encode(b"#!/bin/bash\necho hack").decode("utf-8"),
    }

    res = client.post(f"/api/v1/encounters/{encounter.id}/documents", json=payload)
    assert res.status_code == 400
    err = res.json()
    assert err["code"] == "VALIDATION_ERROR"
    assert "Unsupported media type" in err["message"]


def test_upload_document_oversized_file_fails_400(client: TestClient, db_session: Session):
    """Files exceeding size limit return 400 VALIDATION_ERROR."""
    _, encounter = _seed_confirmed_encounter(db_session)

    # 11 MB simulated file
    oversized_bytes = b"%PDF-" + b"0" * (11 * 1024 * 1024)
    b64_content = base64.b64encode(oversized_bytes).decode("utf-8")

    res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "huge_scan.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    assert res.status_code == 400
    err = res.json()
    assert err["code"] == "VALIDATION_ERROR"
    assert "exceeds maximum allowed limit" in err["message"]


def test_upload_document_empty_or_corrupt_content_fails_400(
    client: TestClient, db_session: Session
):
    """Empty or corrupt base64 returns 400 VALIDATION_ERROR."""
    _, encounter = _seed_confirmed_encounter(db_session)

    # Corrupt base64
    res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "corrupt.pdf",
            "mime_type": "application/pdf",
            "content_base64": "!!!not_base64!!!",
        },
    )
    assert res.status_code == 400
    assert res.json()["code"] == "VALIDATION_ERROR"


def test_upload_document_spoofed_mime_type_fails_400(client: TestClient, db_session: Session):
    """File claiming to be PDF but containing shell script is rejected by magic bytes check."""
    _, encounter = _seed_confirmed_encounter(db_session)

    fake_pdf = b"#!/usr/bin/env python\nimport os; os.system('ls')"
    res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "disguised.pdf",
            "mime_type": "application/pdf",
            "content_base64": base64.b64encode(fake_pdf).decode("utf-8"),
        },
    )
    assert res.status_code == 400
    err = res.json()
    assert err["code"] == "VALIDATION_ERROR"
    assert "File signature mismatch" in err["message"]


def test_upload_document_nonexistent_encounter_returns_404(client: TestClient):
    """Upload to non-existent encounter returns 404 NOT_FOUND."""
    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    res = client.post(
        "/api/v1/encounters/enc_nonexistent_999/documents",
        json={
            "filename": "report.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_upload_document_unconfirmed_patient_blocked_403(
    client: TestClient, db_session: Session
):
    """Document upload for unconfirmed patient is blocked with 403 IDENTITY_NOT_CONFIRMED."""
    patient = Patient(
        id=generate_uuid(),
        display_name="Unconfirmed Patient",
        identity_status="CANDIDATE",
    )
    db_session.add(patient)
    db_session.commit()

    encounter = Encounter(
        id=generate_uuid(),
        patient_id=patient.id,
        status="IN_PROGRESS",
    )
    db_session.add(encounter)
    db_session.commit()

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "report.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    assert res.status_code == 403
    assert res.json()["code"] == "IDENTITY_NOT_CONFIRMED"


def test_get_document_status_and_lifecycle_updates(
    client: TestClient, db_session: Session
):
    """Document status query tracks states and returns extracted facts."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    upload_res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "lab_results.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    doc_id = upload_res.json()["data"]["document_id"]

    # Initial status is UPLOADED
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.status_code == 200
    data = status_res.json()["data"]
    assert data["status"] == "UPLOADED"
    assert data["extracted_facts"] == []

    # Transition to PROCESSING
    DocumentService.update_document_status(db_session, doc_id, "PROCESSING")
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.json()["data"]["status"] == "PROCESSING"

    # Seed an extracted fact linked to this document
    fact = ClinicalFactModel(
        id=generate_uuid(),
        patient_id=encounter.patient_id,
        encounter_id=encounter.id,
        concept="LDL Cholesterol",
        value="142",
        unit="mg/dL",
        fact_type="investigation",
        status="extracted_unverified",
        source_type="UPLOADED_DOCUMENT",
        source_id=doc_id,
        source_location="page 1, section 2",
        confidence=0.95,
        extraction_method="LlamaIndex_OCR",
    )
    db_session.add(fact)
    db_session.commit()

    # Transition to EXTRACTED
    DocumentService.update_document_status(db_session, doc_id, "EXTRACTED")
    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    data = status_res.json()["data"]
    assert data["status"] == "EXTRACTED"
    assert len(data["extracted_facts"]) == 1
    extracted_fact = data["extracted_facts"][0]
    assert extracted_fact["concept"] == "LDL Cholesterol"
    assert extracted_fact["value"] == "142"
    assert extracted_fact["source_type"] == "UPLOADED_DOCUMENT"
    assert extracted_fact["source_id"] == doc_id
    assert extracted_fact["confidence"] == 0.95


def test_get_document_status_nonexistent_returns_404(client: TestClient):
    """Status query for non-existent document returns 404 NOT_FOUND."""
    res = client.get("/api/v1/documents/doc_nonexistent_123/status")
    assert res.status_code == 404
    assert res.json()["code"] == "NOT_FOUND"


def test_upload_document_wrong_patient_association_fails_403(
    client: TestClient, db_session: Session
):
    """Uploading a document with a mismatched patient_id returns 403 ACCESS_DENIED."""
    patient_a, enc_a = _seed_confirmed_encounter(db_session)
    patient_b = Patient(
        id=generate_uuid(),
        display_name="Other Patient",
        identity_status="CONFIRMED",
    )
    db_session.add(patient_b)
    db_session.commit()

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    res = client.post(
        f"/api/v1/encounters/{enc_a.id}/documents",
        json={
            "filename": "cross_patient.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
            "patient_id": patient_b.id,
        },
    )
    assert res.status_code == 403
    err = res.json()
    assert err["code"] == "ACCESS_DENIED"
    assert "wrong-patient association" in err["message"]


def test_get_document_status_unauthorized_patient_fails_403(
    client: TestClient, db_session: Session
):
    """Reading another patient's document status returns 403 ACCESS_DENIED."""
    _, enc_a = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    upload_res = client.post(
        f"/api/v1/encounters/{enc_a.id}/documents",
        json={
            "filename": "private_scan.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    doc_id = upload_res.json()["data"]["document_id"]

    # Query with wrong patient_id parameter
    wrong_patient_id = generate_uuid()
    res = client.get(f"/api/v1/documents/{doc_id}/status?patient_id={wrong_patient_id}")
    assert res.status_code == 403
    assert res.json()["code"] == "ACCESS_DENIED"


def test_upload_document_storage_write_failure_raises_500(
    client: TestClient, db_session: Session
):
    """Storage write failure cleanly raises 500 INTERNAL_ERROR."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    payload = {
        "filename": "storage_fail.pdf",
        "mime_type": "application/pdf",
        "content_base64": b64_content,
    }

    with mock.patch("builtins.open", side_effect=OSError("Disk write error")):
        res = client.post(f"/api/v1/encounters/{encounter.id}/documents", json=payload)
        assert res.status_code == 500
        assert res.json()["code"] == "INTERNAL_ERROR"
        assert "storage failure" in res.json()["message"].lower()


def test_document_processing_failure_records_error_message(
    client: TestClient, db_session: Session
):
    """Failed document processing persists error message and returns FAILED status."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    upload_res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "unreadable_corrupt.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    doc_id = upload_res.json()["data"]["document_id"]

    # Update status to FAILED with error detail
    DocumentService.update_document_status(
        db_session,
        doc_id,
        "FAILED",
        error_message="OCR extraction pipeline error: corrupted font tables.",
    )

    status_res = client.get(f"/api/v1/documents/{doc_id}/status")
    assert status_res.status_code == 200
    data = status_res.json()["data"]
    assert data["status"] == "FAILED"
    assert "corrupted font tables" in data["error_message"]


def test_source_file_remains_immutable_after_extraction(
    client: TestClient, db_session: Session
):
    """Source file on disk remains unchanged and uncorrupted after extraction."""
    _, encounter = _seed_confirmed_encounter(db_session)

    b64_content = base64.b64encode(VALID_PDF_BYTES).decode("utf-8")
    upload_res = client.post(
        f"/api/v1/encounters/{encounter.id}/documents",
        json={
            "filename": "immutable_source.pdf",
            "mime_type": "application/pdf",
            "content_base64": b64_content,
        },
    )
    doc_id = upload_res.json()["data"]["document_id"]

    doc = db_session.query(Document).filter(Document.id == doc_id).first()
    storage_path = Path(doc.storage_path)
    initial_bytes = storage_path.read_bytes()
    initial_sha = hashlib.sha256(initial_bytes).hexdigest()

    # Link multiple extracted facts
    DocumentService.add_extracted_fact(
        db_session,
        document_id=doc_id,
        concept="Blood Glucose",
        value="110",
        unit="mg/dL",
        fact_type="investigation",
        source_location="page 1",
        confidence=0.97,
    )
    DocumentService.add_extracted_fact(
        db_session,
        document_id=doc_id,
        concept="Hemoglobin A1c",
        value="5.6",
        unit="%",
        fact_type="investigation",
        source_location="page 2",
        confidence=0.99,
    )

    # Re-read physical file on disk: must be 100% byte-for-byte identical
    after_bytes = storage_path.read_bytes()
    after_sha = hashlib.sha256(after_bytes).hexdigest()
    assert after_bytes == initial_bytes
    assert after_sha == initial_sha
    assert after_sha == doc.checksum_sha256
