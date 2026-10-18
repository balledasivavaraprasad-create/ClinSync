"""Doctor workstation queue, clinical consultation notes, and sign-off approval service."""

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.errors import ClinSyncAppException, ErrorCode
from app.db.base import generate_uuid
from app.models.appointment import Appointment, AppointmentSlot
from app.models.audit import AuditEvent
from app.models.encounter import Encounter
from app.schemas.doctor import (
    ApprovalData,
    ApprovalRequest,
    ApprovalResponse,
    DoctorQueueData,
    DoctorQueueItem,
    DoctorQueueResponse,
)
from app.schemas.encounter import Encounter as EncounterSchema

# Map doctor IDs to primary departments
DOCTOR_DEPARTMENT_MAP = {
    "dr_clara_chen": "dept_cardiology",
    "dr_marcus_vance": "dept_internal_med",
    "dr_elena_rostova": "dept_neurology",
    "dr_james_wilson": "dept_orthopedics",
    "dr_amita_patel": "dept_pulmonology",
    "dr_robert_lang": "dept_ent",
    "dr_sophia_martinez": "dept_dermatology",
    "dr_alex_rivera": "dept_general_practice",
}


class DoctorService:
    """Service handling doctor queue reads and clinical review sign-offs."""

    def get_doctor_queue(
        self,
        db: Session,
        doctor_id: str,
        request_id: str = "req_unknown",
    ) -> DoctorQueueResponse:
        """Read authorized doctor encounter queue."""
        doctor_dept = DOCTOR_DEPARTMENT_MAP.get(doctor_id)

        # 1. Query encounters booked with this specific doctor
        booked_encounters_query = (
            db.query(Encounter)
            .join(Appointment, Appointment.encounter_id == Encounter.id)
            .join(AppointmentSlot, AppointmentSlot.slot_id == Appointment.slot_id)
            .filter(AppointmentSlot.doctor_id == doctor_id)
            .options(
                joinedload(Encounter.patient),
                joinedload(Encounter.facts),
                joinedload(Encounter.appointment).joinedload(Appointment.slot),
            )
        )
        booked_encounters = booked_encounters_query.all()

        # 2. Query encounters assigned to the doctor's department
        dept_encounters: list[Encounter] = []
        if doctor_dept:
            dept_encounters = (
                db.query(Encounter)
                .filter(Encounter.assigned_department_id == doctor_dept)
                .options(
                    joinedload(Encounter.patient),
                    joinedload(Encounter.facts),
                    joinedload(Encounter.appointment).joinedload(Appointment.slot),
                )
                .all()
            )

        # Merge and deduplicate maintaining order
        seen_ids = set()
        all_encounters: list[Encounter] = []
        for enc in booked_encounters + dept_encounters:
            if enc.id not in seen_ids:
                seen_ids.add(enc.id)
                all_encounters.append(enc)

        # If no specific matches, fall back to any active encounters for demo general queue
        if not all_encounters:
            all_encounters = (
                db.query(Encounter)
                .options(
                    joinedload(Encounter.patient),
                    joinedload(Encounter.facts),
                    joinedload(Encounter.appointment).joinedload(Appointment.slot),
                )
                .order_by(Encounter.started_at.desc())
                .limit(10)
                .all()
            )

        # Build OpenAPI schema representation
        enc_schemas = [EncounterSchema.model_validate(e) for e in all_encounters]

        # Build Web UI Queue Item representation
        queue_items: list[DoctorQueueItem] = []
        for e in all_encounters:
            patient_name = e.patient.display_name if e.patient else "Unknown Patient"
            
            # Determine appointment time string
            slot_time = "Flexible"
            if e.appointment and e.appointment.slot:
                slot_time = e.appointment.slot.start_at.strftime("%I:%M %p")
            elif e.started_at:
                slot_time = e.started_at.strftime("%I:%M %p")

            # Determine priority based on facts
            has_urgent = any(
                "chest" in (f.value or "").lower() or "breathe" in (f.value or "").lower()
                for f in e.facts
            )
            has_conflict = any(f.status == "conflicting" for f in e.facts)
            priority = "URGENT" if has_urgent else ("ELEVATED" if has_conflict else "ROUTINE")

            # Extract summary note
            triage_note = "Awaiting physician consultation"
            if e.facts:
                triage_note = f"{e.facts[0].concept}: {e.facts[0].value}"

            # Map status
            status_map = {
                "IN_PROGRESS": "PENDING_REVIEW",
                "TRIAGED": "PENDING_REVIEW",
                "BOOKED": "PENDING_REVIEW",
                "DOCTOR_REVIEWED": "IN_CONSULTATION",
                "COMPLETED": "COMPLETED",
            }
            queue_status = status_map.get(e.status, "PENDING_REVIEW")

            queue_items.append(
                DoctorQueueItem(
                    encounter_id=e.id,
                    patient_id=e.patient_id,
                    patient_name=patient_name,
                    appointment_time=slot_time,
                    department=e.assigned_department_id or "General",
                    priority=priority,
                    triage_note=triage_note,
                    status=queue_status,
                )
            )

        return DoctorQueueResponse(
            data=DoctorQueueData(
                doctor_id=doctor_id,
                encounters=enc_schemas,
                queue=queue_items,
            ),
            request_id=request_id,
        )

    def approve_encounter(
        self,
        db: Session,
        encounter_id: str,
        payload: ApprovalRequest,
        request_id: str = "req_unknown",
    ) -> ApprovalResponse:
        """Record doctor clinical review, update facts to DOCTOR_CONFIRMED, and log audit event."""
        encounter = (
            db.query(Encounter)
            .options(
                joinedload(Encounter.patient),
                joinedload(Encounter.facts),
            )
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
                message="Patient identity must be confirmed before recording clinical approval.",
            )

        prev_status = encounter.status
        now = datetime.now(timezone.utc)
        doctor_id = payload.doctor_id or "dr_review"

        if payload.approved:
            # Transition encounter status
            encounter.status = "DOCTOR_REVIEWED"

            # Update associated facts to doctor_confirmed status
            for fact in encounter.facts:
                if fact.status in ["reported", "extracted_unverified"]:
                    fact.status = "doctor_confirmed"
                    fact.reviewed_by = doctor_id

            # Apply any corrected facts if supplied
            if payload.corrected_facts:
                for corr in payload.corrected_facts:
                    for fact in encounter.facts:
                        if fact.id == corr.id or fact.concept == corr.concept:
                            fact.value = corr.value
                            fact.status = "doctor_confirmed"
                            fact.reviewed_by = doctor_id

        # Record append-only audit event
        audit_event = AuditEvent(
            id=generate_uuid(),
            patient_id=encounter.patient_id,
            encounter_id=encounter.id,
            actor_id=doctor_id,
            actor_role="DOCTOR",
            action="DOCTOR_APPROVAL" if payload.approved else "DOCTOR_REJECTION",
            resource_type="ENCOUNTER",
            resource_id=encounter.id,
            previous_state=json.dumps({"status": prev_status}),
            new_state=json.dumps({
                "status": encounter.status,
                "approved": payload.approved,
                "decision": payload.decision,
                "doctor_notes": payload.doctor_notes,
            }),
            timestamp=now,
        )
        db.add(audit_event)

        db.commit()
        db.refresh(encounter)

        approval_id = f"appr_{uuid.uuid4().hex[:12]}"

        return ApprovalResponse(
            data=ApprovalData(
                approval_id=approval_id,
                encounter_id=encounter.id,
                status=encounter.status,
                approved_at=now,
                recorded_at=now,
            ),
            request_id=request_id,
        )
