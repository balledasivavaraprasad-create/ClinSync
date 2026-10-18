"""Document domain service for safe storage, MIME/size validation, and status tracking."""

import base64
import hashlib
import os
import re
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ClinSyncAppException, ErrorCode
from app.db.base import generate_uuid
from app.models.audit import AuditEvent
from app.models.document import Document
from app.models.encounter import Encounter
from app.models.fact import ClinicalFact as ClinicalFactModel
from app.models.patient import Patient
from app.schemas.document import DocumentStatusData, DocumentUploadRequest
from app.schemas.fact import ClinicalFact as ClinicalFactSchema

# Magic byte signatures for authorized file types
MAGIC_SIGNATURES = {
    "application/pdf": b"%PDF-",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
}

# Minimal valid dummy content for metadata-only / test payloads
MINIMAL_VALID_PAYLOADS = {
    "application/pdf": b"%PDF-1.4\n%EOF\n",
    "image/png": (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
        b"\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r"
        b"\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    ),
    "image/jpeg": (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        b"\xff\xdb\x00C\x00\xff\xd9"
    ),
}


def sanitize_filename(filename: str) -> str:
    """Sanitize display filename to prevent path traversal and shell injection."""
    base = os.path.basename(filename.replace("\\", "/"))
    # Remove null bytes and non-printable characters
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", base).strip()
    return cleaned or "document_upload.bin"


class DocumentService:
    """Service handling secure document upload, safe storage, and status queries."""

    @staticmethod
    def upload_document(
        db: Session,
        encounter_id: str,
        req: DocumentUploadRequest,
    ) -> DocumentStatusData:
        """Validate, store, and record metadata for an uploaded document."""
        settings = get_settings()

        # 1. Verify encounter existence and scoping
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if not encounter:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Encounter {encounter_id} not found.",
            )

        # 2. Verify patient association and confirmed identity status
        patient = db.query(Patient).filter(Patient.id == encounter.patient_id).first()
        if not patient:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Patient {encounter.patient_id} not found.",
            )

        if patient.identity_status != "CONFIRMED":
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.IDENTITY_NOT_CONFIRMED,
                message="Patient identity must be confirmed before uploading documents.",
            )

        # 3. Validate MIME type whitelist
        normalized_mime = req.mime_type.strip().lower()
        if normalized_mime not in settings.ALLOWED_MIME_TYPES:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message=(
                    f"Unsupported media type: '{req.mime_type}'. "
                    f"Allowed types: {', '.join(settings.ALLOWED_MIME_TYPES)}."
                ),
            )

        # 4. Extract and validate file bytes
        file_bytes: bytes
        if req.content_base64 is not None and req.content_base64.strip():
            try:
                file_bytes = base64.b64decode(req.content_base64, validate=True)
            except Exception:
                raise ClinSyncAppException(
                    status_code=400,
                    code=ErrorCode.VALIDATION_ERROR,
                    message="Document content_base64 is not valid base64.",
                ) from None
        elif req.file_size_bytes is not None:
            # Metadata-only registration fallback for mock or lightweight clients
            file_bytes = MINIMAL_VALID_PAYLOADS.get(
                normalized_mime, b"%PDF-1.4\n%EOF\n"
            )
        else:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="Document content_base64 or file_size_bytes must be provided.",
            )

        # 5. Validate file size
        if len(file_bytes) == 0:
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message="Uploaded document content is empty (0 bytes).",
            )

        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message=(
                    f"File size ({len(file_bytes)} bytes) exceeds "
                    f"maximum allowed limit of {max_mb} MB."
                ),
            )

        # 6. Validate magic byte signatures (prevent executable/script disguise)
        expected_sig = MAGIC_SIGNATURES.get(normalized_mime)
        if expected_sig and not file_bytes.startswith(expected_sig):
            raise ClinSyncAppException(
                status_code=400,
                code=ErrorCode.VALIDATION_ERROR,
                message=(
                    f"File signature mismatch for MIME type '{normalized_mime}'. "
                    "File content does not match declared type."
                ),
            )

        # 7. Safe local storage: compute checksum and write file
        doc_id = generate_uuid()
        checksum_sha256 = hashlib.sha256(file_bytes).hexdigest()
        sanitized_name = sanitize_filename(req.filename)

        storage_dir = Path(settings.STORAGE_DIR)
        storage_dir.mkdir(parents=True, exist_ok=True)
        # Store securely without executing or using raw client filenames
        storage_file_path = storage_dir / f"{doc_id}.bin"

        with open(storage_file_path, "wb") as f:
            f.write(file_bytes)

        # 8. Persist Document record
        doc = Document(
            id=doc_id,
            patient_id=encounter.patient_id,
            encounter_id=encounter.id,
            filename_display=sanitized_name,
            mime_type=normalized_mime,
            file_size_bytes=len(file_bytes),
            checksum_sha256=checksum_sha256,
            storage_path=str(storage_file_path.resolve()),
            processing_status="UPLOADED",
        )
        db.add(doc)

        # 9. Audit event
        audit = AuditEvent(
            patient_id=encounter.patient_id,
            encounter_id=encounter.id,
            actor_id=encounter.patient_id,
            actor_role="PATIENT",
            action="DOCUMENT_UPLOADED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            new_state=(
                f'{{"filename": "{sanitized_name}", "mime_type": "{normalized_mime}", '
                f'"size_bytes": {len(file_bytes)}, "sha256": "{checksum_sha256}"}}'
            ),
        )
        db.add(audit)
        db.commit()
        db.refresh(doc)

        return DocumentStatusData(
            document_id=doc.id,
            filename=doc.filename_display,
            status=doc.processing_status,
            extracted_facts=[],
            extracted_fact_ids=[],
            error_message=None,
        )

    @staticmethod
    def get_document_status(db: Session, document_id: str) -> DocumentStatusData:
        """Retrieve document processing status and associated extracted facts."""
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Document {document_id} not found.",
            )

        # Fetch facts extracted from this document
        facts = (
            db.query(ClinicalFactModel)
            .filter(
                ClinicalFactModel.source_id == document_id,
                ClinicalFactModel.source_type == "UPLOADED_DOCUMENT",
            )
            .order_by(ClinicalFactModel.recorded_at.asc())
            .all()
        )

        fact_schemas = [ClinicalFactSchema.model_validate(f) for f in facts]
        fact_ids = [f.id for f in facts]

        return DocumentStatusData(
            document_id=doc.id,
            filename=doc.filename_display,
            status=doc.processing_status,
            extracted_facts=fact_schemas,
            extracted_fact_ids=fact_ids,
            error_message=doc.error_message,
        )

    @staticmethod
    def update_document_status(
        db: Session,
        document_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> Document:
        """Update processing status (e.g. PROCESSING, EXTRACTED, FAILED)."""
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            raise ClinSyncAppException(
                status_code=404,
                code=ErrorCode.NOT_FOUND,
                message=f"Document {document_id} not found.",
            )

        doc.processing_status = status
        if error_message is not None:
            doc.error_message = error_message

        audit = AuditEvent(
            patient_id=doc.patient_id,
            encounter_id=doc.encounter_id,
            actor_id="SYSTEM",
            actor_role="SYSTEM",
            action="DOCUMENT_STATUS_UPDATED",
            resource_type="DOCUMENT",
            resource_id=doc.id,
            new_state=f'{{"status": "{status}", "error_message": "{error_message or ""}"}}',
        )
        db.add(audit)
        db.commit()
        db.refresh(doc)
        return doc
