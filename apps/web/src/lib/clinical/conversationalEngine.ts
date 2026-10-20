/**
 * Conversational Clinical Intake Engine for ClinSync
 *
 * Implements a natural, multi-turn, context-aware dialogue system for patient intake:
 * 1. Understands patient queries, concerns, and volunteered multi-symptom statements.
 * 2. Extracts structured ClinicalFacts into the ledger preserving provenance.
 * 3. Handles self-corrections, negations, and clarifications.
 * 4. Manages interruption states, pause/resume, and conversational turn tokens.
 * 5. Evaluates adaptive completion criteria and presents a confirmation summary before handoff.
 */

import type { ClinicalFact } from '../api/types';
import { distillClinicalDictation } from './dictationIntelligence';

export interface ConversationMessage {
  id: string;
  role: 'assistant' | 'patient' | 'system';
  text: string;
  timestamp: number;
  status?: 'complete' | 'interrupted' | 'speaking';
  category?: string;
  extractedFacts?: ClinicalFact[];
}

export interface ConversationalIntakeSession {
  encounterId: string;
  patientName: string;
  language: string;
  dialogHistory: ConversationMessage[];
  knownFields: Record<string, string>;
  extractedFacts: ClinicalFact[];
  turnCount: number;
  isEmergency: boolean;
  emergencyReason?: string;
  isPaused: boolean;
  isComplete: boolean;
  currentCoverage: number;
}

export interface ConversationalTurnResult {
  assistantResponseText: string;
  updatedSession: ConversationalIntakeSession;
  extractedFactsThisTurn: ClinicalFact[];
  isEmergency: boolean;
  shouldConclude: boolean;
  actionType:
    | 'acknowledge'
    | 'clarify'
    | 'answer_question'
    | 'follow_up'
    | 'summarize_confirm'
    | 'emergency_escalate';
}

// Acute Red-Flag Emergency Indicators
export const ACUTE_RED_FLAGS = [
  /\b(?:crushing|severe)\s+chest\s+(?:pain|tightness|pressure)\b/i,
  /\bchest\s+(?:pain|tightness|pressure)\s+(?:radiat|spread)/i,
  /\b(?:sudden|acute)\s+(?:numbness|paralysis|weakness)\b/i,
  /\bfacial\s+droop\b/i,
  /\bcan(?:'t|not)\s+breathe\b/i,
  /\bsevere\s+shortness\s+of\s+breath\b/i,
  /\b(?:struggling|difficulty|trouble)\s+(?:to\s+breathe|breathing)\b/i,
  /\bgasping(?:\s+for\s+air)?\b/i,
  /\bcoughing\s+(?:up\s+)?blood\b/i,
  /\bloss\s+of\s+consciousness\b/i,
  /\b(?:passed\s+out|fainted|blacked\s+out)\b/i,
  /\bthroat\s+(?:is\s+)?(?:closing|swelling|tightening)\b/i,
  /\bswelling\s+of\s+(?:the\s+|my\s+)?(?:lips|tongue|throat)\b/i,
  /\bworst\s+headache\s+of\s+(?:my\s+)?life\b/i,
];

export function checkRedFlags(text: string): { isEmergency: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const pattern of ACUTE_RED_FLAGS) {
    if (pattern.test(lower)) {
      return {
        isEmergency: true,
        reason: `Potential high-risk emergency sign detected matching safety policy.`,
      };
    }
  }
  return { isEmergency: false };
}

/**
 * Creates a fresh, empty conversational intake session.
 */
export function createConversationalSession(
  encounterId: string,
  patientName: string,
  language: string = 'en'
): ConversationalIntakeSession {
  return {
    encounterId,
    patientName,
    language,
    dialogHistory: [
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        text: `Hello ${patientName.split(' ')[0] || 'there'}, I'm ClinSync's digital receptionist. Please take your time and tell me what health symptoms or concerns bring you in today.`,
        timestamp: Date.now(),
        status: 'complete',
        category: 'Chief Complaint',
      },
    ],
    knownFields: {},
    extractedFacts: [],
    turnCount: 0,
    isEmergency: false,
    isPaused: false,
    isComplete: false,
    currentCoverage: 15,
  };
}

/**
 * Parses conversational text to extract clinical dimensions:
 * onset/duration, severity, associated signs, medications, and corrections.
 */
export function extractClinicalDimensions(
  text: string,
  existingFields: Record<string, string>
): {
  chiefComplaint?: string;
  duration?: string;
  severity?: string;
  associatedSymptoms?: string;
  medications?: string;
  corrections?: { field: string; from: string; to: string }[];
  isQuestion: boolean;
  questionTopic?: string;
  completionSignaled: boolean;
  affirmationSignaled: boolean;
} {
  const lower = text.toLowerCase().trim();

  // 1. Detect explicit patient question
  const isQuestion =
    text.includes('?') ||
    /^(?:is\s+|are\s+|can\s+|will\s+|how\s+|why\s+|should\s+|do\s+i|what\s+)/i.test(lower) ||
    lower.includes('is it serious') ||
    lower.includes('dangerous') ||
    lower.includes('doctor') ||
    lower.includes('long will this take');

  let questionTopic: string | undefined;
  if (isQuestion) {
    if (lower.includes('serious') || lower.includes('dangerous') || lower.includes('normal')) {
      questionTopic = 'severity_reassurance';
    } else if (lower.includes('medication') || lower.includes('medicine') || lower.includes('pill')) {
      questionTopic = 'medication_purpose';
    } else if (lower.includes('how long') || lower.includes('time') || lower.includes('wait')) {
      questionTopic = 'intake_duration';
    } else {
      questionTopic = 'general_inquiry';
    }
  }

  // 2. Detect completion signals
  const completionSignaled =
    /\b(?:that'?s\s+all|that\s+is\s+all|nothing\s+else|no\s+other\s+symptoms|nothing\s+more|done|only\s+this|just\s+this|nope|nothing)\b/i.test(
      lower
    ) || (lower === 'no' && Object.keys(existingFields).length >= 2);

  // 3. Detect affirmation signals (e.g. agreeing with summary)
  const affirmationSignaled =
    /\b(?:yes|yeah|yep|correct|that'?s\s+right|accurate|sounds\s+good|exactly|looks\s+good)\b/i.test(
      lower
    );

  // 4. Extract Duration / Onset
  let duration: string | undefined;
  const durationMatch = lower.match(
    /\b(?:for\s+\d+\s*(?:days?|weeks?|months?|hours?)|since\s+(?:yesterday|this\s+morning|last\s+night|a\s+week|\d+\s+days?)|started\s+(?:today|yesterday|this\s+morning|\d+\s+days?\s+ago)|just\s+started|past\s+\d+\s*days?)\b/i
  );
  if (durationMatch) {
    duration = durationMatch[0].trim();
  }

  // 5. Extract Severity
  let severity: string | undefined;
  const severityMatch = lower.match(
    /\b(?:mild|moderate|severe|sharp|dull\s+ache|cramping|terrible|killing|unbearable|excruciating|slight|\d+\s*(?:out\s*of|\/)\s*10|pain\s*(?:is|at)?\s*\d+)\b/i
  );
  if (severityMatch) {
    severity = severityMatch[0].trim();
  }

  // 6. Extract Associated Symptoms
  const associatedList: string[] = [];
  if (lower.includes('fever') || lower.includes('chills') || lower.includes('temperature')) {
    associatedList.push('fever/chills');
  }
  if (lower.includes('nausea') || lower.includes('vomit') || lower.includes('throwing up')) {
    associatedList.push('nausea/vomiting');
  }
  if (lower.includes('dizzy') || lower.includes('lightheaded') || lower.includes('faint')) {
    associatedList.push('dizziness');
  }
  if (lower.includes('cough') && !existingFields['chief_complaint']?.toLowerCase().includes('cough')) {
    associatedList.push('cough');
  }
  if (lower.includes('short of breath') || lower.includes('breathless') || lower.includes('wheezing')) {
    associatedList.push('dyspnea/wheezing');
  }
  if (lower.includes('headache') && !existingFields['chief_complaint']?.toLowerCase().includes('headache')) {
    associatedList.push('headache');
  }
  if (lower.includes('sweat') || lower.includes('sweating')) {
    associatedList.push('diaphoresis (sweating)');
  }
  const associatedSymptoms = associatedList.length > 0 ? associatedList.join(', ') : undefined;

  // 7. Extract Medications / Allergies
  let medications: string | undefined;
  if (
    lower.includes('medication') ||
    lower.includes('pill') ||
    lower.includes('tablet') ||
    lower.includes('inhaler') ||
    lower.includes('aspirin') ||
    lower.includes('lisinopril') ||
    lower.includes('metformin') ||
    lower.includes('statin') ||
    lower.includes('blood pressure med') ||
    lower.includes('penicillin') ||
    lower.includes('no medications') ||
    lower.includes('no allergies')
  ) {
    medications = text;
  }

  // 8. Detect Corrections
  const corrections: { field: string; from: string; to: string }[] = [];
  const dictationRes = distillClinicalDictation(text);
  if (dictationRes.correctionDetected && dictationRes.negatedEntities.length > 0 && dictationRes.affirmedEntities.length > 0) {
    corrections.push({
      field: 'symptom_detail',
      from: dictationRes.negatedEntities[0],
      to: dictationRes.affirmedEntities[0],
    });
  } else {
    const correctionMatch = lower.match(
      /(?:actually,?\s*)?(?:it'?s\s+not|not|instead|rather)[\s,]+(?:the\s+|a\s+)?([a-z0-9\s]+?)\s*[,]?\s*(?:it'?s|it\s+is|but|rather|more\s+like)\s+(?:the\s+|a\s+|really\s+)?([a-z0-9\s]+)/i
    );
    if (correctionMatch) {
      corrections.push({
        field: 'symptom_detail',
        from: correctionMatch[1].trim(),
        to: correctionMatch[2].trim(),
      });
    }
  }

  // 9. Chief complaint (first turn if not set)
  let chiefComplaint: string | undefined;
  if (!existingFields['chief_complaint'] && !isQuestion) {
    chiefComplaint = text;
  }

  return {
    chiefComplaint,
    duration,
    severity,
    associatedSymptoms,
    medications,
    corrections,
    isQuestion,
    questionTopic,
    completionSignaled,
    affirmationSignaled,
  };
}

/**
 * Calculates clinical information coverage percentage (0 to 100%).
 */
export function calculateCoverage(fields: Record<string, string>): number {
  let score = 0;
  if (fields['chief_complaint']) score += 30;
  if (fields['duration']) score += 25;
  if (fields['severity']) score += 15;
  if (fields['associated_symptoms']) score += 15;
  if (fields['medications'] || fields['confirmed_review']) score += 15;
  return Math.min(score, 100);
}

/**
 * Core conversational turn processor.
 * Consumes patient utterance, detects emergencies, extracts facts,
 * handles barge-ins/corrections, and produces contextual dialogue responses.
 */
export function processPatientUtterance(
  session: ConversationalIntakeSession,
  utterance: string
): ConversationalTurnResult {
  const cleanInput = utterance.trim();

  // Step 1: Emergency Red Flag Screening
  const redFlagCheck = checkRedFlags(cleanInput);
  if (redFlagCheck.isEmergency) {
    const emergFact: ClinicalFact = {
      id: `fact_emerg_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Emergency Warning Sign',
      value: cleanInput,
      unit: null,
      clinical_time: 'acute',
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 1.0,
      reviewed_by: null,
      supersedes_fact_id: null,
    };

    const updatedSession: ConversationalIntakeSession = {
      ...session,
      isEmergency: true,
      emergencyReason: redFlagCheck.reason,
      turnCount: session.turnCount + 1,
      extractedFacts: [...session.extractedFacts, emergFact],
      dialogHistory: [
        ...session.dialogHistory,
        {
          id: `msg_pat_${Date.now()}`,
          role: 'patient',
          text: cleanInput,
          timestamp: Date.now(),
        },
        {
          id: `msg_emerg_${Date.now()}`,
          role: 'assistant',
          text: 'ATTENTION: You have reported symptoms that require immediate clinical evaluation. A clinical supervisor and triage nurse have been notified. Please remain seated while urgent care assistance arrives.',
          timestamp: Date.now(),
          category: 'Urgent Triage Alert',
        },
      ],
    };

    return {
      assistantResponseText:
        'ATTENTION: You have reported symptoms that require immediate clinical evaluation. A clinical supervisor and triage nurse have been notified. Please remain seated while urgent care assistance arrives.',
      updatedSession,
      extractedFactsThisTurn: [emergFact],
      isEmergency: true,
      shouldConclude: true,
      actionType: 'emergency_escalate',
    };
  }

  // Step 2: Extract clinical signals from patient speech
  const signals = extractClinicalDimensions(cleanInput, session.knownFields);
  const updatedKnownFields = { ...session.knownFields };
  const newFacts: ClinicalFact[] = [];

  if (signals.chiefComplaint && !updatedKnownFields['chief_complaint']) {
    updatedKnownFields['chief_complaint'] = signals.chiefComplaint;
    newFacts.push({
      id: `fact_cc_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Chief Complaint',
      value: signals.chiefComplaint,
      unit: null,
      clinical_time: 'current',
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 0.95,
      reviewed_by: null,
      supersedes_fact_id: null,
    });
  }

  if (signals.duration) {
    updatedKnownFields['duration'] = signals.duration;
    newFacts.push({
      id: `fact_dur_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Symptom Timeline',
      value: signals.duration,
      unit: null,
      clinical_time: signals.duration,
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 0.94,
      reviewed_by: null,
      supersedes_fact_id: null,
    });
  }

  if (signals.severity) {
    updatedKnownFields['severity'] = signals.severity;
    newFacts.push({
      id: `fact_sev_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Discomfort Rating',
      value: signals.severity,
      unit: 'pain_scale',
      clinical_time: 'current',
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 0.92,
      reviewed_by: null,
      supersedes_fact_id: null,
    });
  }

  if (signals.associatedSymptoms) {
    updatedKnownFields['associated_symptoms'] = signals.associatedSymptoms;
    newFacts.push({
      id: `fact_assoc_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Associated Symptoms',
      value: signals.associatedSymptoms,
      unit: null,
      clinical_time: 'current',
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 0.93,
      reviewed_by: null,
      supersedes_fact_id: null,
    });
  }

  if (signals.medications) {
    updatedKnownFields['medications'] = signals.medications;
    newFacts.push({
      id: `fact_meds_${Date.now()}`,
      patient_id: 'pat_synth_001',
      encounter_id: session.encounterId,
      concept: 'Medication History',
      value: signals.medications,
      unit: null,
      clinical_time: 'ongoing',
      recorded_at: new Date().toISOString(),
      fact_type: 'medication',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: `turn_${session.turnCount + 1}`,
      source_location: null,
      extraction_method: 'automated_llm',
      confidence: 0.91,
      reviewed_by: null,
      supersedes_fact_id: null,
    });
  }

  // Handle self-corrections
  if (signals.corrections && signals.corrections.length > 0) {
    for (const corr of signals.corrections) {
      updatedKnownFields['correction'] = `Updated from "${corr.from}" to "${corr.to}"`;
      newFacts.push({
        id: `fact_corr_${Date.now()}`,
        patient_id: 'pat_synth_001',
        encounter_id: session.encounterId,
        concept: 'Corrected Finding',
        value: corr.to,
        unit: null,
        clinical_time: 'corrected',
        recorded_at: new Date().toISOString(),
        fact_type: 'symptom',
        status: 'reported',
        source_type: 'PATIENT_VOICE',
        source_id: `turn_${session.turnCount + 1}`,
        source_location: null,
        extraction_method: 'automated_llm',
        confidence: 0.98,
        reviewed_by: null,
        supersedes_fact_id: null,
      });
    }
  }

  const coverage = calculateCoverage(updatedKnownFields);
  const complaintLower = (updatedKnownFields['chief_complaint'] || '').toLowerCase();
  const isSimpleLocalized =
    ['rash', 'cut', 'scratch', 'scrape', 'papercut', 'bite', 'finger', 'toe', 'itch', 'bruise'].some((term) =>
      complaintLower.includes(term)
    ) &&
    !complaintLower.includes('chest') &&
    !complaintLower.includes('breath') &&
    !complaintLower.includes('abdom');

  // Step 3: Formulate Dialogue Action & Response
  let responseText = '';
  let actionType: ConversationalTurnResult['actionType'] = 'follow_up';
  let shouldConclude = false;

  // Case A: Patient asked a question or asked for clarification
  if (signals.isQuestion) {
    actionType = 'answer_question';
    if (signals.questionTopic === 'severity_reassurance') {
      responseText =
        "It's very understandable to wonder about that. While I am an intake assistant and cannot give a medical diagnosis, our clinical doctor will examine you shortly to provide full answers. To help them prepare, could you tell me how long you've felt this?";
    } else if (signals.questionTopic === 'medication_purpose') {
      responseText =
        'Knowing your current prescription medications or allergies is essential so your physician avoids prescribing anything that could cause an interaction or reaction. Do you currently take any regular medications?';
    } else if (signals.questionTopic === 'intake_duration') {
      responseText =
        "We are almost finished! We just need another quick detail so the doctor has your full background ready. Is there any other symptom or fever you've experienced?";
    } else {
      responseText =
        'That is an important question for your physician. I have noted your concern for the medical brief. When did you first notice these symptoms?';
    }
  }
  // Case B: Patient was reviewing summary and agreed / confirmed
  else if (updatedKnownFields['awaiting_confirmation'] && (signals.affirmationSignaled || signals.completionSignaled)) {
    actionType = 'summarize_confirm';
    shouldConclude = true;
    responseText =
      'Thank you! Your intake answers have been verified and synced to the doctor console. You may now proceed to document upload or slot scheduling.';
  }
  // Case C: Patient explicitly signaled completion or simple complaint ready to conclude
  else if (
    signals.completionSignaled ||
    (isSimpleLocalized && session.turnCount >= 1 && updatedKnownFields['duration']) ||
    (coverage >= 70 && session.turnCount >= 2)
  ) {
    actionType = 'summarize_confirm';
    updatedKnownFields['awaiting_confirmation'] = 'true';
    const cc = updatedKnownFields['chief_complaint'] || 'your reported symptoms';
    const dur = updatedKnownFields['duration'] ? ` starting ${updatedKnownFields['duration']}` : '';
    const sev = updatedKnownFields['severity'] ? `, rated as ${updatedKnownFields['severity']}` : '';
    const assoc = updatedKnownFields['associated_symptoms']
      ? `, alongside ${updatedKnownFields['associated_symptoms']}`
      : '';

    responseText = `Thank you. Let me review what I have gathered: you are experiencing ${cc}${dur}${sev}${assoc}. Does this sound accurate, or would you like to add or correct anything before I hand this to the physician?`;
  }
  // Case D: Adaptive clinical follow-up based on missing facets
  else {
    actionType = 'follow_up';

    // Check for Cardiac Branch
    if (
      complaintLower.includes('chest') ||
      complaintLower.includes('heart') ||
      complaintLower.includes('tightness') ||
      complaintLower.includes('pressure')
    ) {
      if (!updatedKnownFields['duration']) {
        responseText =
          'I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?';
      } else if (!updatedKnownFields['severity']) {
        responseText =
          'On a scale from 0 to 10, how severe is the discomfort right now, and does it worsen when walking or exerting yourself?';
      } else if (!updatedKnownFields['associated_symptoms']) {
        responseText =
          'Are you experiencing any shortness of breath, cold sweats, dizziness, or nausea today?';
      } else if (!updatedKnownFields['medications']) {
        responseText =
          'Do you take any regular prescription medications for your blood pressure or heart, or do you have any allergies?';
      } else {
        responseText =
          'Is there anything else regarding your chest symptoms you would like the doctor to review?';
      }
    }
    // Respiratory Branch
    else if (
      complaintLower.includes('cough') ||
      complaintLower.includes('throat') ||
      complaintLower.includes('breath')
    ) {
      if (!updatedKnownFields['duration']) {
        responseText =
          'How many days have you had this cough, and are you coughing up any phlegm or running a fever?';
      } else if (!updatedKnownFields['associated_symptoms']) {
        responseText =
          'Are you experiencing any difficulty breathing, wheezing in your chest, or sore throat?';
      } else {
        responseText =
          'Do you use an asthma inhaler or take any regular prescription allergy medications?';
      }
    }
    // Gastrointestinal Branch
    else if (
      complaintLower.includes('stomach') ||
      complaintLower.includes('abdom') ||
      complaintLower.includes('belly') ||
      complaintLower.includes('nausea')
    ) {
      if (!updatedKnownFields['duration']) {
        responseText =
          'How long has this stomach discomfort been present, and is it sharp, cramping, or worse after eating?';
      } else if (!updatedKnownFields['associated_symptoms']) {
        responseText =
          'Have you had any vomiting, diarrhea, or fever alongside the stomach pain?';
      } else {
        responseText =
          'Have you taken any antacids or over-the-counter pain medications for this?';
      }
    }
    // General / Localized
    else {
      if (!updatedKnownFields['duration']) {
        responseText =
          'When did this discomfort first begin, and has it been getting better or worse?';
      } else if (!updatedKnownFields['severity']) {
        responseText =
          'On a scale from 0 to 10, how intense is the discomfort, and does it interfere with your sleep or work?';
      } else {
        responseText =
          'Do you have any other symptoms or relevant medical history our doctor should know?';
      }
    }

    if (signals.corrections && signals.corrections.length > 0) {
      responseText = `I've noted the update to ${signals.corrections[0].to}. ${responseText}`;
    }
  }

  // Step 4: Append turns to history
  const patientMsg: ConversationMessage = {
    id: `msg_pat_${Date.now()}`,
    role: 'patient',
    text: cleanInput,
    timestamp: Date.now(),
    extractedFacts: newFacts,
  };

  const assistantMsg: ConversationMessage = {
    id: `msg_ast_${Date.now() + 1}`,
    role: 'assistant',
    text: responseText,
    timestamp: Date.now() + 1,
    status: 'complete',
    category: actionType === 'summarize_confirm' ? 'Clinical Summary' : 'Intake Dialogue',
  };

  const updatedSession: ConversationalIntakeSession = {
    ...session,
    dialogHistory: [...session.dialogHistory, patientMsg, assistantMsg],
    knownFields: updatedKnownFields,
    extractedFacts: [...session.extractedFacts, ...newFacts],
    turnCount: session.turnCount + 1,
    currentCoverage: coverage,
    isComplete: shouldConclude,
  };

  return {
    assistantResponseText: responseText,
    updatedSession,
    extractedFactsThisTurn: newFacts,
    isEmergency: false,
    shouldConclude,
    actionType,
  };
}
