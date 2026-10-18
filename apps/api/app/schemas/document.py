"""Document upload and status schemas conforming to OpenAPI contracts."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.fact import ClinicalFact

DocumentStatus = Literal["UPLOADED", "PROCESSING", "EXTRACTED", "FAILED"]


class DocumentUploadRequest(BaseModel):
    """Payload for uploading/registering medical documents."""

    filename: str
    mime_type: str
    content_base64: Optional[str] = None
    file_size_bytes: Optional[int] = None

    model_config = ConfigDict(extra="ignore")


class DocumentStatusData(BaseModel):
    """Document processing status and extracted facts payload."""

    document_id: str
    filename: Optional[str] = None
    status: DocumentStatus
    extracted_facts: list[ClinicalFact] = Field(default_factory=list)
    extracted_fact_ids: list[str] = Field(default_factory=list)
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class DocumentStatusResponse(BaseModel):
    """Standard envelope for document upload and status endpoints."""

    data: DocumentStatusData
    request_id: str
