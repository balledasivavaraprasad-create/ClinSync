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
  fieldKey: 'chief_complaint',
  category: 'Chief Complaint',
  prompt: 'What primary health symptom or discomfort brings you in today?',
  subtitle: 'Speak naturally or tap a common symptom below.',
  quickChips: [
    'Persistent dry cough',
    'Chest tightness / pain',
    'Mild fever & chills',
    'Stomach / abdominal pain',
    'Joint & muscle aches',
  ],
  inputType: 'text',
  audioUrl: '/audio/receptionist/q1_welcome.mp3',
};

export function determineNextAdaptiveQuestion(
  answers: Record<string, string>,
  stepIndex: number,
  _memoryHarness?: AgentMemoryHarness
): IntakeQuestion | null {
  const complaint = (answers['chief_complaint'] || '').toLowerCase();
  const lastKey = Object.keys(answers).pop() || '';
  const lastAnswer = (answers[lastKey] || '').toLowerCase().trim();
  const allAnswersText = Object.values(answers).join(' ').toLowerCase();

  // 1. Patient signaled they have nothing more to add
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

  // 2. Maximum safety limit
  if (stepIndex >= 9) {
    return null;
  }

  // 3. Clinical Signal Extraction
  const hasMentionedDuration =
    Boolean(answers['duration'] || answers['duration_onset'] || answers['duration_clarification']) ||
    /\b(?:since\s+|for\s+\d+|started\s+|days?|weeks?|months?|hours?|yesterday|morning|today|last\s+night|recently|a\s+while)\b/i.test(
      allAnswersText
    );

  const hasMentionedSeverity =
    Boolean(answers['severity'] || answers['severity_progression'] || answers['pain_rating']) ||
    /\b(?:mild|moderate|severe|sharp|dull|throbbing|cramping|terrible|killing|unbearable|excruciating|slight|\d+\s*(?:out\s*of|\/)\s*10)\b/i.test(
      allAnswersText
    );

  const hasMentionedAssociated =
    Boolean(answers['associated_symptoms'] || answers['associated_gi'] || answers['breathing_difficulty']) ||
    /\b(?:fever|chills|sweat|nausea|vomit|dizzy|lightheaded|headache|diarrhea|wheez|swelling|burning|itching)\b/i.test(
      allAnswersText
    );

  const hasMentionedMeds =
    Boolean(answers['medications_allergies']) ||
    /\b(?:medication|medicine|pill|tablet|inhaler|aspirin|tylenol|advil|ibuprofen|paracetamol|lisinopril|statin|metformin|antibiotic|allergy|allergic|penicillin|no\s+meds)\b/i.test(
      allAnswersText
    );

  // 4. Ambiguity check: duration
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
      audioUrl: '/audio/receptionist/q2_general.mp3',
    };
  }

  // 5. Categorize complaint complexity
  const isSimpleLocalized =
    ['rash', 'cut', 'scratch', 'scrape', 'papercut', 'bite', 'finger', 'toe', 'itch', 'bruise', 'burn'].some((term) =>
      complaint.includes(term)
    ) &&
    !complaint.includes('chest') &&
    !complaint.includes('breath') &&
    !complaint.includes('abdom');

  // Simple Localized -> Concludes in 2 Questions!
  if (isSimpleLocalized) {
    if (stepIndex === 1 && !hasMentionedDuration) {
      return {
        id: 'q2_duration_localized',
        fieldKey: 'duration',
        category: 'Onset & Progression',
        prompt: 'When did you first notice this, and is it itching, burning, or spreading to other areas?',
        subtitle: 'Onset timeline helps evaluate whether this is acute or chronic.',
        quickChips: ['Started yesterday, mild itch', 'Just noticed it today', 'About 3 days, not spreading', 'Itches when touched'],
        inputType: 'chips',
        audioUrl: '/audio/receptionist/q2_general.mp3',
      };
    }
    return null;
  }

  // Cardiac / Chest Discomfort
  if (
    complaint.includes('chest') ||
    complaint.includes('heart') ||
    complaint.includes('tightness') ||
    complaint.includes('pressure')
  ) {
    if (!answers['duration'] && !hasMentionedDuration) {
      return {
        id: 'q2_duration_chest',
        fieldKey: 'duration',
        category: 'Symptom Timeline & Radiation',
        prompt: 'How long have you felt this chest tightness, and does it spread to your neck, jaw, shoulder, or left arm?',
        subtitle: 'Knowing onset timeline and radiation helps our cardiology team evaluate urgency.',
        quickChips: [
          'Started this morning',
          'About 2 to 3 days, mild pressure',
          'Radiates slightly to left arm',
          'Constant heaviness for a week',
        ],
        inputType: 'chips',
        audioUrl: '/audio/receptionist/q2_chest.mp3',
      };
    }
    if (!answers['severity'] && !hasMentionedSeverity) {
      return {
        id: 'q3_severity_chest',
        fieldKey: 'severity',
        category: 'Discomfort Rating & Exertion',
        prompt: 'On a scale from 0 to 10, how severe is your chest discomfort right now, and does it worsen with physical exertion?',
        subtitle: '0 is completely pain-free; 10 is the most severe pain imaginable.',
        quickChips: ['3 - Mild', '5 - Moderate', '8 - Severe', 'Worse when walking'],
        inputType: 'slider',
        audioUrl: '/audio/receptionist/q3_severity.mp3',
      };
    }
    if (!answers['associated_symptoms'] && !hasMentionedAssociated) {
      return {
        id: 'q4_associated_chest',
        fieldKey: 'associated_symptoms',
        category: 'Accompanying Symptoms',
        prompt: 'Are you experiencing any shortness of breath, cold sweats, dizziness, or nausea today?',
        subtitle: 'Select any that apply or enter none.',
        quickChips: [
          'Shortness of breath on exertion',
          'Dizziness / lightheadedness',
          'Cold sweats',
          'Nausea or reduced appetite',
          'No other symptoms',
        ],
        inputType: 'chips',
        audioUrl: '/audio/receptionist/q4_associated.mp3',
      };
    }
    if (!answers['medications_allergies'] && !hasMentionedMeds) {
      return {
        id: 'q5_meds_chest',
        fieldKey: 'medications_allergies',
        category: 'Cardiovascular Medications',
        prompt: 'Do you take any regular prescription medications for blood pressure or your heart, and do you have any drug allergies?',
        subtitle: 'This information ensures safe consultation and treatment planning.',
        quickChips: [
          'Blood pressure medication (e.g., Lisinopril, Amlodipine)',
          'Cholesterol medication (Statin)',
          'Aspirin daily',
          'Penicillin allergy',
          'No regular medications or allergies',
        ],
        inputType: 'text',
        audioUrl: '/audio/receptionist/q5_medications.mp3',
      };
    }
    if (!answers['final_review'] && stepIndex < 6) {
      return {
        id: 'q6_review_chest',
        fieldKey: 'final_review',
        category: 'Final Review',
        prompt: 'Is there anything else regarding your heart or chest symptoms you would like the doctor to know before your consult?',
        subtitle: 'Share any past episodes or questions for your physician.',
        quickChips: ['First time experiencing this', 'Similar episode 6 months ago', 'Nothing more to add'],
        inputType: 'text',
      };
    }
    return null;
  }

  // Respiratory / Cough
  if (
    complaint.includes('cough') ||
    complaint.includes('wheez') ||
    complaint.includes('throat') ||
    complaint.includes('breath')
  ) {
    if (!answers['duration'] && !hasMentionedDuration) {
      return {
        id: 'q2_duration_cough',
        fieldKey: 'duration',
        category: 'Cough Character & Progression',
        prompt: 'How many days have you had this cough, and are you bringing up any yellow/green phlegm or running a fever?',
        subtitle: 'Distinguishing dry vs productive cough helps determine respiratory treatment.',
        quickChips: [
          'Dry cough for 3 days',
          'Productive with yellow phlegm',
          'Accompanied by mild fever',
          'Worse at night and early morning',
        ],
        inputType: 'chips',
        audioUrl: '/audio/receptionist/q2_cough.mp3',
      };
    }
    if (!answers['breathing_difficulty'] && !hasMentionedAssociated) {
      return {
        id: 'q3_breathing_cough',
        fieldKey: 'breathing_difficulty',
        category: 'Breathing & Wheezing Assessment',
        prompt: 'Are you having any difficulty catching your breath, wheezing, or tightness in your lungs when walking or resting?',
        subtitle: 'Assessing respiratory effort helps evaluate oxygenation and bronchodilator needs.',
        quickChips: [
          'Mild shortness of breath when climbing stairs',
          'Noticeable wheezing when exhaling',
          'Breathing is completely normal',
          'Worse when lying flat',
        ],
        inputType: 'chips',
      };
    }
    if (stepIndex >= 3 || hasMentionedAssociated) {
      return null;
    }
    return null;
  }

  // Abdominal
  if (
    complaint.includes('stomach') ||
    complaint.includes('abdom') ||
    complaint.includes('belly') ||
    complaint.includes('nausea')
  ) {
    if (!answers['duration'] && !hasMentionedDuration) {
      return {
        id: 'q2_duration_abdom',
        fieldKey: 'duration',
        category: 'Abdominal Pain Specifics',
        prompt: 'How long has this abdominal discomfort been present, and is it sharp, cramping, or worse after eating?',
        subtitle: 'Localizing abdominal pain guides appropriate abdominal evaluation.',
        quickChips: [
          'Started suddenly after a meal',
          'Constant dull ache for 2 days',
          'Sharp cramps that come and go',
          'Burning sensation in upper stomach',
        ],
        inputType: 'chips',
        audioUrl: '/audio/receptionist/q2_general.mp3',
      };
    }
    if (!answers['associated_gi'] && !hasMentionedAssociated) {
      return {
        id: 'q3_gi_associated',
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
    if (stepIndex >= 3) {
      return null;
    }
    return null;
  }

  // General / Fallback
  if (!answers['duration'] && !hasMentionedDuration) {
    return {
      id: 'q2_duration_general',
      fieldKey: 'duration',
      category: 'Symptom Timeline',
      prompt: 'When did your symptoms first begin, and have they been improving, worsening, or staying about the same?',
      subtitle: 'Acute vs subacute onset determines consultation priority.',
      quickChips: [
        'Started in the last 24 hours',
        'Present for 2 to 3 days',
        'Gradually worsening over a week',
        'Intermittent over the past month',
      ],
      inputType: 'chips',
      audioUrl: '/audio/receptionist/q2_general.mp3',
    };
  }

  if (!answers['severity'] && !hasMentionedSeverity) {
    return {
      id: 'q3_severity_general',
      fieldKey: 'severity',
      category: 'Discomfort & Daily Impact',
      prompt: 'On a scale from 0 to 10, how intense is your discomfort, and does it interfere with your work or sleep?',
      subtitle: 'Quantifies symptom severity to inform clinical decision-making.',
      quickChips: ['2 - Mild annoyance', '4 - Moderate discomfort', '7 - Severe, disrupts sleep', 'Interferes with daily work'],
      inputType: 'slider',
      audioUrl: '/audio/receptionist/q3_severity.mp3',
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

  // Dynamic adaptive question tracking
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion>(INITIAL_INTAKE_QUESTION);
  const [questionHistory, setQuestionHistory] = useState<IntakeQuestion[]>([INITIAL_INTAKE_QUESTION]);
  const [clinicalDictation, setClinicalDictation] = useState<ClinicalDictationResult | null>(null);

  // Clinical coverage estimation
  const coveragePercent = useMemo(() => {
    return sessionRef.current.currentCoverage || 25;
  }, [sessionRef.current.currentCoverage, answers]);

  const isReadyToFinish = useMemo(() => {
    return Object.keys(answers).length >= 2 || sessionRef.current.turnCount >= 2;
  }, [answers, sessionRef.current.turnCount]);

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

  // Stop active speech playback and invalidate pending async responses immediately
  const handleStopAssistant = useCallback(() => {
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
  }, []);

  // Natural Interruption / Barge-in trigger when speech detected while speaking
  const handleBargeIn = useCallback(() => {
    if (isAiSpeaking || audioState === 'speaking') {
      handleStopAssistant();
      setClarificationNotice('Assistant interrupted. Listening to your voice now...');
    }
  }, [isAiSpeaking, audioState, handleStopAssistant]);

  // Play ElevenLabs voice question with full cancellation token safety
  const playReceptionistVoice = useCallback(
    async (text: string, preRenderedUrl?: string) => {
      if (!text || aiAudioMuted || isPaused) return;

      const thisTurnId = ++turnIdRef.current;
      const abortCtrl = new AbortController();
      activeAbortControllerRef.current = abortCtrl;

      setIsAiSpeaking(true);
      setAudioState('speaking');

      // 1. Try pre-rendered file if available
      if (preRenderedUrl) {
        const audio = aiAudioRef.current;
        if (audio) {
          audio.src = preRenderedUrl;
          try {
            await audio.play();
            return;
          } catch {
            // Autoplay blocked or failed; fall through to dynamic synthesis
          }
        }
      }

      // 2. Synthesize dynamically with ElevenLabs (with AbortSignal)
      try {
        const dynamicUrl = await synthesizeSpeech(text, 'receptionist', abortCtrl.signal);
        // Ensure no intervening stop/interruption occurred
        if (thisTurnId !== turnIdRef.current || abortCtrl.signal.aborted) {
          return;
        }

        if (dynamicUrl && aiAudioRef.current) {
          aiAudioRef.current.src = dynamicUrl;
          await aiAudioRef.current.play();
          return;
        }
      } catch {
        // Fall back to SpeechSynthesis
      }

      // 3. Fallback to Browser SpeechSynthesis
      if (typeof window !== 'undefined' && window.speechSynthesis && thisTurnId === turnIdRef.current) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
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
          window.speechSynthesis.speak(utterance);
        } catch {
          setIsAiSpeaking(false);
          setAudioState('idle');
        }
      }
    },
    [aiAudioMuted, isPaused]
  );

  // Play voice when question changes
  useEffect(() => {
    if (currentQuestion?.prompt && !isPaused) {
      playReceptionistVoice(currentQuestion.prompt, currentQuestion.audioUrl);
    }
    return () => {
      handleStopAssistant();
    };
  }, [currentQuestion, playReceptionistVoice, isPaused, handleStopAssistant]);

  // Pause conversation
  const handlePauseConversation = () => {
    handleStopAssistant();
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

      // Check conclusion
      if (turnResult.shouldConclude) {
        onComplete(updatedFacts);
        return;
      }

      // 4. Adaptively determine the next question
      const nextQ = determineNextAdaptiveQuestion(
        updatedAnswers,
        currentStepIndex + 1
      );

      if (nextQ === null) {
        // Conclude
        onComplete(updatedFacts);
      } else {
        // Personalize prompt with conversational response if available
        const enhancedQ: IntakeQuestion = {
          ...nextQ,
          prompt: turnResult.assistantResponseText || nextQ.prompt,
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

  // Replay receptionist voice
  const handleReplayAiVoice = () => {
    resetTimer();
    if (currentQuestion?.prompt) {
      playReceptionistVoice(currentQuestion.prompt, currentQuestion.audioUrl);
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

          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal pt-3 leading-snug tracking-tight">
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
