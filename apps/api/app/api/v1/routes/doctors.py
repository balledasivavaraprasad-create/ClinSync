from app.dependencies.auth import require_doctor_scoping
from app.dependencies.db import get_db
from app.dependencies.request_id import get_current_request_id
from app.schemas.doctor import DoctorQueueResponse
from app.services.doctor_service import DoctorService
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/doctors", tags=["Doctor Console"])
doctor_service = DoctorService()


@router.get(
    "/{doctor_id}/queue",
    response_model=DoctorQueueResponse,
    summary="Read authorized doctor encounter queue",
    description="Retrieve patient encounters assigned to doctor or booked.",
)
def get_doctor_queue(
    doctor_id: str,
    db: Session = Depends(get_db),
    request_id: str = Depends(get_current_request_id),
    auth: dict = Depends(require_doctor_scoping),
) -> DoctorQueueResponse:
    """Retrieve encounter queue for doctor."""
    return doctor_service.get_doctor_queue(
        db=db,
        doctor_id=doctor_id,
        request_id=request_id,
    )
