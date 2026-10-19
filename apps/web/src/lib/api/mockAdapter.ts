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
  ClinicalFact,
} from './types';

import {
  mockCandidates,
  mockClinicalFacts,
  mockMarcusClinicalFacts,
  mockSlots,
  mockDoctorQueue,
  mockCitations,
} from './mockData';

// In-memory stores for dynamic encounter lifecycle and facts
const inMemoryEncounterFacts: Record<string, ClinicalFact[]> = {
  enc_demo_001: [...mockClinicalFacts],
  enc_demo_002: [...mockMarcusClinicalFacts],
};

const inMemoryEncounterPatients: Record<string, { patient_id: string; patient_name: string; department?: string }> = {
  enc_demo_001: { patient_id: 'pat_synth_001', patient_name: 'Eleanor Johnson (44F)', department: 'Cardiology' },
  enc_demo_002: { patient_id: 'pat_synth_002', patient_name: 'Marcus Patel (52M)', department: 'Cardiology' },
};

const inMemoryDoctorQueue: DoctorQueueItem[] = [...mockDoctorQueue];

function synthesizeBriefFromFacts(
  encounterId: string,
  facts: ClinicalFact[],
  overridePatientName?: string
): DoctorBriefResponse['data'] {
  const patientName =
    overridePatientName ||
    inMemoryEncounterPatients[encounterId]?.patient_name ||
    (encounterId === 'enc_demo_002' ? 'Marcus Patel (52M)' : 'Eleanor Johnson (44F)');

  const complaintFact =
    facts.find((f) => f.concept.toLowerCase().includes('complaint')) ||
    facts.find((f) => f.fact_type === 'symptom');
  const chiefComplaint = complaintFact?.value || (
    encounterId === 'enc_demo_001'
      ? 'Subacute retrosternal chest tightness with hypertensive trend'
      : 'Acute symptom evaluation from intake'
  );

  const symptoms = facts
    .filter((f) => f.fact_type === 'symptom')
    .map((f) => `${f.concept}: ${f.value}`);
  const vitals = facts
    .filter((f) => f.fact_type === 'investigation' || f.concept.toLowerCase().includes('pressure') || f.concept.toLowerCase().includes('vital'))
    .map((f) => `${f.concept}: ${f.value}`);
  const meds = facts
    .filter((f) => f.fact_type === 'medication')
    .map((f) => f.value);
  const allergies = facts
    .filter((f) => f.fact_type === 'allergy')
    .map((f) => f.value);
  const conflicts = facts
    .filter((f) => f.status === 'conflicting')
    .map((f) => f.value);

  let clinicalSummary = '';
  if (encounterId === 'enc_demo_001' && facts.length === mockClinicalFacts.length) {
    clinicalSummary =
      '44-year-old female presenting with 3 days of progressive retrosternal chest tightness. Blood pressure elevated at 142/88. Currently on Lisinopril 10mg daily. Documented severe allergy to Penicillin. Note discrepancy regarding symptom onset timeline between oral statement and external referral.';
  } else {
    const parts: string[] = [
      `Clinical brief for ${patientName}. Presenting with chief complaint of ${chiefComplaint}.`,
    ];
    if (symptoms.length > 0) {
      parts.push(`Reported symptoms include: ${symptoms.slice(0, 3).join('; ')}.`);
    }
    if (vitals.length > 0) {
      parts.push(`Documented measurements: ${vitals.join(', ')}.`);
    }
    if (meds.length > 0) {
      parts.push(`Current medications: ${meds.join(', ')}.`);
    }
    if (allergies.length > 0) {
      parts.push(`Documented allergies: ${allergies.join(', ')}.`);
    }
    if (conflicts.length > 0) {
      parts.push(`Safety Alert: ${conflicts.join('; ')}.`);
    } else {
      parts.push('No acute contraindications or active medication conflicts detected.');
    }
    parts.push('All facts grounded with bidirectional Context Ledger citations.');
    clinicalSummary = parts.join(' ');
  }

  const citations: Citation[] =
    encounterId === 'enc_demo_001' && facts.length === mockClinicalFacts.length
      ? mockCitations
      : facts.slice(0, 4).map((f, idx) => ({
          citation_id: f.id === 'fact_001' ? 'cite_01' : f.id === 'fact_003' ? 'cite_02' : `cite_${f.id || idx}`,
          fact_id: f.id,
          source_type: f.source_type ? f.source_type.replace(/_/g, ' ') : 'Patient Intake',
          source_title: f.source_id ? `Source [${f.source_id}]` : 'Intake Dialogue Turn',
          source_location: f.source_location || 'Kiosk Audio Turn',
          text_snippet: `"${f.concept}: ${f.value}"`,
        }));

  const unresolved: string[] = [];
  if (conflicts.length > 0) {
    unresolved.push(`Resolve clinical contradiction: ${conflicts[0]}`);
  }
  if (facts.some((f) => f.status === 'uncertain')) {
    unresolved.push('Verify uncertain findings during physical examination.');
  }
  if (encounterId === 'enc_demo_001' && facts.length === mockClinicalFacts.length) {
    unresolved.push('Verify true symptom duration (3 days vs 2 weeks).');
    unresolved.push('Confirm last dose of Lisinopril.');
  } else if (unresolved.length === 0) {
    unresolved.push('Verify reported symptoms and clinical history with patient.');
  }

  return {
    encounter_id: encounterId,
    patient_name: patientName,
    chief_complaint: chiefComplaint,
    clinical_summary: clinicalSummary,
    citations: citations.length > 0 ? citations : mockCitations,
    unresolved_questions: unresolved,
    audio_brief_available: true,
    audio_brief_url: '/synthetic_audio_brief.mp3',
  };
}

/**
 * Mock API Adapter
 * Strictly adheres to 15 endpoints in packages/contracts/openapi.json
 */
export const mockApi = {
  // 1. POST /encounters
  async createEncounter(req: CreateEncounterRequest): Promise<EncounterResponse> {
    const encId = `enc_${Date.now()}`;
    inMemoryEncounterFacts[encId] = [];
    inMemoryEncounterPatients[encId] = {
      patient_id: req.patient_id,
      patient_name: req.patient_id === 'pat_synth_002' ? 'Marcus Patel (52M)' : 'Eleanor Johnson (44F)',
    };

    return {
      data: {
        id: encId,
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
    const isLastTurn = req.question_id === 'q_final' || req.question_id === 'q5_allergies';

    let concept = 'Reported Symptom';
    let factType: ClinicalFact['fact_type'] = 'symptom';
    let unit: string | null = null;

    if (req.question_id?.includes('complaint')) {
      concept = 'Chief Complaint';
      factType = 'symptom';
    } else if (req.question_id?.includes('duration')) {
      concept = 'Symptom Duration';
      factType = 'symptom';
    } else if (req.question_id?.includes('pain')) {
      concept = 'Discomfort Rating';
      factType = 'symptom';
      unit = 'pain_scale_10';
    } else if (req.question_id?.includes('med')) {
      concept = 'Current Medication';
      factType = 'medication';
    } else if (req.question_id?.includes('allerg')) {
      concept = 'Reported Allergy';
      factType = 'allergy';
    }

    const dynamicFact: ClinicalFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      patient_id: 'pat_synth_001',
      encounter_id: encounterId,
      concept,
      value: req.transcription,
      unit,
      clinical_time: 'reported now',
      recorded_at: new Date().toISOString(),
      fact_type: factType,
      status: 'reported',
      source_type: req.input_modality === 'voice' ? 'patient_voice_kiosk' : 'patient_intake_utterance',
      source_id: `turn_${Date.now()}`,
      source_location: 'kiosk_voice_audio',
      extraction_method: 'automated_llm',
      confidence: 0.98,
      reviewed_by: null,
      supersedes_fact_id: null,
    };

    if (!inMemoryEncounterFacts[encounterId]) {
      inMemoryEncounterFacts[encounterId] = [];
    }
    inMemoryEncounterFacts[encounterId].push(dynamicFact);

    // Update or insert queue item so Doctor console can see it
    const existingQueueItem = inMemoryDoctorQueue.find((q) => q.encounter_id === encounterId);
    if (!existingQueueItem) {
      const patientInfo = inMemoryEncounterPatients[encounterId];
      inMemoryDoctorQueue.push({
        encounter_id: encounterId,
        patient_id: patientInfo?.patient_id || 'pat_synth_001',
        patient_name: patientInfo?.patient_name || 'Eleanor Johnson',
        appointment_time: 'Just now',
        department: patientInfo?.department || 'Cardiology',
        priority: req.transcription.toLowerCase().includes('chest') || req.transcription.toLowerCase().includes('breath') ? 'ELEVATED' : 'ROUTINE',
        triage_note: `${concept}: ${req.transcription}`,
        status: 'PENDING_REVIEW',
      });
    } else if (concept === 'Chief Complaint') {
      existingQueueItem.triage_note = `Chief Complaint: ${req.transcription}`;
    }

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
        extracted_facts_this_turn: [dynamicFact],
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
    const facts =
      inMemoryEncounterFacts[encounterId] ||
      (encounterId === 'enc_demo_002' ? mockMarcusClinicalFacts : mockClinicalFacts);

    return {
      data: {
        encounter_id: encounterId,
        facts,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 9. GET /encounters/{encounter_id}/diff
  async getDiff(encounterId: string): Promise<DiffResponse> {
    if (encounterId === 'enc_demo_002') {
      return {
        data: {
          encounter_id: encounterId,
          new_facts: [mockMarcusClinicalFacts[0]],
          changed_facts: [],
          conflicting_facts: [],
          unresolved_count: 0,
        },
        request_id: `req_${Math.random().toString(36).substring(7)}`,
      };
    }

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
        queue: inMemoryDoctorQueue,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // 14. GET /encounters/{encounter_id}/brief
  async getDoctorBrief(encounterId: string): Promise<DoctorBriefResponse> {
    const facts =
      inMemoryEncounterFacts[encounterId] ||
      (encounterId === 'enc_demo_002' ? mockMarcusClinicalFacts : mockClinicalFacts);

    if (
      encounterId === 'enc_demo_002' &&
      (!inMemoryEncounterFacts[encounterId] ||
        inMemoryEncounterFacts[encounterId].length === mockMarcusClinicalFacts.length)
    ) {
      return {
        data: {
          encounter_id: encounterId,
          patient_name: 'Marcus Patel (52M)',
          chief_complaint: 'Routine 6-month lipid review with stable baseline ECG',
          clinical_summary:
            '52-year-old male presenting for scheduled 6-month cardiovascular and lipid follow-up. Blood pressure optimal at 118/76. Baseline 12-lead ECG confirmed normal sinus rhythm without ischemic changes. Current Atorvastatin 20mg daily tolerated without myalgias.',
          citations: [
            {
              citation_id: 'cite_m01',
              fact_id: 'fact_006',
              source_type: 'Electronic Health Record',
              source_title: 'Annual Cardiology Progress Note.pdf',
              source_location: 'Page 2, Section Assessment',
              text_snippet:
                'Cardiovascular examination unremarkable. Normal heart sounds S1/S2, no murmurs or peripheral edema.',
            },
          ],
          unresolved_questions: [
            'Confirm fasting lipid panel collection prior to visit.',
          ],
          audio_brief_available: true,
          audio_brief_url: '/synthetic_audio_brief.mp3',
        },
        request_id: `req_${Math.random().toString(36).substring(7)}`,
      };
    }

    const briefData = synthesizeBriefFromFacts(encounterId, facts);
    return {
      data: briefData,
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  // Dynamic Brief Generation endpoint
  async generateDoctorBrief(encounterId: string): Promise<DoctorBriefResponse> {
    return this.getDoctorBrief(encounterId);
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
