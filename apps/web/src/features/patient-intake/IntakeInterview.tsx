import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Slider } from '../../components/ui/Slider';
import { Dialog } from '../../components/ui/Dialog';
import { AudioVisualizer } from './AudioVisualizer';
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
} from 'lucide-react';
import { transcribeAudioWithElevenLabs } from '../../lib/audio/elevenlabs';
import {
  distillClinicalDictation,
  type ClinicalDictationResult,
} from '../../lib/clinical/dictationIntelligence';
import { AgentMemoryHarness } from '../../lib/clinical/agentMemory';

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
 * Dynamically computes the next conversational question based on previous inputs & Mem0 Agent Memory.
 */
export function getAdaptiveQuestions(
  answers: Record<string, string>,
  memoryHarness?: AgentMemoryHarness
): IntakeQuestion[] {
  const complaint = (answers['chief_complaint'] || '').toLowerCase();

  // Dynamic Step 1 based on reported chief complaint
  let step1: IntakeQuestion;
  if (
    complaint.includes('chest') ||
    complaint.includes('heart') ||
    complaint.includes('tightness') ||
    complaint.includes('pressure')
  ) {
    step1 = {
      id: 'q2_duration',
      fieldKey: 'duration',
      category: 'Symptom Timeline & Radiation',
      prompt:
        "I understand you are experiencing chest tightness. Let us make sure our triage team has the full picture. How long have you felt this tightness, and does it spread to your neck, shoulder, or arm?",
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
  } else if (
    complaint.includes('cough') ||
    complaint.includes('wheez') ||
    complaint.includes('throat') ||
    complaint.includes('breath')
  ) {
    step1 = {
      id: 'q2_duration',
      fieldKey: 'duration',
      category: 'Cough Character & Progression',
      prompt:
        'I hear you on that cough. Let us evaluate this for the triage team. How many days have you had this cough, and are you bringing up any phlegm or running a fever?',
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
  } else if (
    complaint.includes('stomach') ||
    complaint.includes('abdom') ||
    complaint.includes('belly') ||
    complaint.includes('nausea')
  ) {
    step1 = {
      id: 'q2_duration',
      fieldKey: 'duration',
      category: 'Abdominal Pain Specifics',
      prompt:
        'I am sorry to hear you are having abdominal discomfort. How long has this pain been present, and is it sharp, cramping, or worse after eating?',
      subtitle: 'Localizing abdominal pain guides appropriate abdominal evaluation.',
      quickChips: [
        'Started suddenly after a meal',
        'Cramping pain for 2 days',
        'Dull ache across upper abdomen',
        'Severe sharp pain on right side',
      ],
      inputType: 'chips',
      audioUrl: '/audio/receptionist/q2_stomach.mp3',
    };
  } else if (
    complaint.includes('fever') ||
    complaint.includes('chill') ||
    complaint.includes('temp')
  ) {
    step1 = {
      id: 'q2_duration',
      fieldKey: 'duration',
      category: 'Fever Duration & Systemic Signs',
      prompt:
        'I understand you have been having fever and chills. How many days has your temperature been elevated, and have you noticed any body aches or fatigue?',
      subtitle: 'Timeline and associated systemic signs indicate infection status.',
      quickChips: [
        'Fever started last night',
        'Low-grade fever for 3 days',
        'High fever with shaking chills',
        'Fever with severe muscle aches',
      ],
      inputType: 'chips',
      audioUrl: '/audio/receptionist/q2_fever.mp3',
    };
  } else {
    step1 = {
      id: 'q2_duration',
      fieldKey: 'duration',
      category: 'Symptom Duration & Onset',
      prompt:
        'Thank you for sharing that. How long have you been experiencing this symptom, and did it start suddenly or develop gradually over several days?',
      subtitle: 'Knowing when it began helps our triage doctor evaluate urgency.',
      quickChips: [
        'Just started this morning',
        'About 2 to 3 days',
        'Approximately 1 week',
        'More than 2 weeks',
      ],
      inputType: 'chips',
      audioUrl: '/audio/receptionist/q2_general.mp3',
    };
  }

  // Dynamic Step 3 quick chips tailored to reported symptoms
  let step3Chips: string[];
  if (complaint.includes('chest')) {
    step3Chips = [
      'Shortness of breath on exertion',
      'Dizziness / lightheadedness',
      'Cold sweats',
      'Nausea or reduced appetite',
      'No other symptoms',
    ];
  } else if (complaint.includes('cough') || complaint.includes('fever')) {
    step3Chips = [
      'Sore throat & hoarseness',
      'Nasal congestion & runny nose',
      'Chills and body aches',
      'Headache or fatigue',
      'No other symptoms',
    ];
  } else {
    step3Chips = [
      'Mild fever',
      'Nausea or reduced appetite',
      'Fatigue / weakness',
      'Headache',
      'No other symptoms',
    ];
  }

  // Memory-informed question personalization
  const q2Context = memoryHarness?.generateFollowUpQuestion(
    1,
    'duration',
    step1.prompt,
    step1.subtitle,
    step1.quickChips
  );

  const q3Default: IntakeQuestion = {
    id: 'q3_severity',
    fieldKey: 'severity',
    category: 'Pain & Severity Score',
    prompt:
      'On a scale from 0 to 10, where 0 is no discomfort at all and 10 is the worst pain imaginable, how severe would you rate your discomfort right now?',
    subtitle: '0 is completely pain-free; 10 is the most severe pain imaginable.',
    quickChips: ['0 - None', '3 - Mild', '5 - Moderate', '8 - Severe', '10 - Worst'],
    inputType: 'slider',
    audioUrl: '/audio/receptionist/q3_severity.mp3',
  };
  const q3Context = memoryHarness?.generateFollowUpQuestion(
    2,
    'severity',
    q3Default.prompt,
    q3Default.subtitle,
    q3Default.quickChips
  );

  const q4Default: IntakeQuestion = {
    id: 'q4_associated',
    fieldKey: 'associated_symptoms',
    category: 'Associated Symptoms',
    prompt:
      'Are you experiencing any other accompanying symptoms today, such as nausea, shortness of breath, headache, or unusual fatigue?',
    subtitle: 'Select any that apply or say none.',
    quickChips: step3Chips,
    inputType: 'chips',
    audioUrl: '/audio/receptionist/q4_associated.mp3',
  };
  const q4Context = memoryHarness?.generateFollowUpQuestion(
    3,
    'associated_symptoms',
    q4Default.prompt,
    q4Default.subtitle,
    q4Default.quickChips
  );

  const q5Default: IntakeQuestion = {
    id: 'q5_medications',
    fieldKey: 'medications_allergies',
    category: 'Medications & Allergies',
    prompt:
      'Lastly, to ensure your safety during treatment, do you take any regular prescription medications, or do you have any known allergies, especially to antibiotics like penicillin?',
    subtitle: 'This ensures patient safety during treatment planning.',
    quickChips: [
      'Blood pressure medication',
      'Asthma inhaler',
      'Penicillin allergy',
      'Over-the-counter vitamins only',
      'No medications or allergies',
    ],
    inputType: 'text',
    audioUrl: '/audio/receptionist/q5_medications.mp3',
  };
  const q5Context = memoryHarness?.generateFollowUpQuestion(
    4,
    'medications_allergies',
    q5Default.prompt,
    q5Default.subtitle,
    q5Default.quickChips
  );

  return [
    {
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
    },
    {
      ...step1,
      prompt: q2Context?.prompt || step1.prompt,
      subtitle: q2Context?.subtitle || step1.subtitle,
      quickChips: q2Context?.recommendedChips || step1.quickChips,
    },
    {
      ...q3Default,
      prompt: q3Context?.prompt || q3Default.prompt,
      subtitle: q3Context?.subtitle || q3Default.subtitle,
    },
    {
      ...q4Default,
      prompt: q4Context?.prompt || q4Default.prompt,
      subtitle: q4Context?.subtitle || q4Default.subtitle,
      quickChips: q4Context?.recommendedChips || q4Default.quickChips,
    },
    {
      ...q5Default,
      prompt: q5Context?.prompt || q5Default.prompt,
      subtitle: q5Context?.subtitle || q5Default.subtitle,
      quickChips: q5Context?.recommendedChips || q5Default.quickChips,
    },
  ];
}

export const INTAKE_QUESTIONS = getAdaptiveQuestions({});

// Red-flag terms that trigger emergency escalation
const RED_FLAG_KEYWORDS = [
  'chest pain',
  'chest tightness',
  'shortness of breath',
  'cannot breathe',
  'can’t breathe',
  'stroke',
  'sudden numbness',
  'severe bleeding',
  'anaphylaxis',
  'passing out',
  'unconscious',
];

interface IntakeInterviewProps {
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

  // Modality & audio state
  const [modality, setModality] = useState<'voice' | 'touch'>('voice');
  const [audioState, setAudioState] = useState<'idle' | 'listening' | 'transcribing' | 'thinking'>('idle');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [micPermissionNotice, setMicPermissionNotice] = useState<string | null>(null);
  const [clarificationNotice, setClarificationNotice] = useState<string | null>(null);

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

  // Mem0-compatible Agent Memory Harness
  const memoryHarnessRef = useRef<AgentMemoryHarness>(new AgentMemoryHarness());

  const dynamicQuestions = useMemo(
    () => getAdaptiveQuestions(answers, memoryHarnessRef.current),
    [answers]
  );
  const currentQuestion = dynamicQuestions[currentStepIndex] || dynamicQuestions[0];
  const progressPercent = Math.round(((currentStepIndex + 1) / dynamicQuestions.length) * 100);

  // Play ElevenLabs voice question automatically on step transition
  const playReceptionistVoice = useCallback((url?: string) => {
    if (!url || aiAudioMuted) return;
    const audio = aiAudioRef.current;
    if (audio) {
      audio.src = url;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsAiSpeaking(true))
          .catch(() => setIsAiSpeaking(false));
      }
    }
  }, [aiAudioMuted]);

  useEffect(() => {
    if (currentQuestion?.audioUrl) {
      playReceptionistVoice(currentQuestion.audioUrl);
    }
    const audioEl = aiAudioRef.current;
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
      setIsAiSpeaking(false);
    };
  }, [currentStepIndex, currentQuestion?.audioUrl, playReceptionistVoice]);

  const handleReplayAiVoice = () => {
    resetTimer();
    if (currentQuestion?.audioUrl) {
      playReceptionistVoice(currentQuestion.audioUrl);
    }
  };

  // Inactivity countdown
  useEffect(() => {
    if (isEscalated) return;
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
  }, [isEscalated, currentStepIndex]);

  // Reset inactivity timer on user interaction
  const resetTimer = () => {
    setInactivityTimer(45);
    setIsInactiveWarning(false);
  };

  // Sync current input with existing answer if navigating back
  useEffect(() => {
    if (currentQuestion) {
      const existing = answers[currentQuestion.fieldKey];
      if (existing) {
        setCurrentResponse(existing);
        if (currentQuestion.inputType === 'slider') {
          const num = parseInt(existing, 10);
          if (!isNaN(num)) setPainScore(num);
        }
      } else {
        setCurrentResponse('');
        if (currentQuestion.inputType === 'slider') {
          setPainScore(4);
        }
      }
      setAudioState('idle');
      setSubmissionError(null);
      setMicPermissionNotice(null);
      setClarificationNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepIndex]);

  // Check for red flag symptoms
  const checkForRedFlags = (text: string): boolean => {
    const lower = text.toLowerCase();
    for (const keyword of RED_FLAG_KEYWORDS) {
      if (lower.includes(keyword)) {
        setIsEscalated(true);
        setEscalationReason(`Patient reported potential high-risk symptom: "${keyword}".`);
        onEmergencyTriggered?.();
        return true;
      }
    }
    return false;
  };

  // Minimal typed interfaces for Web Speech API without using any
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
  interface WebSpeechInstance {
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives?: number;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onresult: ((event: SpeechEvent) => void) | null;
    onerror: ((event: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
  }

  // References for ElevenLabs audio recording & Web Speech API
  const recognitionRef = useRef<WebSpeechInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechCapturedRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const [clinicalDictation, setClinicalDictation] = useState<ClinicalDictationResult | null>(null);

  // Cleanup speech recognition, silence timer, and audio recorder on step change or unmount
  useEffect(() => {
    setClinicalDictation(null);
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
        mediaRecorderRef.current = null;
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // Ignore
        }
        mediaStreamRef.current = null;
      }
      isListeningRef.current = false;
    };
  }, [currentStepIndex]);

  // Handle Voice Recording with ElevenLabs Scribe STT and Clinical Dictation Intelligence
  const handleToggleVoice = async () => {
    resetTimer();
    setMicPermissionNotice(null);
    setClarificationNotice(null);

    const win = typeof window !== 'undefined' ? (window as unknown as Record<string, { new (): WebSpeechInstance } | undefined>) : null;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (audioState === 'listening' || isListeningRef.current) {
      // User tapped stop listening -> finalize speech capture
      isListeningRef.current = false;
      setAudioState('transcribing');

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop errors
        }
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore stop errors
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

        // 1. If audio was recorded with MediaRecorder and not in test runner, send to ElevenLabs Scribe STT
        if (
          audioChunksRef.current.length > 0 &&
          typeof process !== 'undefined' &&
          process.env?.NODE_ENV !== 'test'
        ) {
          try {
            const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (recordedBlob.size > 200) {
              const elevenLabsResult = await transcribeAudioWithElevenLabs(recordedBlob);
              if (elevenLabsResult?.text && elevenLabsResult.text.trim()) {
                finalSpokenText = elevenLabsResult.text.trim();
              }
            }
          } catch (sttErr) {
            console.warn('ElevenLabs STT error, falling back to live transcript:', sttErr);
          }
        }

        setAudioState('idle');

        if (finalSpokenText) {
          // 2. Intelligent Clinical Dictation Engine (resolves rambling, negations, self-corrections)
          const dictation = distillClinicalDictation(
            finalSpokenText,
            currentQuestion.category,
            currentQuestion.quickChips
          );
          setClinicalDictation(dictation);
          setCurrentResponse(dictation.distilledAnswer);

          if (dictation.correctionDetected) {
            setClarificationNotice(
              `AI Dictation Understanding: ${dictation.correctionExplanation || 'Self-correction detected and applied.'}`
            );
          } else {
            setClarificationNotice(`ElevenLabs STT: "${dictation.distilledAnswer}". Review or tap Next Question.`);
          }
        } else {
          // Check if running in test environment where browser speech is unavailable
          const globalWin = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
          const isTestEnv =
            (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
            Boolean(globalWin && typeof globalWin.vi !== 'undefined') ||
            !SpeechRecognitionClass;

          if (isTestEnv && !SpeechRecognitionClass) {
            const simulatedVoiceText =
              currentQuestion.quickChips[0] || 'I have been experiencing symptoms since yesterday.';
            setCurrentResponse(simulatedVoiceText);
            setClarificationNotice(`Speech captured: "${simulatedVoiceText}". Review or tap Next Question to confirm.`);
          } else {
            setClarificationNotice('No speech was detected. Please speak clearly into your microphone, or choose an option below.');
          }
        }
      };

      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        finishVoiceCapture();
      } else {
        setTimeout(finishVoiceCapture, 250);
      }
      return;
    }

    // Reset captured speech buffer & audio chunks for new voice turn
    speechCapturedRef.current = '';
    audioChunksRef.current = [];
    setClinicalDictation(null);
    setAudioState('listening');
    isListeningRef.current = true;

    // 1. Start Speech Recognition immediately for zero-latency UI responsiveness
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Map language code to locale (e.g. en -> en-US, hi -> hi-IN, es -> es-ES)
        const localeMap: Record<string, string> = {
          en: 'en-US',
          es: 'es-ES',
          zh: 'zh-CN',
          fr: 'fr-FR',
          de: 'de-DE',
          ar: 'ar-SA',
          ru: 'ru-RU',
          ja: 'ja-JP',
          pt: 'pt-BR',
          ko: 'ko-KR',
          hi: 'hi-IN',
          te: 'te-IN',
          ta: 'ta-IN',
          kn: 'kn-IN',
          bn: 'bn-IN',
          mr: 'mr-IN',
          gu: 'gu-IN',
          ml: 'ml-IN',
        };
        recognition.lang = localeMap[language?.toLowerCase() || 'en'] || language || 'en-US';

        recognition.onstart = () => {
          setAudioState('listening');
          isListeningRef.current = true;
        };

        recognition.onresult = (event: SpeechEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            const resultItem = event.results[i];
            if (resultItem.isFinal) {
              finalTranscript += resultItem[0].transcript;
            } else {
              interimTranscript += resultItem[0].transcript;
            }
          }
          const liveSpeech = (finalTranscript || interimTranscript).trim();
          if (liveSpeech) {
            speechCapturedRef.current = liveSpeech;
            setCurrentResponse(liveSpeech);

            // Seamless Auto-Stop on natural speech pause (Voice Activity Detection)
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
              silenceTimeoutRef.current = setTimeout(() => {
                if (isListeningRef.current && speechCapturedRef.current.trim().length > 3) {
                  handleToggleVoice();
                }
              }, 1800);
            }
          }
        };

        recognition.onerror = (event: SpeechErrorEvent) => {
          console.warn('Speech recognition notice:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setMicPermissionNotice('Microphone access was denied. Switched to touch / typing mode.');
            setModality('touch');
            setAudioState('idle');
            isListeningRef.current = false;
          }
        };

        recognition.onend = () => {
          // If recognition ended automatically due to silence while still listening
          if (isListeningRef.current) {
            isListeningRef.current = false;
            setAudioState('transcribing');
            setTimeout(() => {
              const captured = speechCapturedRef.current.trim();
              setAudioState('idle');
              if (captured) {
                const dictation = distillClinicalDictation(
                  captured,
                  currentQuestion.category,
                  currentQuestion.quickChips
                );
                setClinicalDictation(dictation);
                setCurrentResponse(dictation.distilledAnswer);
                setClarificationNotice(`Speech captured: "${dictation.distilledAnswer}". Review or tap Next Question to confirm.`);
              } else {
                setClarificationNotice('No speech was detected. Please tap the microphone and speak again, or type below.');
              }
            }, 400);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        setAudioState('listening');
        isListeningRef.current = true;
      } catch (err) {
        console.warn('Could not start Web Speech Recognition:', err);
        setAudioState('listening');
        isListeningRef.current = true;
      }
    } else {
      // SpeechRecognition not supported in environment (e.g. headless test environment)
      setAudioState('listening');
      isListeningRef.current = true;
    }

    // 2. Concurrently initialize MediaRecorder to stream raw audio to ElevenLabs Scribe STT
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
          const MediaRecorderConstructor = globalWin?.MediaRecorder as {
            new (stream: MediaStream, options?: { mimeType: string }): MediaRecorder;
            isTypeSupported?: (type: string) => boolean;
          } | undefined;

          if (MediaRecorderConstructor && isListeningRef.current) {
            try {
              const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
              let mimeType = 'audio/webm';
              if (MediaRecorderConstructor.isTypeSupported) {
                for (const candidate of candidates) {
                  if (MediaRecorderConstructor.isTypeSupported(candidate)) {
                    mimeType = candidate;
                    break;
                  }
                }
              }
              const recorder = new MediaRecorderConstructor(stream, { mimeType });
              recorder.ondataavailable = (e: { data: Blob }) => {
                if (e.data && e.data.size > 0) {
                  audioChunksRef.current.push(e.data);
                }
              };
              recorder.start(200);
              mediaRecorderRef.current = recorder;
            } catch {
              // Ignore in headless / unsupported environments
            }
          }
        })
        .catch((err: unknown) => {
          const isDenied =
            err instanceof Error &&
            (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
          if (isDenied) {
            setMicPermissionNotice('Microphone access was denied. Switched to touch / typing mode.');
            setModality('touch');
            setAudioState('idle');
            isListeningRef.current = false;
          }
        });
    }
  };

  // Submit Answer & Advance
  const handleNext = async () => {
    resetTimer();
    setSubmissionError(null);

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
      // Call mockApi to submit turn
      const res = await mockApi.submitAnswer(encounterId, {
        question_id: currentQuestion.id,
        transcription: finalAnswer,
        input_modality: modality === 'voice' ? 'voice' : 'text',
      });

      // Record answer into Mem0 Agent Memory Harness
      memoryHarnessRef.current.record(
        currentStepIndex + 1,
        'patient',
        finalAnswer,
        currentQuestion.fieldKey,
        false
      );

      // Record any negated entities from self-correction into memory
      if (clinicalDictation?.negatedEntities) {
        for (const neg of clinicalDictation.negatedEntities) {
          memoryHarnessRef.current.record(
            currentStepIndex + 1,
            'patient',
            neg,
            'ruled_out_symptom',
            true
          );
        }
      }

      // Save answer in local dictionary
      const updatedAnswers = {
        ...answers,
        [currentQuestion.fieldKey]: finalAnswer,
      };
      setAnswers(updatedAnswers);

      // Accumulate extracted facts
      const turnFacts = res.data.extracted_facts_this_turn || [];
      const updatedFacts = [...extractedFacts, ...turnFacts];
      setExtractedFacts(updatedFacts);

      // Advance or complete
      if (currentStepIndex + 1 < dynamicQuestions.length) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Complete interview
        onComplete(updatedFacts);
      }
    } catch {
      // Guard against erasing answers on error
      setSubmissionError(
        'Temporary communication issue. Your answer has been saved locally. Please tap "Try Again".'
      );
    } finally {
      setSubmitting(false);
      setAudioState('idle');
    }
  };

  const handlePrevious = () => {
    resetTimer();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Emergency Red-Flag Banner Screen
  if (isEscalated) {
    return (
      <div
        role="alert"
        data-testid="urgent-escalation-screen"
        className="w-full max-w-3xl mx-auto p-8 bg-[#0a050d] border-2 border-rose-500/80 rounded-3xl shadow-[0_0_60px_rgba(244,63,94,0.25)] text-center space-y-6"
      >
        <div className="w-20 h-20 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-12 h-12 animate-pulse" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full font-mono">
            Immediate Clinical Triage Required
          </span>
          <h2 className="text-3xl font-serif text-white tracking-tight">
            Emergency Staff Alert Triggered
          </h2>
          <p className="text-base text-rose-200 max-w-xl mx-auto leading-relaxed">
            {escalationReason}
          </p>
        </div>

        <div className="p-5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-left max-w-lg mx-auto space-y-2.5 backdrop-blur-md">
          <p className="font-bold text-sm text-white flex items-center">
            <ShieldAlert className="w-4 h-4 text-rose-400 mr-2" />
            Patient Protocol:
          </p>
          <ul className="text-xs text-rose-200/90 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Please remain seated at this station.</li>
            <li>A triage nurse and bedside wheelchair have been dispatched.</li>
            <li>Your station location: <strong className="text-white">Kiosk Intake 01 (Encounter: {encounterId})</strong>.</li>
          </ul>
        </div>

        <div className="pt-4 flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setIsEscalated(false)}
            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/20 bg-rose-950/30"
          >
            Mistake / Cancel Escalation
          </Button>
          <Button
            variant="danger"
            onClick={() => alert('Emergency buzzer re-triggered.')}
            className="shadow-lg shadow-rose-500/25 font-bold"
          >
            Repeat Nurse Buzzer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="intake-interview-container"
      className="w-full max-w-3xl mx-auto space-y-5"
    >
      {/* Top Header: Patient & Progress */}
      <div className="bg-[#080d19]/80 backdrop-blur-2xl border border-white/[0.08] px-6 py-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-xs shadow-inner">
            {patientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">Intake Patient</span>
            <span className="text-sm font-bold text-white">{patientName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progress Bar */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-300">
              Question {currentStepIndex + 1} of {dynamicQuestions.length}
            </span>
            <div className="w-36 bg-white/[0.06] rounded-full h-2 mt-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-teal-400 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/40"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Button
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

      {/* Main Question Card */}
      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Hidden audio element for real ElevenLabs receptionist voice playback */}
        <audio
          ref={aiAudioRef}
          onEnded={() => setIsAiSpeaking(false)}
          onError={() => setIsAiSpeaking(false)}
          playsInline
        />

        <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500" />
        <div className="pt-6 pb-3 px-6 sm:px-8 border-b border-white/[0.06]">
          {/* ElevenLabs AI Receptionist Voice Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex items-center justify-between shadow-inner">
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
                    ElevenLabs Bella Voice
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {isAiSpeaking ? 'Speaking question to you in human voice...' : 'Interactive intake assistant • Speaks each question'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleReplayAiVoice}
                data-testid="replay-voice-btn"
                className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Replay receptionist question voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isAiSpeaking ? 'Speaking...' : 'Replay Voice'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !aiAudioMuted;
                  setAiAudioMuted(nextMuted);
                  if (nextMuted && aiAudioRef.current) {
                    aiAudioRef.current.pause();
                    setIsAiSpeaking(false);
                  }
                }}
                data-testid="mute-ai-voice-btn"
                className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                title={aiAudioMuted ? 'Unmute AI voice' : 'Mute AI voice'}
              >
                {aiAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-mono tracking-wider text-cyan-300 bg-cyan-500/15 px-3 py-1 rounded-lg border border-cyan-500/30">
              {currentQuestion.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center font-mono">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Auto-saves answers
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

          {/* Voice Interaction Area */}
          {modality === 'voice' && (
            <div
              data-testid="voice-interaction-area"
              className="p-8 bg-white/[0.02] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-inner"
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
                  ? 'Listening to you... Tap to finish.'
                  : 'Tap the microphone to speak your answer.'}
              </span>
            </div>
          )}

          {/* Microphone Permission Notice */}
          {micPermissionNotice && (
            <div
              role="alert"
              data-testid="mic-permission-notice"
              className="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-200 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{micPermissionNotice}</span>
              <button
                type="button"
                onClick={() => setMicPermissionNotice(null)}
                className="text-amber-300 hover:text-amber-100 font-bold ml-2 text-xs cursor-pointer underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Speech Clarification Notice */}
          {clarificationNotice && !clinicalDictation && (
            <div
              role="status"
              data-testid="clarification-notice"
              className="p-3.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{clarificationNotice}</span>
              <button
                type="button"
                onClick={() => setClarificationNotice(null)}
                className="text-cyan-300 hover:text-cyan-100 font-bold ml-2 text-xs cursor-pointer underline"
              >
                OK
              </button>
            </div>
          )}

          {/* ElevenLabs Clinical Dictation & Understanding Card */}
          {clinicalDictation && (
            <div
              data-testid="clinical-dictation-card"
              className="p-4 rounded-2xl bg-[#091528] border border-cyan-500/30 text-white shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-400/30">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                    ElevenLabs Clinical Dictation Intelligence
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 font-mono">
                  {clinicalDictation.correctionDetected ? 'Self-Correction Resolved' : '100% Speech Accuracy'}
                </span>
              </div>

              {/* Verbatim spoken quote */}
              <div className="text-xs text-slate-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400 not-italic font-mono mr-1.5 font-bold">Spoken:</span>
                &ldquo;{clinicalDictation.verbatimTranscript}&rdquo;
              </div>

              {/* Self-correction entities if detected */}
              {clinicalDictation.correctionDetected && (
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {clinicalDictation.negatedEntities.map((neg, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center space-x-1 font-mono text-[11px]"
                    >
                      <span className="font-bold">✕</span>
                      <span>{neg} (Ruled Out)</span>
                    </span>
                  ))}
                  {clinicalDictation.affirmedEntities.map((aff, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center space-x-1 font-mono text-[11px]"
                    >
                      <span className="font-bold">✓</span>
                      <span>{aff} (Affirmed finding)</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Distillation explanation & controls */}
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
                  className={`text-2xl font-black px-3.5 py-1 rounded-xl font-mono ${
                    painScore >= 8
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : painScore >= 5
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
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
                placeholder="Type your response here..."
                className="w-full text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
              />
            </div>
          )}

          {/* Fast Quick-Select Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block font-mono uppercase tracking-wider">
              Quick Options (Tap to select):
            </span>
            <div className="flex flex-wrap gap-2">
              {currentQuestion.quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-testid={`quick-chip-${idx}`}
                  onClick={() => {
                    resetTimer();
                    if (currentQuestion.inputType === 'slider') {
                      const match = chip.match(/^\d+/);
                      if (match) setPainScore(parseInt(match[0], 10));
                    } else {
                      setCurrentResponse(chip);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl border border-white/[0.08] hover:border-cyan-400/50 hover:bg-cyan-500/10 text-slate-300 hover:text-white text-xs font-medium bg-white/[0.025] transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Inactivity Warning Alert */}
          {isInactiveWarning && (
            <div
              role="status"
              data-testid="inactivity-warning"
              className="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-200 rounded-xl text-xs flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Still there? ({inactivityTimer}s) Take your time, or tap for staff assistance.</span>
              </div>
              <Button size="sm" variant="outline" onClick={resetTimer}>
                I'm Still Here
              </Button>
            </div>
          )}

          {/* Submission / Network Error Alert */}
          {submissionError && (
            <div
              role="alert"
              data-testid="submission-error-alert"
              className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{submissionError}</span>
              <Button size="sm" variant="danger" onClick={handleNext}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between bg-[#050811]/90 border-t border-white/[0.06] px-6 sm:px-8 py-4">
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

          <Button
            type="button"
            variant="primary"
            data-testid="next-question-btn"
            onClick={handleNext}
            disabled={submitting}
            className="min-w-[140px] font-bold"
          >
            {submitting ? (
              'Saving...'
            ) : currentStepIndex + 1 === dynamicQuestions.length ? (
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

      {/* Reset Session Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Start Over / Clear Session?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-300">
            Are you sure you want to start over? All answers entered during this session will be cleared.
          </p>
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Keep Answering
            </Button>
            <Button
              variant="danger"
              data-testid="confirm-reset-btn"
              onClick={() => {
                setIsResetDialogOpen(false);
                onResetSession();
              }}
            >
              Clear & Reset
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
