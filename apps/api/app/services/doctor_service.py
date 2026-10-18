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
    DoctorBriefCitation,
    DoctorBriefData,
    DoctorBriefResponse,
    DoctorQueueData,
    DoctorQueueItem,
    DoctorQueueResponse,
)
from app.schemas.encounter import Encounter as EncounterSchema

# Map doctor IDs and common aliases to primary departments
DOCTOR_DEPARTMENT_MAP = {
    "dr_clara_chen": "dept_cardiology",
    "dr_chen": "dept_cardiology",
    "dr_marcus_vance": "dept_internal_med",
    "dr_vance": "dept_internal_med",
    "dr_elena_rostova": "dept_neurology",
    "dr_rostova": "dept_neurology",
    "dr_james_wilson": "dept_orthopedics",
    "dr_wilson": "dept_orthopedics",
    "dr_amita_patel": "dept_pulmonology",
    "dr_patel": "dept_pulmonology",
    "dr_robert_lang": "dept_ent",
    "dr_lang": "dept_ent",
    "dr_sophia_martinez": "dept_dermatology",
    "dr_martinez": "dept_dermatology",
    "dr_alex_rivera": "dept_general_practice",
    "dr_rivera": "dept_general_practice",
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

        # Sort queue by priority: URGENT -> ELEVATED -> ROUTINE
        priority_rank = {"URGENT": 0, "ELEVATED": 1, "ROUTINE": 2}
        queue_items.sort(key=lambda item: priority_rank.get(item.priority, 3))

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

        corrections: list[dict[str, str]] = []

        if payload.approved:
            # Transition encounter status
            encounter.status = "DOCTOR_REVIEWED"

            # Update associated facts to doctor_confirmed status
            for fact in encounter.facts:
                if fact.status in ["reported", "extracted_unverified"]:
                    fact.status = "doctor_confirmed"
                    fact.reviewed_by = doctor_id

            # Apply any specific corrected fact IDs
            if payload.corrected_fact_ids:
                for fact in encounter.facts:
                    if fact.id in payload.corrected_fact_ids:
                        fact.status = "doctor_confirmed"
                        fact.reviewed_by = doctor_id
                        corrections.append({"fact_id": fact.id, "action": "confirmed"})

            # Apply any corrected facts if supplied
            if payload.corrected_facts:
                for corr in payload.corrected_facts:
                    for fact in encounter.facts:
                        if fact.id == corr.id or fact.concept == corr.concept:
                            fact.value = corr.value
                            fact.status = "doctor_confirmed"
                            fact.reviewed_by = doctor_id
                            corrections.append({
                                "fact_id": fact.id,
                                "concept": fact.concept,
                                "new_value": str(corr.value),
                            })

        # Record append-only audit event with doctor ID, timestamp, and corrections
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
                "corrections": corrections,
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
                approval_status="RECORDED",
            ),
            request_id=request_id,
        )

    def get_doctor_brief(
        self,
        db: Session,
        encounter_id: str,
        request_id: str = "req_unknown",
    ) -> DoctorBriefResponse:
        """Synthesize evidence-backed clinical brief from authoritative ledger facts."""
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
                message="Patient identity must be confirmed before retrieving clinical brief.",
            )

        patient_name = encounter.patient.display_name or "Unknown Patient"
        facts = encounter.facts or []

        # Extract chief complaint
        chief_complaint = "Routine clinical review"
        for fact in facts:
            if "complaint" in fact.concept.lower() or fact.fact_type == "symptom":
                chief_complaint = f"{fact.concept}: {fact.value}"
                break

        # Synthesize concise clinical summary
        symptoms = [f"{f.concept} ({f.value})" for f in facts if f.fact_type == "symptom"]
        vitals = [f"{f.concept}: {f.value}" for f in facts if f.fact_type == "investigation"]
        meds = [f.value for f in facts if f.fact_type == "medication"]
        allergies = [f.value for f in facts if f.fact_type == "allergy"]

        summary_parts = [f"Patient {patient_name} presented for evaluation of {chief_complaint}."]
        if symptoms:
            summary_parts.append(f"Reported symptoms include: {', '.join(symptoms)}.")
        if vitals:
            summary_parts.append(f"Clinical measurements: {', '.join(vitals)}.")
        if meds:
            summary_parts.append(f"Current medications: {', '.join(meds)}.")
        if allergies:
            summary_parts.append(f"Documented allergies: {', '.join(allergies)}.")

        summary_text = " ".join(summary_parts)

        # Build citations linking back to facts and sources
        citations: list[DoctorBriefCitation] = []
        for idx, fact in enumerate(facts):
            citations.append(
                DoctorBriefCitation(
                    citation_id=f"cite_{fact.id[:8] if fact.id else idx}",
                    fact_id=fact.id,
                    source_id=fact.source_id or f"source_{encounter.id[:8]}",
                    source_type=fact.source_type or "PATIENT_FORM",
                    text_snippet=f"{fact.concept}: {fact.value}",
                )
            )

        # Extract unresolved questions
        unresolved: list[str] = []
        for fact in facts:
            if fact.status == "conflicting":
                unresolved.append(f"Resolve conflicting evidence for {fact.concept}.")
            elif fact.status == "uncertain":
                unresolved.append(f"Verify uncertain finding for {fact.concept}.")

        if not unresolved and not facts:
            unresolved.append("Conduct comprehensive intake history and baseline vitals.")

        return DoctorBriefResponse(
            data=DoctorBriefData(
                encounter_id=encounter.id,
                patient_name=patient_name,
                chief_complaint=chief_complaint,
                clinical_summary=summary_text,
                summary_text=summary_text,
                citations=citations,
                unresolved_questions=unresolved,
                audio_status="PENDING",
                audio_url=None,
                audio_brief_available=False,
                audio_brief_url=None,
            ),
            request_id=request_id,
        )
