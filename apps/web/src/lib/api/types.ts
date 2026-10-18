/**
 * TypeScript interfaces strictly mirroring packages/contracts/openapi.json
 */

export type FactType =
  | 'symptom'
  | 'medication'
  | 'allergy'
  | 'condition'
  | 'investigation'
  | 'procedure'
  | 'other';

export type ClinicalFactStatus =
  | 'reported'
  | 'extracted_unverified'
  | 'historical_recorded'
  | 'doctor_confirmed'
  | 'uncertain'
  | 'conflicting'
  | 'rejected';

export interface ClinicalFact {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  concept: string;
  value: string;
  unit: string | null;
  clinical_time: string | null;
  recorded_at: string;
  fact_type: FactType;
  status: ClinicalFactStatus;
  source_type: string;
  source_id: string;
  source_location: string | null;
  extraction_method: string;
  confidence: number | null;
  reviewed_by: string | null;
  supersedes_fact_id: string | null;
}

export interface Encounter {
  id: string;
  patient_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
  started_at: string;
  intake_language: string;
  intake_status:
    | 'COLLECTING'
    | 'DOCUMENTS_PENDING'
    | 'LEDGER_REVIEW'
    | 'ROUTING'
    | 'SCHEDULED'
    | 'ESCALATED';
  identity_confirmation_id: string | null;
  assigned_department_id: string | null;
  appointment_id: string | null;
  created_by: string;
}

export interface CreateEncounterRequest {
  patient_id: string;
  intake_language?: string;
}

export interface EncounterResponse {
  data: Encounter;
  request_id: string;
}

export interface CandidateLookupRequest {
  query?: string;
  biometric_token?: string;
}

export interface IdentityCandidate {
  candidate_id: string;
  masked_name: string;
  dob_year: number;
  contact_hint: string;
}

export interface CandidateLookupResponse {
  data: {
    candidates: IdentityCandidate[];
  };
  request_id: string;
}

export interface IdentityConfirmRequest {
  candidate_id: string;
  secondary_auth_type: 'dob_full' | 'otp' | 'manual_staff';
  auth_payload: string;
}

export interface IdentityConfirmResponse {
  data: {
    confirmed: boolean;
    patient_id: string;
    display_name: string;
    identity_status: 'CONFIRMED' | 'REJECTED';
  };
  request_id: string;
}

export interface PatientContextResponse {
  data: {
    patient_id: string;
    display_name: string;
    allergies: ClinicalFact[];
    active_medications: ClinicalFact[];
    recent_conditions: ClinicalFact[];
  };
  request_id: string;
}

export interface IntakeAnswerRequest {
  question_id: string;
  transcription: string;
  input_modality: 'voice' | 'text';
}

export interface IntakeStateResponse {
  data: {
    encounter_id: string;
    current_step: number;
    total_steps: number;
    next_question: {
      id: string;
      text: string;
      category: string;
    } | null;
    extracted_facts_this_turn: ClinicalFact[];
    intake_complete: boolean;
  };
  request_id: string;
}

export interface DocumentUploadRequest {
  filename: string;
  mime_type: 'application/pdf' | 'image/png' | 'image/jpeg';
  file_size_bytes: number;
}

export interface DocumentStatusResponse {
  data: {
    document_id: string;
    filename: string;
    status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'FAILED';
    extracted_fact_ids: string[];
    error_message?: string;
  };
  request_id: string;
}

export interface LedgerResponse {
  data: {
    encounter_id: string;
    facts: ClinicalFact[];
  };
  request_id: string;
}

export interface DiffResponse {
  data: {
    encounter_id: string;
    new_facts: ClinicalFact[];
    changed_facts: Array<{
      historical: ClinicalFact;
      current: ClinicalFact;
    }>;
    conflicting_facts: Array<{
      claim_a: ClinicalFact;
      claim_b: ClinicalFact;
      conflict_description: string;
    }>;
    unresolved_count: number;
  };
  request_id: string;
}

export interface DecisionResultResponse {
  data: {
    encounter_id: string;
    decision: 'ROUTINE_SCHEDULING' | 'HUMAN_REVIEW' | 'URGENT_ESCALATION' | 'UNABLE_TO_DETERMINE';
    reason_codes: string[];
    recommended_department_id: string | null;
    policy_version: string;
    evaluated_at: string;
  };
  request_id: string;
}

export interface AppointmentSlot {
  slot_id: string;
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  start_at: string;
  end_at: string;
  available: boolean;
  status?: 'AVAILABLE' | 'HOLD' | 'BOOKED';
}

export interface SlotsResponse {
  data: {
    department_id: string;
    slots: AppointmentSlot[];
  };
  request_id: string;
}

export interface BookingRequest {
  slot_id: string;
  encounter_id: string;
  idempotency_key: string;
}

export interface BookingResponse {
  data: {
    booking_id: string;
    slot_id?: string;
    slot?: AppointmentSlot;
    start_at?: string;
    doctor_id?: string;
    confirmed_at: string;
    status: 'CONFIRMED' | 'FAILED' | string;
  };
  request_id: string;
}

export interface DoctorQueueItem {
  encounter_id: string;
  patient_id: string;
  patient_name: string;
  appointment_time: string;
  department: string;
  priority: 'ROUTINE' | 'ELEVATED' | 'URGENT';
  triage_note: string;
  status: 'PENDING_REVIEW' | 'IN_CONSULTATION' | 'COMPLETED';
}

export interface DoctorQueueResponse {
  data: {
    doctor_id: string;
    queue: DoctorQueueItem[];
  };
  request_id: string;
}

export interface Citation {
  citation_id: string;
  fact_id: string;
  source_type: string;
  source_title: string;
  source_location?: string;
  text_snippet: string;
}

export interface DoctorBriefResponse {
  data: {
    encounter_id: string;
    patient_name: string;
    chief_complaint: string;
    clinical_summary: string;
    citations: Citation[];
    unresolved_questions: string[];
    audio_brief_available: boolean;
    audio_brief_url?: string;
  };
  request_id: string;
}

export interface ApprovalRequest {
  doctor_id: string;
  decision: 'APPROVED' | 'CORRECTIONS_NEEDED' | 'REJECTED';
  doctor_notes: string;
  corrected_fact_ids?: string[];
}

export interface ApprovalResponse {
  data: {
    approval_id: string;
    encounter_id: string;
    recorded_at: string;
    status: 'RECORDED';
  };
  request_id: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  request_id: string;
  field_errors?: Record<string, string[]>;
}
