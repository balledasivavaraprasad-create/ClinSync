import { describe, it, expect } from 'vitest';
import { mockApi } from '../lib/api/mockAdapter';

describe('OpenAPI 3.1.0 Mock API Adapter Conformance (15 Endpoints)', () => {
  it('1. POST /encounters creates an encounter with valid schema and request_id', async () => {
    const res = await mockApi.createEncounter({ patient_id: 'pat_test_01', intake_language: 'en-US' });
    expect(res.data).toBeDefined();
    expect(res.data.id).toMatch(/^enc_/);
    expect(res.data.patient_id).toBe('pat_test_01');
    expect(res.data.status).toBe('IN_PROGRESS');
    expect(res.request_id).toMatch(/^req_/);
  });

  it('2. POST /identity/candidates returns masked candidates without medical history', async () => {
    const res = await mockApi.lookupCandidates({ query: 'Johnson' });
    expect(res.data.candidates.length).toBeGreaterThan(0);
    const candidate = res.data.candidates[0];
    expect(candidate.masked_name).toContain('***');
    expect(candidate.contact_hint).toBeDefined();
    // Medical records must never be leaked here
    expect((candidate as unknown as Record<string, unknown>).medical_history).toBeUndefined();
  });

  it('3. POST /identity/confirm validates secondary authentication payload', async () => {
    const passRes = await mockApi.confirmIdentity({
      candidate_id: 'cand_demo_001',
      secondary_auth_type: 'dob_full',
      auth_payload: '1982',
    });
    expect(passRes.data.confirmed).toBe(true);
    expect(passRes.data.identity_status).toBe('CONFIRMED');

    const failRes = await mockApi.confirmIdentity({
      candidate_id: 'cand_demo_001',
      secondary_auth_type: 'dob_full',
      auth_payload: '1',
    });
    expect(failRes.data.confirmed).toBe(false);
    expect(failRes.data.identity_status).toBe('REJECTED');
  });

  it('4. GET /patients/{id}/context returns authorized allergies and medications', async () => {
    const res = await mockApi.getPatientContext('pat_synth_001');
    expect(res.data.patient_id).toBe('pat_synth_001');
    expect(res.data.allergies.length).toBeGreaterThan(0);
    expect(res.data.active_medications.length).toBeGreaterThan(0);
  });

  it('5. POST /encounters/{id}/answers advances turn and returns extracted facts', async () => {
    const res = await mockApi.submitAnswer('enc_demo_001', {
      question_id: 'q1',
      transcription: 'Chest tightness for 3 days',
      input_modality: 'voice',
    });
    expect(res.data.encounter_id).toBe('enc_demo_001');
    expect(res.data.current_step).toBe(2);
    expect(res.data.extracted_facts_this_turn.length).toBeGreaterThan(0);
  });

  it('6. POST /encounters/{id}/documents registers document and returns processing state', async () => {
    const res = await mockApi.uploadDocument('enc_demo_001', {
      filename: 'Lab_Report.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 250000,
    });
    expect(res.data.document_id).toMatch(/^doc_/);
    expect(res.data.status).toBe('PROCESSING');
  });

  it('7. GET /documents/{id}/status returns extracted fact references', async () => {
    const res = await mockApi.getDocumentStatus('doc_demo_001');
    expect(res.data.status).toBe('EXTRACTED');
    expect(res.data.extracted_fact_ids.length).toBeGreaterThan(0);
  });

  it('8. GET /encounters/{id}/ledger returns facts preserving provenance and status', async () => {
    const res = await mockApi.getLedger('enc_demo_001');
    expect(res.data.facts.length).toBeGreaterThan(0);
    const fact = res.data.facts[0];
    expect(fact.id).toBeDefined();
    expect(fact.concept).toBeDefined();
    expect(fact.status).toBeDefined();
    expect(fact.source_type).toBeDefined();
  });

  it('9. GET /encounters/{id}/diff highlights new, changed, and conflicting clinical facts', async () => {
    const res = await mockApi.getDiff('enc_demo_001');
    expect(res.data.new_facts.length).toBeGreaterThan(0);
    expect(res.data.changed_facts.length).toBeGreaterThan(0);
    expect(res.data.conflicting_facts.length).toBeGreaterThan(0);
    expect(res.data.conflicting_facts[0].conflict_description).toBeDefined();
    expect(res.data.unresolved_count).toBe(1);
  });

  it('10. POST /encounters/{id}/routing-review returns deterministic decision and reasons', async () => {
    const res = await mockApi.reviewRouting('enc_demo_001');
    expect(res.data.decision).toBe('ROUTINE_SCHEDULING');
    expect(res.data.recommended_department_id).toBe('dept_cardiology');
    expect(res.data.reason_codes).toContain('CARDIOLOGY_SYMPTOM_MATCH');
  });

  it('11. GET /appointments/slots returns available and unavailable slots', async () => {
    const res = await mockApi.getSlots('dept_cardiology');
    expect(res.data.slots.length).toBeGreaterThan(0);
    const availableSlot = res.data.slots.find((s) => s.available);
    expect(availableSlot).toBeDefined();
  });

  it('12. POST /appointments books slot atomically and rejects unavailable slot', async () => {
    const successRes = await mockApi.bookAppointment({
      slot_id: 'slot_cardio_101',
      encounter_id: 'enc_demo_001',
      idempotency_key: 'idem_key_001',
    });
    expect(successRes.data.status).toBe('CONFIRMED');
    expect(successRes.data.booking_id).toMatch(/^bkg_/);

    await expect(
      mockApi.bookAppointment({
        slot_id: 'slot_internal_201', // seeded as unavailable
        encounter_id: 'enc_demo_001',
        idempotency_key: 'idem_key_002',
      })
    ).rejects.toThrow('SLOT_UNAVAILABLE');
  });

  it('13. GET /doctors/{id}/queue returns prioritized queue entries', async () => {
    const res = await mockApi.getDoctorQueue('dr_chen');
    expect(res.data.queue.length).toBeGreaterThan(0);
    expect(res.data.queue[0].priority).toBe('ELEVATED');
    expect(res.data.queue[0].patient_name).toBe('Eleanor Johnson');
  });

  it('14. GET /encounters/{id}/brief returns evidence brief with verifiable citations', async () => {
    const res = await mockApi.getDoctorBrief('enc_demo_001');
    expect(res.data.chief_complaint).toBeDefined();
    expect(res.data.citations.length).toBeGreaterThan(0);
    expect(res.data.citations[0].citation_id).toBeDefined();
    expect(res.data.unresolved_questions.length).toBeGreaterThan(0);
  });

  it('15. POST /encounters/{id}/approvals records clinician review and corrections', async () => {
    const res = await mockApi.submitDoctorApproval('enc_demo_001', {
      doctor_id: 'dr_clara_chen',
      decision: 'APPROVED',
      doctor_notes: 'Reviewed ECG and medications. Approved for consultation.',
    });
    expect(res.data.status).toBe('RECORDED');
    expect(res.data.approval_id).toMatch(/^appr_/);
  });

  it('16. Dynamically synthesizes doctor brief from submitted intake facts and symptoms', async () => {
    const encRes = await mockApi.createEncounter({ patient_id: 'pat_dynamic_99' });
    const dynamicEncId = encRes.data.id;

    await mockApi.submitAnswer(dynamicEncId, {
      question_id: 'q1_chief_complaint',
      transcription: 'Progressive wheezing and throat irritation for 4 days',
      input_modality: 'voice',
    });

    await mockApi.submitAnswer(dynamicEncId, {
      question_id: 'q4_medications',
      transcription: 'Albuterol inhaler 2 puffs PRN',
      input_modality: 'text',
    });

    const brief = await mockApi.getDoctorBrief(dynamicEncId);
    expect(brief.data.chief_complaint).toContain('Progressive wheezing and throat irritation');
    expect(brief.data.clinical_summary).toContain('Progressive wheezing');
    expect(brief.data.clinical_summary).toContain('Albuterol');
    expect(brief.data.citations.length).toBeGreaterThanOrEqual(2);
    expect(brief.data.audio_brief_available).toBe(true);
  });
});
