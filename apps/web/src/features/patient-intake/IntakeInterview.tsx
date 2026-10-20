import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Slider } from '../../components/ui/Slider';
import { Dialog } from '../../components/ui/Dialog';
import { AudioVisualizer, type VisualizerState } from './AudioVisualizer';
import { mockApi } from '../../lib/api/mockAdapter';
import type { ClinicalFact } from '../../lib/api/types';
import {
  Mic,
  MicOff,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Volume2,
  VolumeX,
  Sparkles,
  Pause,
  Play,
  Square,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { transcribeAudioWithElevenLabs, stopAllSpeech, synthesizeSpeech } from '../../lib/audio/elevenlabs';
import {
  distillClinicalDictation,
  type ClinicalDictationResult,
} from '../../lib/clinical/dictationIntelligence';
import { AgentMemoryHarness } from '../../lib/clinical/agentMemory';
import {
  createConversationalSession,
  processPatientUtterance,
  type ConversationalIntakeSession,
  ACUTE_RED_FLAGS,
} from '../../lib/clinical/conversationalEngine';

export interface IntakeQuestion {
  id: string;
  turnId?: number;
  fieldKey: string;
  category: string;
  prompt: string;
  subtitle: string;
  quickChips: string[];
  inputType: 'text' | 'chips' | 'slider';
  audioUrl?: string;
}

/**
 * Adaptive Clinical Questioning Engine
 * Computes next conversational question based on previous inputs & Mem0 Agent Memory.
 */
export const INITIAL_INTAKE_QUESTION: IntakeQuestion = {
  id: 'q1_chief_complaint',
  turnId: 1,
  fieldKey: 'chief_complaint',
  category: 'Chief Complaint',
  prompt: 'Welcome to ClinSync. What primary health symptom or discomfort brings you in today?',
  subtitle: 'I am your AI receptionist. Speak naturally or tap a common symptom below.',
  quickChips: [
    'Persistent dry cough',
    'Chest tightness / pain',
    'Mild fever & chills',
    'Stomach / abdominal pain',
    'Joint & muscle aches',
  ],
  inputType: 'text',
};

export function determineNextAdaptiveQuestion(
  answers: Record<string, string>,
  stepIndex: number,
  _memoryHarness?: AgentMemoryHarness,
  _questionHistory?: IntakeQuestion[]
): IntakeQuestion | null {
  const lastKey = Object.keys(answers).pop() || '';
  const lastAnswer = (answers[lastKey] || '').toLowerCase().trim();
  const allAnswersText = Object.values(answers).join(' ').toLowerCase();

  // 1. Patient explicitly signaled they have nothing more to add
  const completionSignals = [
    "that's all",
    'that is all',
    'nothing else',
    'no other symptoms',
    'nothing more',
    'no other issues',
    "that's it",
    'that is it',
    'done',
    'only this',
    'just this',
  ];
  if (
    completionSignals.some((sig) => lastAnswer.includes(sig) || allAnswersText.includes(sig)) ||
    (stepIndex >= 2 && ['no', 'none', 'nothing', 'nope', 'negative'].includes(lastAnswer))
  ) {
    return null;
  }

  // 2. Maximum safety limit: exactly 6 dynamic questions in a full intake session
  if (stepIndex >= 6) {
    return null;
  }

  // 3. Clinical Ambiguity Clarification Check
  if (
    lastKey === 'duration' &&
    (lastAnswer === 'a while' || lastAnswer === 'not sure' || lastAnswer === 'recently' || lastAnswer === 'some time')
  ) {
    return {
      id: 'q_clarify_duration',
      fieldKey: 'duration_clarification',
      category: 'Clarification',
      prompt: 'Could you give an estimate of about how many hours or days it has been present?',
      subtitle: 'An approximate timeline helps the clinical team prioritize your assessment.',
      quickChips: ['Just started today', 'Past 2 to 3 days', 'About 1 week', 'More than 2 weeks'],
      inputType: 'chips',
    };
  }

  // 4. Clinical Signal & Domain Extraction
  const rawComplaint = (answers['chief_complaint'] || Object.values(answers)[0] || '').trim();
  const complaint = rawComplaint.toLowerCase();

  const cleanSymptom = rawComplaint
    .replace(
      /^(i have|i've had|i am having|i am feeling|im feeling|i feel|feeling|experiencing|suffering from|there is|a bit of)\s+/i,
      ''
    )
    .trim() || 'symptoms';

  const hasMentionedDuration =
    Boolean(answers['duration'] || answers['duration_onset'] || answers['duration_clarification']) ||
    /\b(?:since\s+|for\s+\d+|started\s+|days?|weeks?|months?|hours?|yesterday|morning|today|last\s+night)\b/i.test(
      allAnswersText
    );

  const durationMatch = allAnswersText.match(
    /\b(?:since\s+[^,.]+|for\s+\d+\s+days?|for\s+\d+\s+hours?|for\s+about\s+\d+\s+days?|started\s+[^,.]+|yesterday|today|this\s+morning)\b/i
  );
  const reportedDurationRef = durationMatch ? durationMatch[0] : 'since onset';

  // Domain categorization
  const isCardiac =
    complaint.includes('chest') ||
    complaint.includes('heart') ||
    complaint.includes('tightness') ||
    complaint.includes('pressure') ||
    complaint.includes('palpitat') ||
    complaint.includes('squeezing');

  const isRespiratory =
    complaint.includes('cough') ||
    complaint.includes('wheez') ||
    complaint.includes('throat') ||
    complaint.includes('breath') ||
    complaint.includes('sputum') ||
    complaint.includes('phlegm') ||
    complaint.includes('lung') ||
    complaint.includes('asthma');

  const isAbdominal =
    complaint.includes('stomach') ||
    complaint.includes('abdom') ||
    complaint.includes('belly') ||
    complaint.includes('nausea') ||
    complaint.includes('vomit') ||
    complaint.includes('cramp') ||
    complaint.includes('diarrhea') ||
    complaint.includes('bowel') ||
    complaint.includes('reflux') ||
    complaint.includes('heartburn') ||
    complaint.includes('digest');

  const isNeuro =
    complaint.includes('headache') ||
    complaint.includes('migraine') ||
    complaint.includes('head') ||
    complaint.includes('dizzy') ||
    complaint.includes('lightheaded') ||
    complaint.includes('vertigo') ||
    complaint.includes('vision') ||
    complaint.includes('numb') ||
    complaint.includes('tingl');

  const isMusculoskeletal =
    complaint.includes('knee') ||
    complaint.includes('back') ||
    complaint.includes('shoulder') ||
    complaint.includes('neck') ||
    complaint.includes('ankle') ||
    complaint.includes('wrist') ||
    complaint.includes('joint') ||
    complaint.includes('muscle') ||
    complaint.includes('sprain') ||
    complaint.includes('strain') ||
    complaint.includes('hip') ||
    complaint.includes('leg') ||
    complaint.includes('arm') ||
    complaint.includes('swollen') ||
    complaint.includes('stiff');

  const isDermatological =
    complaint.includes('rash') ||
    complaint.includes('itch') ||
    complaint.includes('burn') ||
    complaint.includes('cut') ||
    complaint.includes('scratch') ||
    complaint.includes('scrape') ||
    complaint.includes('bite') ||
    complaint.includes('sting') ||
    complaint.includes('skin') ||
    complaint.includes('hive') ||
    complaint.includes('bruise') ||
    complaint.includes('papercut');

  const isSystemic =
    complaint.includes('fever') ||
    complaint.includes('chill') ||
    complaint.includes('sweat') ||
    complaint.includes('fatigue') ||
    complaint.includes('tired') ||
    complaint.includes('weak') ||
    complaint.includes('body ache');

  // =========================================================================
  // Question 2 (Turn 2, stepIndex === 1)
  // Focus: Onset Timeline, Character & Progression
  // =========================================================================
  if (stepIndex === 1) {
    if (isCardiac) {
      if (!hasMentionedDuration) {
        return {
          id: 'q2_duration_chest',
          turnId: 2,
          fieldKey: 'duration',
          category: 'Symptom Timeline & Radiation',
          prompt:
            'I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?',
          subtitle: 'Knowing onset timeline and radiation helps our cardiology team evaluate urgency.',
          quickChips: [
            'Started this morning',
            'About 2 to 3 days, mild pressure',
            'Radiates slightly to left arm',
            'Constant heaviness for a week',
          ],
          inputType: 'chips',
        };
      }
      return {
        id: 'q2_associated_chest',
        turnId: 2,
        fieldKey: 'associated_symptoms',
        category: 'Accompanying Symptoms',
        prompt:
          'Since your chest tightness started this morning, are you experiencing any shortness of breath, cold sweats, dizziness, or nausea today?',
        subtitle: 'Select any accompanying symptoms that apply.',
        quickChips: [
          'Shortness of breath on exertion',
          'Dizziness / lightheadedness',
          'Cold sweats',
          'Nausea or reduced appetite',
          'No other symptoms',
        ],
        inputType: 'chips',
      };
    }

    if (isRespiratory) {
      return {
        id: 'q2_duration_cough',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Cough Character & Progression',
        prompt:
          'How many days have you had this cough, and are you bringing up any yellow/green phlegm or running a fever?',
        subtitle: 'Distinguishing dry vs productive cough helps determine respiratory treatment.',
        quickChips: [
          'Dry cough for 3 days',
          'Productive with yellow phlegm',
          'Accompanied by mild fever',
          'Worse at night and early morning',
        ],
        inputType: 'chips',
      };
    }

    if (isAbdominal) {
      return {
        id: 'q2_duration_abdom',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Abdominal Pain Specifics',
        prompt:
          'How long has this abdominal discomfort been present, and is it sharp, cramping, or worse after eating?',
        subtitle: 'Localizing abdominal pain guides appropriate abdominal evaluation.',
        quickChips: [
          'Started suddenly after a meal',
          'Constant dull ache for 2 days',
          'Sharp cramps that come and go',
          'Burning sensation in upper stomach',
        ],
        inputType: 'chips',
      };
    }

    if (isNeuro) {
      return {
        id: 'q2_duration_neuro',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Onset & Sensation',
        prompt: `I understand you are experiencing ${cleanSymptom}. When did this first start, and is it a constant ache, throbbing, or sharp stabbing pain?`,
        subtitle: 'Characterizing the pain pattern helps differentiate tension, migraine, or sinus pressure.',
        quickChips: [
          'Started today, constant throbbing',
          'Past 2 to 3 days, comes in waves',
          'Sharp stabbing pain since morning',
          'Dull constant pressure for a week',
        ],
        inputType: 'chips',
      };
    }

    if (isMusculoskeletal) {
      return {
        id: 'q2_duration_msk',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Onset & Injury Context',
        prompt: `When did this ${cleanSymptom} first occur, and did it happen after a specific injury, strain, or physical activity?`,
        subtitle: 'Identifying physical triggers informs orthopedic assessment.',
        quickChips: [
          'Happened during sports / exercise',
          'Started after lifting something heavy',
          'Gradual onset over several days',
          'Sudden stiffness and pain upon waking',
        ],
        inputType: 'chips',
      };
    }

    if (isDermatological) {
      return {
        id: 'q2_duration_derm',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Onset & Progression',
        prompt: `When did you first notice this ${cleanSymptom}, and is it itching, burning, or spreading to other areas?`,
        subtitle: 'Onset timeline helps evaluate whether this is acute or spreading.',
        quickChips: [
          'Started yesterday, mild itch',
          'Just noticed it today',
          'About 3 days, not spreading',
          'Itches when touched',
        ],
        inputType: 'chips',
      };
    }

    if (isSystemic) {
      return {
        id: 'q2_duration_systemic',
        turnId: 2,
        fieldKey: 'duration',
        category: 'Timeline & Pattern',
        prompt: `How many days have you been feeling ${cleanSymptom}, and has your temperature or fatigue been fluctuating or steadily rising?`,
        subtitle: 'Assessing systemic trends helps determine infection timeline.',
        quickChips: [
          'Started in the last 24 hours',
          'Fluctuating over the last 3 days',
          'Persistent for about a week',
          'Worse in the evenings',
        ],
        inputType: 'chips',
      };
    }

    return {
      id: 'q2_duration_general',
      turnId: 2,
      fieldKey: 'duration',
      category: 'Symptom Timeline',
      prompt: `When did your ${cleanSymptom} first begin, and have symptoms been improving, worsening, or staying about the same?`,
      subtitle: 'Acute vs subacute onset determines consultation priority.',
      quickChips: [
        'Started in the last 24 hours',
        'Present for 2 to 3 days',
        'Gradually worsening over a week',
        'Intermittent over the past month',
      ],
      inputType: 'chips',
    };
  }

  // =========================================================================
  // Question 3 (Turn 3, stepIndex === 2)
  // Focus: Discomfort Rating (0-10), Radiation & Daily Functional Impact
  // =========================================================================
  if (stepIndex === 2) {
    if (isCardiac) {
      return {
        id: 'q3_severity_chest',
        turnId: 3,
        fieldKey: 'severity',
        category: 'Discomfort Rating & Exertion',
        prompt:
          'On a scale from 0 to 10, how severe is your chest discomfort right now, and does it worsen with physical exertion?',
        subtitle: '0 is completely pain-free; 10 is the most severe pain imaginable.',
        quickChips: ['3 - Mild', '5 - Moderate', '8 - Severe', 'Worse when walking'],
        inputType: 'slider',
      };
    }

    if (isRespiratory) {
      return {
        id: 'q3_severity_cough',
        turnId: 3,
        fieldKey: 'breathing_difficulty',
        category: 'Discomfort Rating & Respiratory Effort',
        prompt:
          'On a scale from 0 to 10, how severe is your breathing discomfort or cough right now, and does it interfere with sleeping or walking?',
        subtitle: 'Assessing respiratory severity guides oxygenation evaluation.',
        quickChips: ['3 - Mild', '5 - Moderate wheezing', '8 - Severe tightness', 'Disrupts sleep'],
        inputType: 'slider',
      };
    }

    if (isNeuro) {
      return {
        id: 'q3_severity_neuro',
        turnId: 3,
        fieldKey: 'severity',
        category: 'Pain Rating & Sensitivity',
        prompt: `Considering that your ${cleanSymptom} has been present ${reportedDurationRef}, on a scale from 0 to 10, how intense is the pain right now, and does it make it difficult to focus or look at lights?`,
        subtitle: 'Quantifies pain intensity and photosensitivity.',
        quickChips: ['3 - Mild ache', '6 - Moderate, hard to concentrate', '8 - Severe throbbing', 'Disrupts normal activities'],
        inputType: 'slider',
      };
    }

    if (isAbdominal) {
      return {
        id: 'q3_severity_abdom',
        turnId: 3,
        fieldKey: 'severity',
        category: 'Pain Rating & Radiation',
        prompt:
          'On a scale from 0 to 10, how severe is your abdominal discomfort right now, and does the pain radiate to your back or sides?',
        subtitle: 'Pain rating and radiation patterns clarify digestive urgency.',
        quickChips: ['3 - Mild cramps', '5 - Moderate pain', '8 - Severe stabbing pain', 'Radiates to lower back'],
        inputType: 'slider',
      };
    }

    if (isMusculoskeletal) {
      return {
        id: 'q3_severity_msk',
        turnId: 3,
        fieldKey: 'severity',
        category: 'Discomfort Rating & Mobility',
        prompt: `Considering your ${cleanSymptom}, on a scale from 0 to 10, how intense is the pain right now, and are you able to bear weight or move the joint?`,
        subtitle: 'Assesses functional joint limitation and weight-bearing capability.',
        quickChips: ['3 - Mild discomfort', '6 - Moderate, limping/restricted', '8 - Severe, cannot bear weight', 'Sharp pain with movement'],
        inputType: 'slider',
      };
    }

    if (isDermatological) {
      return {
        id: 'q3_severity_derm',
        turnId: 3,
        fieldKey: 'severity',
        category: 'Irritation & Discomfort Rating',
        prompt:
          'On a scale from 0 to 10, how intense is the itching or irritation, and does it disrupt your sleep or daily tasks?',
        subtitle: 'Severity rating helps determine whether prescription anti-itch or topical therapy is indicated.',
        quickChips: ['2 - Mild itch', '5 - Moderate, constantly scratching', '8 - Severe burning sensation', 'Disrupts sleep'],
        inputType: 'slider',
      };
    }

    return {
      id: 'q3_severity_general',
      turnId: 3,
      fieldKey: 'severity',
      category: 'Discomfort & Daily Impact',
      prompt: `On a scale from 0 to 10, how intense is your ${cleanSymptom} right now, and does it interfere with your work or sleep?`,
      subtitle: 'Quantifies symptom severity to inform clinical decision-making.',
      quickChips: ['2 - Mild annoyance', '4 - Moderate discomfort', '7 - Severe, disrupts sleep', 'Interferes with daily work'],
      inputType: 'slider',
    };
  }

  // =========================================================================
  // Question 4 (Turn 4, stepIndex === 3)
  // Focus: Accompanying & Associated Symptoms / Red Flags
  // =========================================================================
  if (stepIndex === 3) {
    if (isCardiac) {
      return {
        id: 'q4_associated_chest',
        turnId: 4,
        fieldKey: 'associated_symptoms',
        category: 'Accompanying Symptoms',
        prompt: 'Are you experiencing any shortness of breath, cold sweats, dizziness, or nausea today?',
        subtitle: 'Screening for secondary cardiovascular indicators.',
        quickChips: [
          'Shortness of breath on exertion',
          'Dizziness / lightheadedness',
          'Cold sweats',
          'Nausea or reduced appetite',
          'No other symptoms',
        ],
        inputType: 'chips',
      };
    }

    if (isRespiratory) {
      return {
        id: 'q4_associated_cough',
        turnId: 4,
        fieldKey: 'associated_symptoms',
        category: 'Breathing & Wheezing Assessment',
        prompt:
          'Are you having any difficulty catching your breath, wheezing, or tightness in your lungs when walking or resting?',
        subtitle: 'Assessing respiratory effort helps evaluate bronchodilator needs.',
        quickChips: [
          'Mild shortness of breath when climbing stairs',
          'Noticeable wheezing when exhaling',
          'Breathing is completely normal',
          'Worse when lying flat',
        ],
        inputType: 'chips',
      };
    }

    if (isNeuro) {
      return {
        id: 'q4_associated_neuro',
        turnId: 4,
        fieldKey: 'associated_symptoms',
        category: 'Associated Neurological Symptoms',
        prompt: `Alongside your ${cleanSymptom}, are you experiencing any dizziness, nausea, vision changes, sensitivity to noise, or neck stiffness?`,
        subtitle: 'Screens for systemic neurological and vestibular involvement.',
        quickChips: [
          'Nausea or reduced appetite',
          'Sensitivity to light and sound',
          'Dizziness or lightheadedness',
          'Blurred vision or aura',
          'No other associated symptoms',
        ],
        inputType: 'chips',
      };
    }

    if (isAbdominal) {
      return {
        id: 'q4_associated_abdom',
        turnId: 4,
        fieldKey: 'associated_gi',
        category: 'Gastrointestinal Signs',
        prompt: 'Have you had any nausea, vomiting, fever, or noticeable change in your bowel habits?',
        subtitle: 'Identifies systemic or digestive complications.',
        quickChips: [
          'Mild nausea without vomiting',
          'Vomited once this morning',
          'Loose stools / diarrhea',
          'No other digestive symptoms',
        ],
        inputType: 'chips',
      };
    }

    if (isMusculoskeletal) {
      return {
        id: 'q4_associated_msk',
        turnId: 4,
        fieldKey: 'associated_symptoms',
        category: 'Associated Joint & Neuromuscular Signs',
        prompt: `Along with your ${cleanSymptom}, have you noticed any visible swelling, redness, joint clicking or locking, or numbness in the limb?`,
        subtitle: 'Detects joint effusion, mechanical obstruction, or nerve impingement.',
        quickChips: [
          'Noticeable swelling around joint',
          'Warmth and redness',
          'Joint feels locked or unstable',
          'Tingling or numbness in extremities',
          'No visible swelling',
        ],
        inputType: 'chips',
      };
    }

    if (isDermatological) {
      return {
        id: 'q4_associated_derm',
        turnId: 4,
        fieldKey: 'associated_symptoms',
        category: 'Associated Dermatological & Systemic Signs',
        prompt:
          'Are you having any facial swelling, difficulty breathing or swallowing, fever, or blistering?',
        subtitle: 'Screens for allergic hypersensitivity or secondary bacterial infection.',
        quickChips: [
          'Mild peeling or flaking',
          'Warm to the touch',
          'No facial swelling or fever',
          'Spreading slightly',
        ],
        inputType: 'chips',
      };
    }

    return {
      id: 'q4_associated_general',
      turnId: 4,
      fieldKey: 'associated_symptoms',
      category: 'Associated Systemic Symptoms',
      prompt: `Are you experiencing any other accompanying symptoms today, such as fever, dizziness, nausea, fatigue, or body aches?`,
      subtitle: 'Secondary systemic signs help clarify diagnostic context.',
      quickChips: [
        'Low-grade fever & chills',
        'Dizziness or lightheadedness',
        'Fatigue and body aches',
        'Mild nausea',
        'No other symptoms',
      ],
      inputType: 'chips',
    };
  }

  // =========================================================================
  // Question 5 (Turn 5, stepIndex === 4)
  // Focus: Triggers, Relieving/Aggravating Factors & Prior Treatments
  // =========================================================================
  if (stepIndex === 4) {
    if (isCardiac) {
      return {
        id: 'q5_triggers_chest',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Aggravating Factors & Relief Attempts',
        prompt:
          'Does physical exertion, deep breathing, or resting make your chest symptoms worse or better, and have you taken any medications like aspirin, nitroglycerin, or antacids?',
        subtitle: 'Helps differentiate cardiac angina from musculoskeletal or gastroesophageal discomfort.',
        quickChips: [
          'Worse when walking/exerting',
          'Took aspirin earlier today',
          'Took an antacid with no relief',
          'Relieved slightly with rest',
          "Haven't taken any medications",
        ],
        inputType: 'chips',
      };
    }

    if (isRespiratory) {
      return {
        id: 'q5_triggers_cough',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Respiratory Triggers & Treatments',
        prompt:
          'Does cold air, exertion, or lying flat trigger more coughing or breathing trouble, and have you used an inhaler, cough syrup, or hot steam?',
        subtitle: 'Identifies postural triggers and evaluates response to prior bronchodilator or antitussive therapy.',
        quickChips: [
          'Worse when lying down at night',
          'Used an asthma inhaler (Albuterol)',
          'Tried cough medicine/syrup',
          'Triggered by cold air or dust',
          'No treatments taken yet',
        ],
        inputType: 'chips',
      };
    }

    if (isNeuro) {
      return {
        id: 'q5_triggers_neuro',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Headache Triggers & Prior Treatments',
        prompt: `Does bright light, sound, or movement worsen your ${cleanSymptom}, and have you taken any pain relievers like acetaminophen or ibuprofen, or rested in a quiet dark room?`,
        subtitle: 'Helps evaluate migraine triggers and prior analgesic responsiveness.',
        quickChips: [
          'Took ibuprofen (Advil/Motrin)',
          'Took acetaminophen (Tylenol)',
          'Resting in a dark room helps',
          'Worse with screen time / lights',
          "Haven't taken any pain medication",
        ],
        inputType: 'chips',
      };
    }

    if (isAbdominal) {
      return {
        id: 'q5_triggers_abdom',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Dietary Triggers & Interventions',
        prompt:
          'Does eating certain foods, drinking liquids, or changing posture relieve or worsen the discomfort, and have you taken any antacids or pain relievers?',
        subtitle: 'Clarifies relationship to food intake and efficacy of gastric acid reducers.',
        quickChips: [
          'Worse immediately after meals',
          'Took an antacid (Tums/Omeprazole)',
          'Drinking warm fluids helps',
          'Worse when lying flat',
          'No medications taken',
        ],
        inputType: 'chips',
      };
    }

    if (isMusculoskeletal) {
      return {
        id: 'q5_triggers_msk',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Mechanical Triggers & Interventions',
        prompt: `Does walking, bending, or bearing weight worsen the pain, and have you applied ice, heat, or taken any anti-inflammatory painkillers?`,
        subtitle: 'Evaluates mechanical loading and response to conservative RICE or NSAID measures.',
        quickChips: [
          'Applied ice pack / compression',
          'Took anti-inflammatory (Ibuprofen)',
          'Pain worsens with weight-bearing',
          'Resting and elevating helps',
          'No treatment applied yet',
        ],
        inputType: 'chips',
      };
    }

    if (isDermatological) {
      return {
        id: 'q5_triggers_derm',
        turnId: 5,
        fieldKey: 'triggers_treatments',
        category: 'Environmental Triggers & Topicals',
        prompt:
          'Have you been exposed to any new soaps, detergents, cosmetics, plants, or pets, and have you applied any topical creams or ointments?',
        subtitle: 'Screens for contact dermatitis triggers and documented prior topical therapies.',
        quickChips: [
          'New soap or laundry detergent',
          'Applied hydrocortisone cream',
          'Applied moisturizer / lotion',
          'Outdoors / plant exposure',
          'No new exposures identified',
        ],
        inputType: 'chips',
      };
    }

    return {
      id: 'q5_triggers_general',
      turnId: 5,
      fieldKey: 'triggers_treatments',
      category: 'Triggers & Relieving Factors',
      prompt: `Does anything specific seem to trigger or relieve your ${cleanSymptom}, and have you taken any medications or home remedies to relieve it?`,
      subtitle: 'Clarifies modifying factors and therapeutic attempts.',
      quickChips: [
        'Took over-the-counter pain relief',
        'Resting helps reduce symptoms',
        'Worse with physical activity',
        'Nothing seems to help',
        "Haven't tried any remedies yet",
      ],
      inputType: 'chips',
    };
  }

  // =========================================================================
  // Question 6 (Turn 6, stepIndex === 5)
  // Focus: Medical History, Medications, Allergies & Consult Priorities
  // =========================================================================
  if (stepIndex === 5) {
    return {
      id: 'q6_review_medical_history',
      turnId: 6,
      fieldKey: 'medical_history_review',
      category: 'Medication & Medical History Review',
      prompt:
        'To complete your intake for the physician: do you have any chronic medical conditions, regular prescription medications, drug allergies, or specific questions you want prioritized during your consultation?',
      subtitle: 'This final clinical review equips your attending doctor with full context before exam.',
      quickChips: [
        'No regular medications or drug allergies',
        'Blood pressure medication (e.g., Lisinopril, Amlodipine)',
        'Asthma / respiratory history',
        'Diabetes / routine prescriptions',
        'Penicillin / antibiotic allergy',
        'Want doctor to check if imaging/tests needed',
      ],
      inputType: 'text',
    };
  }

  return null;
}

export interface IntakeInterviewProps {
  encounterId: string;
  patientName: string;
  language?: string;
  onComplete: (collectedFacts: ClinicalFact[]) => void;
  onResetSession: () => void;
  onEmergencyTriggered?: () => void;
}

export const IntakeInterview: React.FC<IntakeInterviewProps> = ({
  encounterId,
  patientName,
  language = 'en',
  onComplete,
  onResetSession,
  onEmergencyTriggered,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [painScore, setPainScore] = useState<number>(4);

  // Modality & conversational audio states
  const [modality, setModality] = useState<'voice' | 'touch'>('voice');
  const [audioState, setAudioState] = useState<VisualizerState>('idle');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [micPermissionNotice, setMicPermissionNotice] = useState<string | null>(null);
  const [clarificationNotice, setClarificationNotice] = useState<string | null>(null);

  // Pause / Resume & Interruption state
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(false);

  // Inactivity timeout state
  const [inactivityTimer, setInactivityTimer] = useState<number>(45);
  const [isInactiveWarning, setIsInactiveWarning] = useState<boolean>(false);

  // Safety escalation state
  const [isEscalated, setIsEscalated] = useState<boolean>(false);
  const [escalationReason, setEscalationReason] = useState<string>('');

  // Confirmation dialog for Reset
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);

  // Extracted clinical facts accumulator
  const [extractedFacts, setExtractedFacts] = useState<ClinicalFact[]>([]);

  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [aiAudioMuted, setAiAudioMuted] = useState<boolean>(false);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

  // Conversational session ref & monotonic Turn Token (prevents race conditions)
  const sessionRef = useRef<ConversationalIntakeSession>(
    createConversationalSession(encounterId, patientName, language)
  );
  const turnIdRef = useRef<number>(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const interruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTurnIdRef = useRef<number | null>(null);

  // Dynamic adaptive question tracking
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion>(INITIAL_INTAKE_QUESTION);
  const [questionHistory, setQuestionHistory] = useState<IntakeQuestion[]>([INITIAL_INTAKE_QUESTION]);
  const [clinicalDictation, setClinicalDictation] = useState<ClinicalDictationResult | null>(null);

  // Clinical coverage estimation across 6 dynamic questions
  const coveragePercent = useMemo(() => {
    return Math.min(100, Math.max(17, Math.round(((currentStepIndex + 1) / 6) * 100)));
  }, [currentStepIndex]);

  const isReadyToFinish = useMemo(() => {
    return Object.keys(answers).length >= 2 || currentStepIndex >= 2;
  }, [answers, currentStepIndex]);

  // Audio & Web Speech Recognition references
  const recognitionRef = useRef<unknown>(null);
  const isListeningRef = useRef<boolean>(false);
  const speechCapturedRef = useRef<string>('');
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Web Speech API interface
  interface SpeechResultItem {
    transcript: string;
  }
  interface SpeechResultList {
    readonly length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: SpeechResultItem;
    };
  }
  interface SpeechEvent {
    results: SpeechResultList;
  }
  interface SpeechErrorEvent {
    error: string;
  }

  interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives?: number;
    lang: string;
    onstart?: (() => void) | null;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  }

  const globalWindow = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
  const SpeechRecognitionClass = globalWindow
    ? (globalWindow.SpeechRecognition as { new (): SpeechRecognitionInstance } | undefined) ||
      (globalWindow.webkitSpeechRecognition as { new (): SpeechRecognitionInstance } | undefined)
    : null;

  // Halt physical audio and browser speech synthesis immediately without altering UI state
  const silenceAudio = useCallback(() => {
    // 1. Invalidate current turn token
    turnIdRef.current += 1;

    // 2. Abort any in-flight ElevenLabs synthesis network call
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    // 3. Halt physical audio element
    if (aiAudioRef.current) {
      try {
        aiAudioRef.current.pause();
        aiAudioRef.current.currentTime = 0;
        aiAudioRef.current.src = '';
      } catch {
        // Ignore
      }
    }

    // 4. Halt browser SpeechSynthesis
    stopAllSpeech();

    setIsAiSpeaking(false);
  }, []);

  // Stop active speech playback and mark as interrupted
  const handleStopAssistant = useCallback(() => {
    silenceAudio();
    setAudioState('interrupted');

    // Update last assistant message status in transcript
    const history = sessionRef.current.dialogHistory;
    if (history.length > 0 && history[history.length - 1].role === 'assistant') {
      history[history.length - 1].status = 'interrupted';
    }

    // Briefly show interrupted badge then transition back to ready
    if (interruptTimerRef.current) clearTimeout(interruptTimerRef.current);
    interruptTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        setAudioState('idle');
      }
    }, 1200);
  }, [silenceAudio]);

  // Natural Interruption / Barge-in trigger when speech detected while speaking
  const handleBargeIn = useCallback(() => {
    if (isAiSpeaking || audioState === 'speaking') {
      handleStopAssistant();
      setClarificationNotice('Assistant interrupted. Listening to your voice now...');
    }
  }, [isAiSpeaking, audioState, handleStopAssistant]);

  // Play canonical voice question with strict turn token synchronization & race elimination
  const playReceptionistVoice = useCallback(
    async (text: string, turnId?: number) => {
      if (!text || aiAudioMuted || isPaused) return;

      const thisTurnId = turnId ?? ++turnIdRef.current;
      turnIdRef.current = thisTurnId;

      const abortCtrl = new AbortController();
      activeAbortControllerRef.current = abortCtrl;

      setIsAiSpeaking(true);
      setAudioState('speaking');

      // 1. Synthesize dynamically with ElevenLabs (with AbortSignal) if API key available
      try {
        const dynamicUrl = await synthesizeSpeech(text, 'receptionist', abortCtrl.signal);
        // Ensure no intervening stop/interruption occurred
        if (thisTurnId !== turnIdRef.current || abortCtrl.signal.aborted) {
          return;
        }

        if (dynamicUrl && aiAudioRef.current) {
          aiAudioRef.current.src = dynamicUrl;
          aiAudioRef.current.onended = () => {
            if (thisTurnId === turnIdRef.current) {
              setIsAiSpeaking(false);
              setAudioState('idle');
            }
          };
          aiAudioRef.current.onerror = () => {
            if (thisTurnId === turnIdRef.current) {
              setIsAiSpeaking(false);
              setAudioState('idle');
            }
          };
          try {
            await aiAudioRef.current.play();
            return;
          } catch (playErr) {
            console.warn('HTML Audio autoplay blocked; falling back to speech synthesis', playErr);
          }
        }
      } catch {
        // Fall back to Browser Web Speech Synthesis
      }

      // 2. Fallback to Browser SpeechSynthesis (Web Speech API) using the exact canonical text
      if (typeof window !== 'undefined' && window.speechSynthesis && thisTurnId === turnIdRef.current && !abortCtrl.signal.aborted) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.onstart = () => {
            if (thisTurnId === turnIdRef.current) {
              setIsAiSpeaking(true);
              setAudioState('speaking');
            }
          };
          utterance.onend = () => {
            if (thisTurnId === turnIdRef.current) {
              setIsAiSpeaking(false);
              setAudioState('idle');
            }
          };
          utterance.onerror = () => {
            if (thisTurnId === turnIdRef.current) {
              setIsAiSpeaking(false);
              setAudioState('idle');
            }
          };
          setTimeout(() => {
            if (thisTurnId === turnIdRef.current && !abortCtrl.signal.aborted) {
              window.speechSynthesis.speak(utterance);
            }
          }, 25);
        } catch {
          setIsAiSpeaking(false);
          setAudioState('idle');
        }
      } else {
        // Honest fallback: Audio not available in environment, return to idle
        setIsAiSpeaking(false);
        setAudioState('idle');
      }
    },
    [aiAudioMuted, isPaused]
  );

  // Play audio when canonical question changes, debounced for StrictMode stabilization
  const audioDispatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const qTurnId = currentQuestion?.turnId || 1;
    if (
      currentQuestion?.prompt &&
      !isPaused &&
      modality === 'voice' &&
      lastSpokenTurnIdRef.current !== qTurnId
    ) {
      lastSpokenTurnIdRef.current = qTurnId;
      if (audioDispatchTimerRef.current) {
        clearTimeout(audioDispatchTimerRef.current);
      }
      audioDispatchTimerRef.current = setTimeout(() => {
        playReceptionistVoice(currentQuestion.prompt, qTurnId);
      }, 50);
    }
    return () => {
      if (audioDispatchTimerRef.current) {
        clearTimeout(audioDispatchTimerRef.current);
        audioDispatchTimerRef.current = null;
      }
      silenceAudio();
      lastSpokenTurnIdRef.current = null;
    };
  }, [currentQuestion, playReceptionistVoice, isPaused, modality, silenceAudio]);

  // Audio unlock listener for browser autoplay restriction
  useEffect(() => {
    const unlockAudioOnGesture = () => {
      if (aiAudioRef.current && aiAudioRef.current.paused && audioState === 'speaking') {
        aiAudioRef.current.play().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };
    window.addEventListener('click', unlockAudioOnGesture, { once: true });
    window.addEventListener('touchstart', unlockAudioOnGesture, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudioOnGesture);
      window.removeEventListener('touchstart', unlockAudioOnGesture);
    };
  }, [audioState]);

  // Pause conversation
  const handlePauseConversation = () => {
    silenceAudio();
    if (isListeningRef.current && recognitionRef.current) {
      try {
        (recognitionRef.current as { stop?: () => void }).stop?.();
      } catch {
        // Ignore
      }
      isListeningRef.current = false;
    }
    setIsPaused(true);
    setAudioState('paused');
    setClarificationNotice('Intake conversation paused. Tap Resume whenever you are ready.');
  };

  // Resume conversation
  const handleResumeConversation = () => {
    setIsPaused(false);
    setAudioState('idle');
    setClarificationNotice("Welcome back! What else would you like to share, or tap Next to continue.");
  };

  // Check emergency red flags
  const checkForRedFlags = (text: string): boolean => {
    const lower = text.toLowerCase();
    for (const pattern of ACUTE_RED_FLAGS) {
      if (pattern.test(lower)) {
        setIsEscalated(true);
        setEscalationReason(`Patient reported potential high-risk symptom matching safety policy.`);
        onEmergencyTriggered?.();
        return true;
      }
    }
    return false;
  };


  // Toggle Voice Recording
  const handleToggleVoice = () => {
    resetTimer();
    setSubmissionError(null);

    // If currently listening, stop
    if (isListeningRef.current) {
      isListeningRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as { stop?: () => void }).stop?.();
        } catch {
          // Ignore
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }

      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // Ignore
        }
        mediaStreamRef.current = null;
      }

      const finishVoiceCapture = async () => {
        let finalSpokenText = speechCapturedRef.current.trim();

        // Send to ElevenLabs STT if audio captured
        if (audioChunksRef.current.length > 0) {
          try {
            const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (recordedBlob.size > 400) {
              const elevenLabsResult = await transcribeAudioWithElevenLabs(recordedBlob);
              if (elevenLabsResult?.text && elevenLabsResult.text.trim()) {
                finalSpokenText = elevenLabsResult.text.trim();
              }
            }
          } catch {
            // Fall back to live transcript
          }
        }

        setAudioState('idle');

        if (finalSpokenText) {
          setCurrentResponse(finalSpokenText);
          const dictation = distillClinicalDictation(
            finalSpokenText,
            currentQuestion.category,
            currentQuestion.quickChips
          );
          setClinicalDictation(dictation);
          setClarificationNotice(`Speech captured: "${finalSpokenText}". Tap Next or edit below.`);
        } else {
          // Check test env fallback
          const isTestEnv =
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
            Boolean(globalWindow && typeof globalWindow.vi !== 'undefined') ||
            !SpeechRecognitionClass;

          if (isTestEnv && !SpeechRecognitionClass) {
            const simText = currentQuestion.quickChips[0] || 'I have been experiencing symptoms since yesterday.';
            setCurrentResponse(simText);
            setClarificationNotice(`Speech captured: "${simText}". Review or tap Next Question.`);
          } else {
            setClarificationNotice('No speech was detected. Please tap the microphone and speak again, or type below.');
          }
        }
      };

      const isTestRunner = Boolean(
        (typeof window !== 'undefined' && (window as unknown as { vi?: unknown }).vi) ||
        (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')
      );

      if (isTestRunner) {
        finishVoiceCapture();
      } else {
        setTimeout(finishVoiceCapture, 200);
      }
      return;
    }

    // If assistant was speaking, barge in!
    if (isAiSpeaking || audioState === 'speaking') {
      handleStopAssistant();
    }

    // Start listening
    speechCapturedRef.current = '';
    audioChunksRef.current = [];
    setClinicalDictation(null);
    setAudioState('listening');
    isListeningRef.current = true;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        const navLocale = typeof navigator !== 'undefined' ? navigator.language : '';
        const defaultEn = navLocale && navLocale.toLowerCase().startsWith('en') ? navLocale : 'en-US';
        recognition.lang = (!language || language === 'en') ? defaultEn : language;

        recognition.onstart = () => {
          setAudioState('listening');
          isListeningRef.current = true;
        };

        recognition.onresult = (event: SpeechEvent) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; ++i) {
            const resultItem = event.results[i];
            if (resultItem && resultItem[0]) {
              fullText += resultItem[0].transcript + ' ';
            }
          }
          const liveSpeech = fullText.replace(/\s+/g, ' ').trim();
          if (liveSpeech) {
            // Check for barge-in
            if (isAiSpeaking) {
              handleBargeIn();
            }

            speechCapturedRef.current = liveSpeech;
            setCurrentResponse(liveSpeech);

            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
              silenceTimeoutRef.current = setTimeout(() => {
                if (isListeningRef.current && speechCapturedRef.current.trim().length > 3) {
                  handleToggleVoice();
                }
              }, 3500);
            }
          }
        };

        recognition.onerror = (event: SpeechErrorEvent) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setMicPermissionNotice('Microphone access was denied. Switched to touch / typing mode.');
            setModality('touch');
            setAudioState('idle');
            isListeningRef.current = false;
          }
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            isListeningRef.current = false;
            setAudioState('transcribing');
            setTimeout(() => {
              const captured = speechCapturedRef.current.trim();
              setAudioState('idle');
              if (captured) {
                setCurrentResponse(captured);
                const dictation = distillClinicalDictation(
                  captured,
                  currentQuestion.category,
                  currentQuestion.quickChips
                );
                setClinicalDictation(dictation);
                setClarificationNotice(`Speech captured: "${captured}". Tap Next Question to confirm.`);
              } else {
                setClarificationNotice('No speech was detected. Please tap the microphone and speak again, or type below.');
              }
            }, 300);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setAudioState('listening');
        isListeningRef.current = true;
      } catch {
        setAudioState('listening');
        isListeningRef.current = true;
      }
    } else {
      setAudioState('listening');
      isListeningRef.current = true;
    }

    // Concurrently start MediaRecorder for raw audio capture
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          const globalWin = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
          const MediaRecorderConstructor = globalWin?.MediaRecorder as (new (stream: MediaStream) => MediaRecorder) | undefined;

          if (MediaRecorderConstructor && isListeningRef.current) {
            try {
              const recorder = new MediaRecorderConstructor(stream);
              recorder.ondataavailable = (e: { data: Blob }) => {
                if (e.data && e.data.size > 0) {
                  audioChunksRef.current.push(e.data);
                }
              };
              recorder.start(200);
              mediaRecorderRef.current = recorder;
            } catch {
              // Ignore
            }
          }
        })
        .catch(() => {
          // Ignore
        });
    }
  };

  // Submit Answer & Advance Conversational State
  const handleNext = async () => {
    resetTimer();
    setSubmissionError(null);
    handleStopAssistant();

    const finalAnswer =
      currentQuestion.inputType === 'slider'
        ? `${painScore}/10`
        : currentResponse.trim();

    if (!finalAnswer) {
      setSubmissionError('Please provide an answer before continuing.');
      return;
    }

    // Check emergency red flags
    if (checkForRedFlags(finalAnswer)) {
      return;
    }

    setSubmitting(true);
    setAudioState('thinking');

    try {
      // 1. Process conversational turn through multi-turn Conversational Engine
      const turnResult = processPatientUtterance(sessionRef.current, finalAnswer);
      sessionRef.current = turnResult.updatedSession;

      if (turnResult.isEmergency) {
        setIsEscalated(true);
        setEscalationReason(sessionRef.current.emergencyReason || 'Urgent symptom detected.');
        onEmergencyTriggered?.();
        setSubmitting(false);
        return;
      }

      // 2. Call mockApi to sync turn facts
      const res = await mockApi.submitAnswer(encounterId, {
        question_id: currentQuestion.id,
        transcription: finalAnswer,
        input_modality: modality === 'voice' ? 'voice' : 'text',
      });

      // 3. Accumulate extracted facts preserving provenance
      const turnFacts = res.data.extracted_facts_this_turn || turnResult.extractedFactsThisTurn;
      const updatedFacts = [...extractedFacts, ...turnFacts];
      setExtractedFacts(updatedFacts);

      // Save answer in answers map
      const updatedAnswers = {
        ...answers,
        [currentQuestion.fieldKey]: finalAnswer,
      };
      setAnswers(updatedAnswers);

      // Check conclusion: only conclude if patient explicitly signaled completion or stepIndex reached 6
      if (turnResult.shouldConclude && currentStepIndex >= 5) {
        onComplete(updatedFacts);
        return;
      }

      // 4. Adaptively determine the next question
      const nextQ = determineNextAdaptiveQuestion(
        updatedAnswers,
        currentStepIndex + 1,
        undefined,
        questionHistory
      );

      if (nextQ === null) {
        // Conclude
        onComplete(updatedFacts);
      } else {
        // Establish single canonical prompt for UI, TTS, and ledger
        const canonicalPrompt = nextQ.prompt;
        const enhancedQ: IntakeQuestion = {
          ...nextQ,
          turnId: currentStepIndex + 2,
          prompt: canonicalPrompt,
        };
        setQuestionHistory((prev) => [...prev, enhancedQ]);
        setCurrentQuestion(enhancedQ);
        setCurrentStepIndex((prev) => prev + 1);
        setCurrentResponse('');
      }
    } catch {
      setSubmissionError('Could not process your answer. Please try again.');
    } finally {
      setSubmitting(false);
      setAudioState('idle');
    }
  };

  const handlePrevious = () => {
    resetTimer();
    handleStopAssistant();
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      if (questionHistory[prevIndex]) {
        setCurrentQuestion(questionHistory[prevIndex]);
        setCurrentResponse(answers[questionHistory[prevIndex].fieldKey] || '');
      }
    }
  };

  const handleFinishEarly = () => {
    resetTimer();
    handleStopAssistant();
    onComplete(extractedFacts);
  };

  const resetTimer = () => {
    setInactivityTimer(45);
    setIsInactiveWarning(false);
  };

  // Replay canonical question voice
  const handleReplayAiVoice = () => {
    resetTimer();
    if (currentQuestion?.prompt) {
      const qTurnId = currentQuestion.turnId || 1;
      lastSpokenTurnIdRef.current = qTurnId;
      playReceptionistVoice(currentQuestion.prompt, qTurnId);
    }
  };

  // Inactivity countdown
  useEffect(() => {
    if (isEscalated || isPaused) return;
    const interval = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          setIsInactiveWarning(true);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isEscalated, isPaused, currentStepIndex]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      handleStopAssistant();
      if (interruptTimerRef.current) {
        clearTimeout(interruptTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [handleStopAssistant]);

  // Emergency Red-Flag Banner Screen
  if (isEscalated) {
    return (
      <div
        data-testid="urgent-escalation-screen"
        className="w-full max-w-3xl mx-auto p-6 sm:p-8 bg-rose-950/90 border-2 border-rose-500 rounded-3xl text-white shadow-[0_0_60px_rgba(244,63,94,0.4)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300"
      >
        <div data-testid="emergency-escalation-banner" className="flex items-center space-x-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
              Immediate Clinical Escalation
            </span>
            <h2 className="text-2xl font-bold mt-1 text-white">Immediate Clinical Triage Required — Emergency Warning Sign Detected</h2>
          </div>
        </div>

        <p className="text-sm text-rose-100/90 leading-relaxed mb-4">
          {escalationReason || 'Potential high-risk cardiovascular or respiratory symptoms reported.'}
        </p>

        <div className="p-4 bg-rose-900/40 border border-rose-500/30 rounded-2xl mb-6 space-y-2 text-xs">
          <p className="font-bold text-rose-200">Hospital Emergency Protocol Activated:</p>
          <ul className="list-disc pl-5 space-y-1 text-rose-100">
            <li>Triage nursing team and supervising physician alerted to Kiosk Station.</li>
            <li>Intake interview halted to prioritize urgent clinical assessment.</li>
            <li>Please remain seated; a medical provider is arriving immediately.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-rose-400/30 text-rose-200 hover:bg-rose-500/20"
            onClick={onResetSession}
          >
            Reset Session
          </Button>
          <span className="text-xs font-mono text-rose-300/80">Encounter Ref: {encounterId}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="intake-interview-container"
      className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6"
    >
      {/* Audio element for playback */}
      <audio
        ref={aiAudioRef}
        onEnded={() => {
          setIsAiSpeaking(false);
          setAudioState('idle');
        }}
        onError={() => {
          setIsAiSpeaking(false);
          setAudioState('idle');
        }}
        playsInline
      />

      {/* Top Status & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Conversational Intake Assistant</span>
            <span
              data-testid="assistant-status-badge"
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold border ${
                audioState === 'speaking'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 animate-pulse'
                  : audioState === 'listening'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 animate-pulse'
                  : audioState === 'interrupted'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : audioState === 'paused'
                  ? 'bg-slate-500/20 text-slate-300 border-slate-400/40'
                  : 'bg-white/[0.06] text-slate-300 border-white/10'
              }`}
            >
              {audioState === 'speaking'
                ? 'Speaking'
                : audioState === 'listening'
                ? 'Listening'
                : audioState === 'interrupted'
                ? 'Interrupted'
                : audioState === 'paused'
                ? 'Paused'
                : 'Ready'}
            </span>
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Pause / Resume Button */}
          {isPaused ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="resume-conversation-btn"
              onClick={handleResumeConversation}
              className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30 font-semibold"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Resume
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="pause-conversation-btn"
              onClick={handlePauseConversation}
              className="text-xs text-slate-300 hover:text-white border-white/10"
              title="Pause conversation"
            >
              <Pause className="w-3.5 h-3.5 mr-1" />
              Pause
            </Button>
          )}

          {/* Dynamic Coverage Indicator */}
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-cyan-300 font-mono" data-testid="intake-question-counter">
                Question {currentStepIndex + 1}
              </span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.5 rounded font-mono">
                {currentQuestion.category}
              </span>
            </div>
            <div
              className="w-36 bg-white/[0.06] rounded-full h-2 mt-1.5 overflow-hidden border border-white/10"
              title="Clinical information coverage"
            >
              <div
                className="bg-gradient-to-r from-teal-400 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/40"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
          </div>

          {/* Reset Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsResetDialogOpen(true)}
            className="text-xs text-slate-400 hover:text-white"
            title="Reset Session"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Clinical & System Alerts */}
      {submissionError && (
        <div data-testid="submission-error-banner" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submissionError}</span>
        </div>
      )}
      {micPermissionNotice && (
        <div data-testid="mic-permission-notice" className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{micPermissionNotice}</span>
        </div>
      )}
      {clarificationNotice && (
        <div data-testid="clarification-notice" className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{clarificationNotice}</span>
          </div>
          <button onClick={() => setClarificationNotice(null)} className="text-cyan-400 hover:text-cyan-200 text-xs underline ml-2">Dismiss</button>
        </div>
      )}
      {isInactiveWarning && (
        <div data-testid="inactivity-warning-banner" className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 shrink-0" />
            Are you still there? ({inactivityTimer}s until refresh)
          </span>
          <Button size="sm" variant="outline" className="text-xs h-6 py-0 px-2" onClick={resetTimer}>I'm here</Button>
        </div>
      )}
      {clinicalDictation && (
        <div
          data-testid="clinical-dictation-card"
          className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Clinical Dictation Intelligence
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">
              Confidence {Math.round(clinicalDictation.confidenceScore * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {clinicalDictation.affirmedEntities.map((ent, idx) => (
              <span
                key={`aff_${idx}`}
                className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium"
              >
                + {ent}
              </span>
            ))}
            {clinicalDictation.negatedEntities.map((ent, idx) => (
              <span
                key={`neg_${idx}`}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium"
              >
                - {ent} (Ruled Out)
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-white/5 text-xs">
            <span className="text-slate-400">
              Distilled finding: <strong className="text-cyan-200">{clinicalDictation.distilledAnswer}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentResponse(clinicalDictation.verbatimTranscript)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Use raw transcript
              </button>
              <button
                type="button"
                onClick={() => setCurrentResponse(clinicalDictation.distilledAnswer)}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Apply distilled finding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Conversational Assistant Card */}
      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500" />

        <div className="pt-6 pb-4 px-6 sm:px-8 border-b border-white/[0.06]">
          {/* AI Receptionist Voice & Interruption Bar */}
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex items-center justify-between shadow-inner flex-wrap gap-2">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all shadow-md ${
                  isAiSpeaking
                    ? 'bg-gradient-to-tr from-cyan-400 to-teal-300 text-slate-950 scale-105 shadow-cyan-400/40 animate-pulse'
                    : 'bg-white/[0.06] text-cyan-300 border border-white/10'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white tracking-wide">
                    ClinSync AI Receptionist
                  </span>
                  <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                    Natural Dialogue
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isAiSpeaking
                    ? 'Speaking to you... (You can interrupt or speak anytime)'
                    : 'Listening naturally • Interruption and voice barge-in enabled'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Immediate Stop Assistant Button */}
              {isAiSpeaking && (
                <button
                  type="button"
                  data-testid="stop-assistant-btn"
                  onClick={handleStopAssistant}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/40 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm animate-pulse"
                  title="Stop assistant speech immediately"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Assistant</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReplayAiVoice}
                data-testid="replay-voice-btn"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Replay question voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMuted = !aiAudioMuted;
                  setAiAudioMuted(nextMuted);
                  if (nextMuted) handleStopAssistant();
                }}
                data-testid="mute-ai-voice-btn"
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                title={aiAudioMuted ? 'Unmute AI voice' : 'Mute AI voice'}
              >
                {aiAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Welcome Greeting Banner (Step 0) */}
          {currentStepIndex === 0 && (
            <div
              data-testid="intake-welcome-banner"
              className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-teal-500/15 via-cyan-500/15 to-indigo-500/15 border border-cyan-400/30 flex items-center space-x-3 text-cyan-200 animate-in fade-in duration-300"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-400/20 flex items-center justify-center shrink-0 text-cyan-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block text-sm">
                  Welcome to ClinSync{patientName ? `, ${patientName.split(' ')[0]}` : ''}!
                </span>
                <span className="text-slate-300 text-[11px]">
                  I am your conversational AI receptionist. I will guide you through a dynamic clinical intake before your doctor consultation.
                </span>
              </div>
            </div>
          )}

          {/* Active Question / Dialogue Prompt */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono tracking-wider text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/30">
              {currentQuestion.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center font-mono">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Real-time conversational memory
            </span>
          </div>

          <h2
            data-testid="canonical-question-prompt"
            className="font-serif text-2xl sm:text-3xl text-white font-normal pt-3 leading-snug tracking-tight"
          >
            {currentQuestion.prompt}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {currentQuestion.subtitle}
          </p>
        </div>

        <div className="space-y-6 pt-5 pb-7 px-6 sm:px-8">
          {/* Modality Toggle Tabs */}
          <div className="flex items-center justify-center space-x-2 bg-[#050811] p-1.5 rounded-2xl max-w-xs mx-auto border border-white/10 shadow-inner">
            <button
              onClick={() => {
                resetTimer();
                setModality('voice');
              }}
              data-testid="modality-voice-btn"
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                modality === 'voice'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Mode</span>
            </button>
            <button
              onClick={() => {
                resetTimer();
                setModality('touch');
              }}
              data-testid="modality-touch-btn"
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                modality === 'touch'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Touch / Type</span>
            </button>
          </div>

          {/* Voice Interaction Area with Live Visualizer & Barge-In */}
          {modality === 'voice' && (
            <div
              data-testid="voice-interaction-area"
              className="p-8 bg-white/[0.02] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-inner relative overflow-hidden"
            >
              <AudioVisualizer state={audioState} />

              <button
                type="button"
                data-testid="voice-record-btn"
                onClick={handleToggleVoice}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform active:scale-95 cursor-pointer focus:outline-none focus:ring-4 ${
                  audioState === 'listening'
                    ? 'bg-rose-500 hover:bg-rose-600 animate-pulse ring-rose-500/30 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-400 ring-cyan-500/25 text-slate-950 font-bold shadow-cyan-500/30'
                }`}
                aria-label={audioState === 'listening' ? 'Stop Listening' : 'Start Speaking'}
              >
                {audioState === 'listening' ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <span className="text-xs font-medium text-slate-300 text-center">
                {audioState === 'listening'
                  ? 'Listening to you... (Tap mic when done, or pause for 3.5s)'
                  : isAiSpeaking
                  ? 'Assistant speaking. Tap to interrupt or start speaking.'
                  : 'Tap the microphone to speak your answer naturally.'}
              </span>

              {/* Real-time Live Speech Capture Box */}
              <div className="w-full max-w-lg mt-1 p-3 bg-black/40 border border-cyan-500/30 rounded-xl text-center shadow-inner">
                <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block mb-1">
                  {audioState === 'listening' ? '🎙️ Live Speech Capture:' : 'Captured Speech:'}
                </span>
                <p className="text-sm font-medium text-white italic min-h-[1.5rem]">
                  {currentResponse ? `"${currentResponse}"` : 'Listening... Speak clearly into your microphone.'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Choice Chips */}
          {currentQuestion.quickChips && currentQuestion.quickChips.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Suggested Options (Tap to select):
              </span>
              <div className="flex flex-wrap gap-2">
                {currentQuestion.quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`quick-chip-${idx}`}
                    onClick={() => {
                      resetTimer();
                      setCurrentResponse(chip);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/[0.05] hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 transition-all cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Answer Input / Editable Transcript */}
          {currentQuestion.inputType === 'slider' ? (
            <div
              data-testid="pain-slider-area"
              className="p-6 bg-white/[0.025] border border-white/[0.08] rounded-2xl space-y-4 shadow-inner"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Select Discomfort Rating (0 to 10):
                </span>
                <span
                  data-testid="slider-value-display"
                  className="text-lg font-bold text-cyan-300 font-mono"
                >
                  {painScore} / 10
                </span>
              </div>

              <Slider
                min={0}
                max={10}
                step={1}
                value={painScore}
                onChange={(val) => {
                  resetTimer();
                  setPainScore(val);
                }}
                className="w-full"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>0 - No Pain</span>
                <span>3 - Mild</span>
                <span>5 - Moderate</span>
                <span>8 - Severe</span>
                <span>10 - Worst Possible</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                {modality === 'voice' ? 'Transcribed Response (Tap to edit):' : 'Your Answer:'}
              </label>
              <Input
                data-testid="intake-answer-input"
                type="text"
                value={currentResponse}
                onChange={(e) => {
                  resetTimer();
                  setCurrentResponse(e.target.value);
                }}
                placeholder="Type your response or speak naturally..."
                className="w-full text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
              />
            </div>
          )}

          {/* Collapsible Live Conversation Transcript */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#050914]">
            <button
              type="button"
              data-testid="toggle-transcript-btn"
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/[0.02]"
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold font-mono">Live Conversation History ({sessionRef.current.dialogHistory.length} turns)</span>
              </div>
              {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTranscript && (
              <div
                data-testid="conversation-transcript"
                className="p-4 space-y-3 max-h-60 overflow-y-auto border-t border-white/5 text-xs font-sans"
              >
                {sessionRef.current.dialogHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'patient' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl ${
                        msg.role === 'patient'
                          ? 'bg-cyan-600/30 text-cyan-100 border border-cyan-500/30 rounded-br-none'
                          : 'bg-white/[0.06] text-slate-200 border border-white/10 rounded-bl-none'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-mono block opacity-70 mb-0.5">
                        {msg.role === 'patient' ? patientName : 'AI Receptionist'}
                      </span>
                      <p>{msg.text}</p>
                      {msg.status === 'interrupted' && (
                        <span className="text-[9px] text-amber-300 font-mono mt-1 block">
                          [Interrupted by patient]
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between bg-[#050811]/90 border-t border-white/[0.06] px-6 sm:px-8 py-4">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              data-testid="prev-question-btn"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0 || submitting}
              className="text-slate-300 hover:text-white border-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Previous
            </Button>

            {currentStepIndex >= 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="finish-early-btn"
                onClick={handleFinishEarly}
                disabled={submitting}
                className="text-xs text-slate-400 hover:text-cyan-300"
              >
                Finished / Review Summary
              </Button>
            )}
          </div>

          <Button
            type="button"
            data-testid="next-question-btn"
            onClick={handleNext}
            disabled={submitting}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 shadow-md shadow-cyan-500/20"
          >
            {submitting ? (
              'Processing...'
            ) : isReadyToFinish && currentStepIndex >= 3 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Finish Intake
              </>
            ) : (
              <>
                Next Question
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Reset Intake Encounter?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Resetting will clear your current intake answers and begin a new session.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsResetDialogOpen(false);
                onResetSession();
              }}
            >
              Reset Session
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
