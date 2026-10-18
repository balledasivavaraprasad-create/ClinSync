import type {
  CreateEncounterRequest,
  EncounterResponse,
  CandidateLookupRequest,
  CandidateLookupResponse,
  IdentityConfirmRequest,
  IdentityConfirmResponse,
  PatientContextResponse,
  IntakeAnswerRequest,
  IntakeStateResponse,
  DocumentUploadRequest,
  DocumentStatusResponse,
  LedgerResponse,
  DiffResponse,
  DecisionResultResponse,
  SlotsResponse,
  BookingRequest,
  BookingResponse,
  DoctorQueueResponse,
  DoctorBriefResponse,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

import {
  mockCandidates,
  mockClinicalFacts,
  mockSlots,
  mockDoctorQueue,
  mockCitations,
} from './mockData';

/**
 * Mock API Adapter
 * Strictly adheres to 15 endpoints in packages/contracts/openapi.json
 */
export const mockApi = {
  // 1. POST /encounters
  async createEncounter(req: CreateEncounterRequest): Promise<EncounterResponse> {
    return {
      data: {
        id: `enc_${Date.now()}`,
        patient_id: req.patient_id,
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        intake_language: req.intake_language || 'en-US',
        intake_status: 'COLLECTING',
        identity_confirmation_id: 'auth_confirm_991',
        assigned_department_id: null,
        appointment_id: null,
        created_by: 'kiosk_station_01',
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 2. POST /identity/candidates
  async lookupCandidates(_req: CandidateLookupRequest): Promise<CandidateLookupResponse> {
    return {
      data: {
        candidates: mockCandidates,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 3. POST /identity/confirm
  async confirmIdentity(req: IdentityConfirmRequest): Promise<IdentityConfirmResponse> {
    const isMatch = req.auth_payload.length >= 4;
    return {
      data: {
        confirmed: isMatch,
        patient_id: isMatch ? 'pat_synth_001' : '',
        display_name: isMatch ? 'Eleanor Johnson' : '',
        identity_status: isMatch ? 'CONFIRMED' : 'REJECTED',
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 4. GET /patients/{patient_id}/context
  async getPatientContext(patientId: string): Promise<PatientContextResponse> {
    return {
      data: {
        patient_id: patientId,
        display_name: 'Eleanor Johnson',
        allergies: mockClinicalFacts.filter((f) => f.fact_type === 'allergy'),
        active_medications: mockClinicalFacts.filter((f) => f.fact_type === 'medication'),
        recent_conditions: mockClinicalFacts.filter((f) => f.fact_type === 'condition'),
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 5. POST /encounters/{encounter_id}/answers
  async submitAnswer(
    encounterId: string,
    req: IntakeAnswerRequest
  ): Promise<IntakeStateResponse> {
    const isLastTurn = req.question_id === 'q_final';
    return {
      data: {
        encounter_id: encounterId,
        current_step: isLastTurn ? 3 : 2,
        total_steps: 3,
        next_question: isLastTurn
          ? null
          : {
              id: 'q_final',
              text: 'Have you experienced any shortness of breath or radiating arm pain?',
              category: 'symptom_localization',
            },
        extracted_facts_this_turn: [mockClinicalFacts[0]],
        intake_complete: isLastTurn,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 6. POST /encounters/{encounter_id}/documents
  async uploadDocument(
    _encounterId: string,
    req: DocumentUploadRequest
  ): Promise<DocumentStatusResponse> {
    return {
      data: {
        document_id: `doc_${Date.now()}`,
        filename: req.filename,
        status: 'PROCESSING',
        extracted_fact_ids: [],
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 7. GET /documents/{document_id}/status
  async getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    return {
      data: {
        document_id: documentId,
        filename: 'Synthetic_Cardiology_Referral.pdf',
        status: 'EXTRACTED',
        extracted_fact_ids: ['fact_003', 'fact_005'],
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 8. GET /encounters/{encounter_id}/ledger
  async getLedger(encounterId: string): Promise<LedgerResponse> {
    return {
      data: {
        encounter_id: encounterId,
        facts: mockClinicalFacts,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 9. GET /encounters/{encounter_id}/diff
  async getDiff(encounterId: string): Promise<DiffResponse> {
    return {
      data: {
        encounter_id: encounterId,
        new_facts: [mockClinicalFacts[0], mockClinicalFacts[2]],
        changed_facts: [
          {
            historical: { ...mockClinicalFacts[3], value: '130/80' },
            current: mockClinicalFacts[3],
          },
        ],
        conflicting_facts: [
          {
            claim_a: mockClinicalFacts[0],
            claim_b: mockClinicalFacts[4],
            conflict_description:
              'Contradictory onset timeline between patient intake statement (3 days) and clinic referral notes (2 weeks).',
          },
        ],
        unresolved_count: 1,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 10. POST /encounters/{encounter_id}/routing-review
  async reviewRouting(encounterId: string): Promise<DecisionResultResponse> {
    let decision: 'ROUTINE_SCHEDULING' | 'HUMAN_REVIEW' | 'URGENT_ESCALATION' | 'UNABLE_TO_DETERMINE' =
      'ROUTINE_SCHEDULING';
    let reasonCodes = ['CARDIOLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
    let recDept: string | null = 'dept_cardiology';

    if (encounterId.includes('urgent') || encounterId.includes('emerg')) {
      decision = 'URGENT_ESCALATION';
      reasonCodes = ['CHEST_PAIN_RED_FLAG', 'HIGH_ACUITY_TRIAGE'];
      recDept = null;
    } else if (encounterId.includes('review') || encounterId.includes('conflict')) {
      decision = 'HUMAN_REVIEW';
      reasonCodes = ['MEDICATION_RECONCILIATION_REQUIRED', 'CONTRADICTORY_TIMELINE'];
      recDept = 'dept_internal_med';
    } else if (encounterId.includes('undetermined')) {
      decision = 'UNABLE_TO_DETERMINE';
      reasonCodes = ['INSUFFICIENT_CLINICAL_SYMPTOMS'];
      recDept = null;
    }

    return {
      data: {
        encounter_id: encounterId,
        decision,
        reason_codes: reasonCodes,
        recommended_department_id: recDept,
        policy_version: '2026.10-demo-policy-v1',
        evaluated_at: new Date().toISOString(),
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 11. GET /appointments/slots
  async getSlots(departmentId: string, date?: string): Promise<SlotsResponse> {
    let slots = departmentId
      ? mockSlots.filter((s) => s.department_id === departmentId)
      : mockSlots;

    if (date) {
      slots = slots.filter((s) => s.start_at.startsWith(date));
    }

    return {
      data: {
        department_id: departmentId || 'all',
        slots,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 12. POST /appointments
  async bookAppointment(req: BookingRequest): Promise<BookingResponse> {
    if (req.idempotency_key === 'simulate_conflict') {
      const err = new Error('IDEMPOTENCY_CONFLICT');
      // @ts-expect-error custom error property
      err.code = 'IDEMPOTENCY_CONFLICT';
      throw err;
    }

    const slot = mockSlots.find((s) => s.slot_id === req.slot_id);
    const isAvailable = slot?.status ? slot.status === 'AVAILABLE' : slot?.available;
    if (!slot || !isAvailable) {
      const err = new Error('SLOT_UNAVAILABLE');
      // @ts-expect-error custom error property
      err.code = 'SLOT_UNAVAILABLE';
      throw err;
    }

    return {
      data: {
        booking_id: `bkg_${Date.now()}`,
        slot_id: slot.slot_id,
        doctor_id: slot.doctor_id,
        start_at: slot.start_at,
        slot: { ...slot, available: false, status: 'BOOKED' },
        confirmed_at: new Date().toISOString(),
        status: 'CONFIRMED',
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 13. GET /doctors/{doctor_id}/queue
  async getDoctorQueue(doctorId: string): Promise<DoctorQueueResponse> {
    return {
      data: {
        doctor_id: doctorId,
        queue: mockDoctorQueue,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 14. GET /encounters/{encounter_id}/brief
  async getDoctorBrief(encounterId: string): Promise<DoctorBriefResponse> {
    return {
      data: {
        encounter_id: encounterId,
        patient_name: 'Eleanor Johnson (44F)',
        chief_complaint: 'Subacute retrosternal chest tightness with hypertensive trend',
        clinical_summary:
          '44-year-old female presenting with 3 days of progressive retrosternal chest tightness. Blood pressure elevated at 142/88. Currently on Lisinopril 10mg daily. Documented severe allergy to Penicillin. Note discrepancy regarding symptom onset timeline between oral statement and external referral.',
        citations: mockCitations,
        unresolved_questions: [
          'Verify true symptom duration (3 days vs 2 weeks).',
          'Confirm last dose of Lisinopril.',
        ],
        audio_brief_available: true,
        audio_brief_url: '/synthetic_audio_brief_demo.mp3',
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 15. POST /encounters/{encounter_id}/approvals
  async submitDoctorApproval(
    encounterId: string,
    _req: ApprovalRequest
  ): Promise<ApprovalResponse> {
    return {
      data: {
        approval_id: `appr_${Date.now()}`,
        encounter_id: encounterId,
        recorded_at: new Date().toISOString(),
        status: 'RECORDED',
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },
};
