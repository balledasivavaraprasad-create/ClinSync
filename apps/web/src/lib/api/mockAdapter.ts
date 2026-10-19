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
  DoctorQueueItem,
  Citation,
  PatientProfile,
  PatientProfileResponse,
  MedicalTimelineItem,
  PatientDocumentItem,
  PatientConsentStatus,
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

// In-memory patient profiles store
const inMemoryPatientProfiles: Record<string, PatientProfile> = {
  pat_synth_001: {
    id: 'pat_synth_001',
    display_name: 'Eleanor Johnson',
    date_of_birth: '1982-05-12',
    calculated_age: 44,
    contact_number: '(555) 382-4921',
    email: 'eleanor.johnson@example.org',
    address: '742 Evergreen Terrace, Springfield, OR',
    hospital_id: 'MRN-EJ-829104',
    emergency_contact: {
      name: 'Robert Johnson',
      relationship: 'Spouse',
      phone: '(555) 382-9901',
    },
    preferred_language: 'en-US',
    blood_group: 'A-Positive (A+)',
    insurance_provider: 'Blue Cross Blue Shield — Premier PPO',
    insurance_id: 'BCBS-8829104-A',
  },
  pat_synth_002: {
    id: 'pat_synth_002',
    display_name: 'Marcus Patel',
    date_of_birth: '1968-09-24',
    calculated_age: 58,
    contact_number: '(555) 912-8812',
    email: 'marcus.patel@example.org',
    address: '1204 Pineview Boulevard, Portland, OR',
    hospital_id: 'MRN-MP-680419',
    emergency_contact: {
      name: 'Amina Patel',
      relationship: 'Daughter',
      phone: '(555) 912-4420',
    },
    preferred_language: 'en-US',
    blood_group: 'O-Positive (O+)',
    insurance_provider: 'Aetna Health Advantage — Open Choice',
    insurance_id: 'AET-4910283-02',
  },
};

const inMemoryPatientDocuments: Record<string, PatientDocumentItem[]> = {
  pat_synth_001: [
    {
      id: 'doc_synth_rx_01',
      title: 'Active Prescription — Lisinopril 10mg',
      filename: 'St_Jude_Pharmacy_Lisinopril_Refill.pdf',
      category: 'prescription',
      date: '2026-10-18T08:20:00Z',
      status: 'VERIFIED',
      file_size_bytes: 420800,
      extracted_fact_ids: ['fact_003'],
      department: 'Cardiology',
      uploaded_by: 'Patient Mobile Upload',
    },
    {
      id: 'doc_synth_ecg_01',
      title: '12-Lead Ambulatory Electrocardiogram (ECG)',
      filename: 'Cardiac_Telemetry_Strip_LeadII.pdf',
      category: 'imaging',
      date: '2026-10-18T08:35:00Z',
      status: 'EXTRACTED',
      file_size_bytes: 1240000,
      extracted_fact_ids: ['fact_004'],
      department: 'Cardiology & Chest Pain Center',
      uploaded_by: 'Kiosk Station A Device Telemetry',
    },
    {
      id: 'doc_synth_lab_01',
      title: 'Comprehensive Metabolic Panel & Lipid Profile',
      filename: 'Quest_Diagnostics_Metabolic_Panel.pdf',
      category: 'lab_report',
      date: '2026-09-15T14:10:00Z',
      status: 'VERIFIED',
      file_size_bytes: 615000,
      extracted_fact_ids: [],
      department: 'Outpatient Laboratory',
      uploaded_by: 'Hospital EHR Interface',
    },
    {
      id: 'doc_synth_disc_01',
      title: 'Prior Ambulatory Referral & Clinical Summary',
      filename: 'Community_Health_Referral_Note.pdf',
      category: 'discharge_summary',
      date: '2026-10-04T11:00:00Z',
      status: 'EXTRACTED',
      file_size_bytes: 890000,
      extracted_fact_ids: ['fact_005'],
      department: 'General Internal Medicine',
      uploaded_by: 'Referring Physician Dr. Miller',
    },
  ],
  pat_synth_002: [
    {
      id: 'doc_synth_rx_02',
      title: 'Maintenance Prescription — Atorvastatin 20mg',
      filename: 'Metro_Health_Atorvastatin_Rx.pdf',
      category: 'prescription',
      date: '2026-10-18T09:00:00Z',
      status: 'VERIFIED',
      file_size_bytes: 310500,
      extracted_fact_ids: ['fact_006'],
      department: 'Cardiology',
      uploaded_by: 'Hospital EHR Ingestion',
    },
    {
      id: 'doc_synth_lab_02',
      title: 'Hemoglobin A1c and Fasting Glucose Report',
      filename: 'Providence_Lab_A1c_Panel.pdf',
      category: 'lab_report',
      date: '2026-08-20T10:30:00Z',
      status: 'VERIFIED',
      file_size_bytes: 540000,
      extracted_fact_ids: [],
      department: 'Endocrinology & Internal Medicine',
      uploaded_by: 'EHR Clinical Archive',
    },
  ],
};

const inMemoryPatientConsents: Record<string, PatientConsentStatus> = {
  pat_synth_001: {
    automated_intake_consent: true,
    ehr_sharing_consent: true,
    ai_triage_processing_consent: true,
    last_updated: '2026-10-18T08:00:00Z',
    audited_by: 'system_security_enclave',
  },
  pat_synth_002: {
    automated_intake_consent: true,
    ehr_sharing_consent: true,
    ai_triage_processing_consent: true,
    last_updated: '2026-10-18T09:00:00Z',
    audited_by: 'system_security_enclave',
  },
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
      'Good morning, Doctor. This is the sixty-second clinical intake synthesis for Eleanor Johnson, a forty-four-year-old female presenting to outpatient triage with subacute retrosternal chest tightness progressing over the past three days. The patient describes a persistent central pressure sensation without acute radiation to the left arm or jaw, worsening primarily with moderate exertion. Baseline triage vitals demonstrate an elevated blood pressure of 142/88 mmHg, a regular heart rate of 76 beats per minute, respiratory rate of 16, and oxygen saturation stable at 98% on ambient room air. Her current active medications include Lisinopril 10mg once daily for essential hypertension, and she has a documented severe allergy to Penicillin resulting in hives and angioedema. Of critical clinical note, an explicit timeline discrepancy was identified between the external community clinic referral citing two weeks and her direct oral statement of three days. The patient remains hemodynamically stable, ambulatory, and prepared for your targeted examination.';
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

  const audioUrl =
    encounterId === 'enc_demo_001'
      ? '/audio/brief_eleanor_60s.mp3'
      : encounterId === 'enc_demo_002'
      ? '/audio/brief_marcus_60s.mp3'
      : '/audio/brief_new_patient_60s.mp3';

  return {
    encounter_id: encounterId,
    patient_name: patientName,
    chief_complaint: chiefComplaint,
    clinical_summary: clinicalSummary,
    citations: citations.length > 0 ? citations : mockCitations,
    unresolved_questions: unresolved,
    audio_brief_available: true,
    audio_brief_url: audioUrl,
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
    const facts = inMemoryEncounterFacts[encounterId] || [];
    const factText = facts.map((f) => `${f.concept} ${f.value || ''}`).join(' ').toLowerCase();

    let decision: 'ROUTINE_SCHEDULING' | 'HUMAN_REVIEW' | 'URGENT_ESCALATION' | 'UNABLE_TO_DETERMINE' =
      'ROUTINE_SCHEDULING';
    let reasonCodes = ['CARDIOLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
    let recDept: string | null = 'dept_cardiology';

    if (
      encounterId.includes('urgent') ||
      encounterId.includes('emerg') ||
      factText.includes('severe chest pain') ||
      factText.includes('crushing')
    ) {
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
    } else if (
      factText.includes('chest') ||
      factText.includes('heart') ||
      factText.includes('palpitation') ||
      factText.includes('cardio')
    ) {
      decision = 'ROUTINE_SCHEDULING';
      reasonCodes = ['CARDIOLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
      recDept = 'dept_cardiology';
    } else if (
      factText.includes('headache') ||
      factText.includes('migraine') ||
      factText.includes('dizz') ||
      factText.includes('numbness')
    ) {
      decision = 'ROUTINE_SCHEDULING';
      reasonCodes = ['NEUROLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
      recDept = 'dept_neurology';
    } else if (
      factText.includes('joint') ||
      factText.includes('knee') ||
      factText.includes('bone') ||
      factText.includes('sprain') ||
      factText.includes('ankle') ||
      factText.includes('back pain')
    ) {
      decision = 'ROUTINE_SCHEDULING';
      reasonCodes = ['ORTHOPEDICS_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
      recDept = 'dept_orthopedics';
    } else if (
      factText.includes('cough') ||
      factText.includes('fever') ||
      factText.includes('body ache') ||
      factText.includes('cold') ||
      factText.includes('throat') ||
      factText.includes('stomach') ||
      factText.includes('fatigue')
    ) {
      decision = 'ROUTINE_SCHEDULING';
      reasonCodes = ['INTERNAL_MED_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
      recDept = 'dept_internal_med';
    } else {
      // Default baseline routing (e.g. for enc_demo_001)
      decision = 'ROUTINE_SCHEDULING';
      reasonCodes = ['CARDIOLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'];
      recDept = 'dept_cardiology';
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

  registerNewPatientEncounter(
    patientId: string,
    patientName: string,
    encounterId: string,
    triageNote?: string
  ) {
    const existing = inMemoryDoctorQueue.find((q) => q.encounter_id === encounterId);
    if (!existing) {
      inMemoryDoctorQueue.unshift({
        encounter_id: encounterId,
        patient_id: patientId,
        patient_name: patientName,
        appointment_time: 'Now (Just Registered)',
        department: 'Triage / General Medicine',
        priority: 'ELEVATED',
        triage_note:
          triageNote ||
          'Newly registered patient intake completed at Kiosk Station A. 60s consultation brief synthesized.',
        status: 'PENDING_REVIEW',
      });
    }
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
            'Good morning, Doctor. Here is the scheduled consultation handoff for Marcus Patel, a fifty-two-year-old male attending his routine six-month cardiovascular and metabolic follow-up. The patient reports feeling generally well with no recurrent chest pressure, orthopnea, palpitations, or decreased exercise tolerance. He continues on daily Atorvastatin twenty milligrams with excellent adherence and reports no muscle aches, cramps, or associated statin adverse effects. Today triage observations demonstrate an optimal resting blood pressure of 118/76 mmHg, a regular resting pulse at 64 beats per minute, and normal oxygenation. A baseline twelve-lead resting electrocardiogram obtained this morning confirms normal sinus rhythm without ischemic changes or conduction delays compared with his prior records. Key pending action items for this encounter include confirming fasting lipid panel review and setting his annual preventive cardiology schedule. Mr. Patel is resting comfortably and ready for your consultation.',
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
            'Confirm annual preventive cardiology follow-up interval.',
          ],
          audio_brief_available: true,
          audio_brief_url: '/audio/brief_marcus_60s.mp3',
        },
        request_id: `req_${Math.random().toString(36).substring(7)}`,
      };
    }

    if (
      encounterId === 'enc_demo_001' &&
      (!inMemoryEncounterFacts[encounterId] ||
        inMemoryEncounterFacts[encounterId].length === mockClinicalFacts.length)
    ) {
      return {
        data: {
          encounter_id: encounterId,
          patient_name: 'Eleanor Johnson (44F)',
          chief_complaint: 'Subacute retrosternal chest tightness with hypertensive trend',
          clinical_summary:
            'Good morning, Doctor. This is the sixty-second clinical intake synthesis for Eleanor Johnson, a forty-four-year-old female presenting to outpatient triage with subacute retrosternal chest tightness progressing over the past three days. The patient describes a persistent central pressure sensation without acute radiation to the left arm or jaw, worsening primarily with moderate exertion. Baseline triage vitals demonstrate an elevated blood pressure of 142/88 mmHg, a regular heart rate of 76 beats per minute, respiratory rate of 16, and oxygen saturation stable at 98% on ambient room air. Her current active medications include Lisinopril 10mg once daily for essential hypertension, and she has a documented severe allergy to Penicillin resulting in hives and angioedema. Of critical clinical note, an explicit timeline discrepancy was identified between the external community clinic referral citing two weeks and her direct oral statement of three days. The patient remains hemodynamically stable, ambulatory, and prepared for your targeted examination.',
          citations: mockCitations,
          unresolved_questions: [
            'Verify true symptom duration (3 days vs 2 weeks).',
            'Confirm last dose of Lisinopril.',
          ],
          audio_brief_available: true,
          audio_brief_url: '/audio/brief_eleanor_60s.mp3',
        },
        request_id: `req_${Math.random().toString(36).substring(7)}`,
      };
    }

    const queuedPatient = inMemoryDoctorQueue.find((q) => q.encounter_id === encounterId);
    const patDisplayName = queuedPatient ? queuedPatient.patient_name : inMemoryEncounterPatients[encounterId]?.patient_name || 'Newly Registered Patient';

    // If dynamic facts exist, synthesize from facts
    if (inMemoryEncounterFacts[encounterId] && inMemoryEncounterFacts[encounterId].length > 0) {
      const briefData = synthesizeBriefFromFacts(encounterId, facts, patDisplayName);
      return {
        data: briefData,
        request_id: `req_${Math.random().toString(36).substring(7)}`,
      };
    }

    // Dynamic / Newly registered encounter brief (Guaranteed 45-60s comprehensive clinical handoff)
    return {
      data: {
        encounter_id: encounterId,
        patient_name: patDisplayName,
        chief_complaint: queuedPatient?.triage_note || 'Recent symptom onset with ambulatory triage presentation',
        clinical_summary:
          `Good morning, Doctor. Here is the newly registered consultation handoff for ${patDisplayName}, who just completed intake at Kiosk Station A. The patient registered as a new outpatient presentation, completing identity verification and preliminary symptom screening. They report onset of symptoms over the past forty-eight hours, noting moderate localized discomfort rated at four out of ten on the clinical numeric scale. Vital signs captured at the triage kiosk indicate stable hemodynamics with regular pulse and oxygenation within normal parameters. During intake dialogue, the patient provided detailed symptom characteristics and confirmed no acute red-flag respiratory distress. Their medication history and known sensitivities have been documented in the digital ledger for reconciliation against prior records. The complete clinical context ledger, evidence citations, and differential considerations have been compiled and are awaiting your review and physician sign-off in exam room two.`,
        citations: mockCitations,
        unresolved_questions: [
          'Review documented symptom onset and progression timeline.',
          'Confirm prescription medications and OTC supplements.',
        ],
        audio_brief_available: true,
        audio_brief_url: '/audio/brief_new_patient_60s.mp3',
      },
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

  // 16. Patient Profile & Records APIs
  async getPatientProfile(patientId: string): Promise<PatientProfileResponse> {
    let profile = inMemoryPatientProfiles[patientId];
    if (!profile) {
      // Fallback or dynamically registered profile
      profile = {
        id: patientId,
        display_name: patientId === 'pat_synth_002' ? 'Marcus Patel' : 'Eleanor Johnson',
        date_of_birth: '1982-05-12',
        calculated_age: 44,
        contact_number: '(555) 382-4921',
        email: 'patient@clinsync.health',
        address: '742 Evergreen Terrace, Springfield, OR',
        hospital_id: `MRN-${patientId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
        emergency_contact: {
          name: 'Robert Johnson',
          relationship: 'Spouse',
          phone: '(555) 382-9901',
        },
        preferred_language: 'en-US',
        blood_group: 'A-Positive (A+)',
        insurance_provider: 'Blue Cross Blue Shield — Premier PPO',
        insurance_id: 'BCBS-8829104-A',
      };
      inMemoryPatientProfiles[patientId] = profile;
    }

    const contextRes = await this.getPatientContext(patientId);
    const documents = inMemoryPatientDocuments[patientId] || inMemoryPatientDocuments['pat_synth_001'] || [];
    const consent = inMemoryPatientConsents[patientId] || {
      automated_intake_consent: true,
      ehr_sharing_consent: true,
      ai_triage_processing_consent: true,
      last_updated: '2026-10-18T08:00:00Z',
      audited_by: 'system_security_enclave',
    };

    // Synthesize chronological medical history timeline from facts and documents
    const timeline: MedicalTimelineItem[] = [
      {
        id: 'tl_01',
        date: '2026-10-18T08:35:00Z',
        category: 'investigation',
        title: 'Diagnostic Vitals Captured',
        description: 'Blood pressure 142/88 mmHg captured via calibrated digital cuff. Verified regular rhythm.',
        source: 'Kiosk Station A Device Telemetry',
        provenance_type: 'clinician_confirmed',
        badge_status: 'doctor_confirmed',
      },
      {
        id: 'tl_02',
        date: '2026-10-18T08:20:00Z',
        category: 'prescription',
        title: 'Prescription Ingestion — Lisinopril 10mg',
        description: 'Daily oral ACE inhibitor prescription record uploaded and extracted via OCR.',
        source: 'Pharmacy Dispense Manifest',
        provenance_type: 'ai_extracted',
        badge_status: 'extracted_unverified',
      },
      {
        id: 'tl_03',
        date: '2026-10-18T08:00:00Z',
        category: 'encounter',
        title: 'Outpatient Triage Consultation',
        description: 'Chief complaint of substernal chest discomfort documented during automated intake.',
        source: 'Conversational Voice Intake',
        provenance_type: 'patient_reported',
        badge_status: 'reported',
      },
      {
        id: 'tl_04',
        date: '2026-10-04T11:00:00Z',
        category: 'document',
        title: 'Primary Care Physician Referral',
        description: 'Referral for cardiac evaluation from Dr. Miller with documented 2-week intermittent symptoms.',
        source: 'Hospital EHR Interface',
        provenance_type: 'clinician_confirmed',
        badge_status: 'historical_recorded',
      },
      {
        id: 'tl_05',
        date: '2021-04-12T10:00:00Z',
        category: 'diagnosis',
        title: 'Severe Penicillin Allergy Registered',
        description: 'Documented systemic reaction (diffuse hives and facial angioedema) in emergency record.',
        source: 'Historical EHR Ingestion',
        provenance_type: 'clinician_confirmed',
        badge_status: 'historical_recorded',
      },
    ];

    return {
      data: {
        profile,
        context: contextRes.data,
        timeline,
        documents,
        consent,
      },
      request_id: `req_${Math.random().toString(36).substring(7)}`,
    };
  },

  async updatePatientProfile(
    patientId: string,
    updates: Partial<PatientProfile>
  ): Promise<PatientProfileResponse> {
    const existing = inMemoryPatientProfiles[patientId] || {
      id: patientId,
      display_name: 'Eleanor Johnson',
      hospital_id: 'MRN-EJ-829104',
      preferred_language: 'en-US',
    };

    // Patient cannot overwrite clinician-verified MRN or system ID
    const merged: PatientProfile = {
      ...existing,
      ...updates,
      id: existing.id,
      hospital_id: existing.hospital_id,
    };

    inMemoryPatientProfiles[patientId] = merged;
    return this.getPatientProfile(patientId);
  },

  async updatePatientConsent(
    patientId: string,
    updates: Partial<PatientConsentStatus>
  ): Promise<PatientConsentStatus> {
    const existing = inMemoryPatientConsents[patientId] || {
      automated_intake_consent: true,
      ehr_sharing_consent: true,
      ai_triage_processing_consent: true,
      last_updated: new Date().toISOString(),
      audited_by: 'system_security_enclave',
    };

    const updated: PatientConsentStatus = {
      ...existing,
      ...updates,
      last_updated: new Date().toISOString(),
      audited_by: 'patient_digital_signature_audit',
    };

    inMemoryPatientConsents[patientId] = updated;
    return updated;
  },

  async getAllPatientProfiles(): Promise<PatientProfile[]> {
    return Object.values(inMemoryPatientProfiles);
  },
};
