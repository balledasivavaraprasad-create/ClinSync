"""Document upload, safe storage, and status routes."""

from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.document import DocumentStatusResponse, DocumentUploadRequest
from app.services.document_service import DocumentService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter(tags=["Documents"])


@router.post(
    "/encounters/{encounter_id}/documents",
    response_model=DocumentStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Register/upload document and trigger extraction",
    operation_id="uploadDocument",
)
def upload_document(
    encounter_id: str,
    req: DocumentUploadRequest,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> DocumentStatusResponse:
    """Accept and store document for encounter, validating types/size and computing checksum."""
    data = DocumentService.upload_document(
        db=db,
        encounter_id=encounter_id,
        req=req,
    )
    return DocumentStatusResponse(data=data, request_id=request_id)


@router.get(
    "/documents/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Read document processing state and extraction result",
    operation_id="getDocumentStatus",
)
def get_document_status(
    document_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
) -> DocumentStatusResponse:
    """Read document processing state and extracted clinical facts."""
    data = DocumentService.get_document_status(db=db, document_id=document_id)
    return DocumentStatusResponse(data=data, request_id=request_id)
