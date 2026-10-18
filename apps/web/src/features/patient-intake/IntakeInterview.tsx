import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
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
} from 'lucide-react';

export interface IntakeQuestion {
  id: string;
  fieldKey: string;
  category: string;
  prompt: string;
  subtitle: string;
  quickChips: string[];
  inputType: 'text' | 'chips' | 'slider';
}

const INTAKE_QUESTIONS: IntakeQuestion[] = [
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
  },
  {
    id: 'q2_duration',
    fieldKey: 'duration',
    category: 'Symptom Duration',
    prompt: 'How long have you been experiencing this symptom?',
    subtitle: 'Knowing when it began helps our triage doctor evaluate urgency.',
    quickChips: [
      'Just started this morning',
      'About 2 to 3 days',
      'Approximately 1 week',
      'More than 2 weeks',
    ],
    inputType: 'chips',
  },
  {
    id: 'q3_severity',
    fieldKey: 'severity',
    category: 'Pain & Severity Score',
    prompt: 'On a scale from 0 to 10, how severe is your discomfort right now?',
    subtitle: '0 is no discomfort at all; 10 is the worst pain imaginable.',
    quickChips: ['0 - None', '3 - Mild', '5 - Moderate', '8 - Severe', '10 - Worst'],
    inputType: 'slider',
  },
  {
    id: 'q4_associated',
    fieldKey: 'associated_symptoms',
    category: 'Associated Symptoms',
    prompt: 'Are you experiencing any other accompanying symptoms?',
    subtitle: 'Select any that apply or say none.',
    quickChips: [
      'Mild fever',
      'Nausea or reduced appetite',
      'Fatigue / weakness',
      'Headache',
      'No other symptoms',
    ],
    inputType: 'chips',
  },
  {
    id: 'q5_medications',
    fieldKey: 'medications_allergies',
    category: 'Medications & Allergies',
    prompt: 'Do you take any regular prescription medications or have known drug allergies?',
    subtitle: 'This ensures patient safety during treatment planning.',
    quickChips: [
      'Blood pressure medication',
      'Asthma inhaler',
      'Penicillin allergy',
      'Over-the-counter vitamins only',
      'No medications or allergies',
    ],
    inputType: 'text',
  },
];

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
  onComplete: (collectedFacts: ClinicalFact[]) => void;
  onResetSession: () => void;
  onEmergencyTriggered?: () => void;
}

export const IntakeInterview: React.FC<IntakeInterviewProps> = ({
  encounterId,
  patientName,
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

  const currentQuestion = INTAKE_QUESTIONS[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / INTAKE_QUESTIONS.length) * 100);

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
  }, [currentStepIndex, answers, currentQuestion]);

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

  // Handle Voice Recording Simulation & Permission
  const handleToggleVoice = async () => {
    resetTimer();
    setMicPermissionNotice(null);
    setClarificationNotice(null);

    if (audioState === 'listening') {
      // Stop listening -> simulate transcription
      setAudioState('transcribing');
      setTimeout(() => {
        const simulatedVoiceText =
          currentQuestion.quickChips[0] || 'I have been experiencing symptoms since yesterday.';
        setCurrentResponse(simulatedVoiceText);
        setAudioState('idle');
        setClarificationNotice(`Speech captured: "${simulatedVoiceText}". Review or tap Next Question to confirm.`);
      }, 800);
    } else {
      // Check microphone permission when navigator mediaDevices is available
      if (
        typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
      ) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
          setAudioState('listening');
        } catch (err: unknown) {
          const isDenied =
            err instanceof Error &&
            (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
          if (isDenied) {
            setMicPermissionNotice('Microphone access was denied. Switched to touch / typing mode.');
            setModality('touch');
            return;
          }
          setAudioState('listening');
        }
      } else {
        setAudioState('listening');
      }
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
      if (currentStepIndex + 1 < INTAKE_QUESTIONS.length) {
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
        className="w-full max-w-3xl mx-auto p-8 bg-rose-50 border-4 border-rose-500 rounded-2xl shadow-xl text-center space-y-6 animate-pulse"
      >
        <div className="w-20 h-20 bg-rose-200 text-rose-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase font-extrabold tracking-widest text-rose-800 bg-rose-200 px-3 py-1 rounded-full">
            Immediate Clinical Triage Required
          </span>
          <h2 className="text-3xl font-extrabold text-rose-950">
            Emergency Staff Alert Triggered
          </h2>
          <p className="text-base text-rose-800 max-w-xl mx-auto">
            {escalationReason}
          </p>
        </div>

        <div className="p-4 bg-white/90 border border-rose-200 rounded-xl text-left max-w-lg mx-auto space-y-2">
          <p className="font-bold text-sm text-slate-900 flex items-center">
            <ShieldAlert className="w-4 h-4 text-rose-600 mr-2" />
            Patient Protocol:
          </p>
          <ul className="text-xs text-slate-700 space-y-1 list-disc pl-5">
            <li>Please remain seated at this station.</li>
            <li>A triage nurse and bedside wheelchair have been dispatched.</li>
            <li>Your station location: <strong>Kiosk Intake 01 (Encounter: {encounterId})</strong>.</li>
          </ul>
        </div>

        <div className="pt-4 flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setIsEscalated(false)}
            className="border-rose-300 text-rose-800 hover:bg-rose-100"
          >
            Mistake / Cancel Escalation
          </Button>
          <Button
            variant="danger"
            onClick={() => alert('Emergency buzzer re-triggered.')}
            className="shadow-lg"
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
      className="w-full max-w-3xl mx-auto space-y-4"
    >
      {/* Top Header: Patient & Progress */}
      <div className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
            {patientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Intake Patient</span>
            <span className="text-sm font-bold text-slate-900">{patientName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Progress Bar */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-600">
              Question {currentStepIndex + 1} of {INTAKE_QUESTIONS.length}
            </span>
            <div className="w-32 bg-slate-100 rounded-full h-2 mt-1 overflow-hidden border border-slate-200">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsResetDialogOpen(true)}
            className="text-xs text-slate-500 hover:text-slate-800"
            title="Reset Session"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="shadow-md border-slate-200/90 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 to-indigo-500" />
        <CardHeader className="pt-6 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
              {currentQuestion.category}
            </span>
            <span className="text-xs text-slate-400 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Auto-saves answers
            </span>
          </div>

          <CardTitle className="text-2xl font-extrabold text-slate-900 pt-3 leading-snug">
            {currentQuestion.prompt}
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            {currentQuestion.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 pb-6 px-6 sm:px-8">
          {/* Modality Toggle Tabs */}
          <div className="flex items-center justify-center space-x-2 bg-slate-100 p-1.5 rounded-xl max-w-xs mx-auto border border-slate-200">
            <button
              onClick={() => {
                resetTimer();
                setModality('voice');
              }}
              data-testid="modality-voice-btn"
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                modality === 'voice'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                modality === 'touch'
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
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
              className="p-6 bg-teal-50/50 border border-teal-100 rounded-2xl flex flex-col items-center justify-center space-y-4"
            >
              <AudioVisualizer state={audioState} />

              <button
                type="button"
                data-testid="voice-record-btn"
                onClick={handleToggleVoice}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 cursor-pointer focus:outline-none focus:ring-4 ${
                  audioState === 'listening'
                    ? 'bg-rose-600 hover:bg-rose-700 animate-pulse ring-rose-300'
                    : 'bg-teal-600 hover:bg-teal-700 ring-teal-200'
                }`}
                aria-label={audioState === 'listening' ? 'Stop Listening' : 'Start Speaking'}
              >
                {audioState === 'listening' ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <span className="text-xs font-medium text-slate-600 text-center">
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
              className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{micPermissionNotice}</span>
              <button
                type="button"
                onClick={() => setMicPermissionNotice(null)}
                className="text-amber-700 hover:text-amber-950 font-bold ml-2 text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Speech Clarification Notice */}
          {clarificationNotice && (
            <div
              role="status"
              data-testid="clarification-notice"
              className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{clarificationNotice}</span>
              <button
                type="button"
                onClick={() => setClarificationNotice(null)}
                className="text-teal-700 hover:text-teal-950 font-bold ml-2 text-xs cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          {/* Current Answer Input / Editable Transcript */}
          {currentQuestion.inputType === 'slider' ? (
            <div
              data-testid="pain-slider-area"
              className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">
                  Select Discomfort Rating (0 to 10):
                </span>
                <span
                  data-testid="slider-value-display"
                  className={`text-2xl font-black px-3 py-1 rounded-xl ${
                    painScore >= 8
                      ? 'bg-rose-100 text-rose-800'
                      : painScore >= 5
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-teal-100 text-teal-800'
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

              <div className="flex justify-between text-xs font-medium text-slate-500 pt-1">
                <span>0 - No Pain</span>
                <span>3 - Mild</span>
                <span>5 - Moderate</span>
                <span>8 - Severe</span>
                <span>10 - Worst Possible</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
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
                className="w-full text-base py-3"
              />
            </div>
          )}

          {/* Fast Quick-Select Chips */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 block">
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
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 hover:text-teal-900 text-xs font-medium bg-white transition-all cursor-pointer shadow-2xs active:scale-95"
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
              className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-600" />
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
              className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center justify-between"
            >
              <span>{submissionError}</span>
              <Button size="sm" variant="danger" onClick={handleNext}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between bg-slate-50 border-t border-slate-100 px-6 sm:px-8 py-4">
          <Button
            type="button"
            variant="outline"
            data-testid="prev-question-btn"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0 || submitting}
            className="text-slate-600"
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
            className="min-w-[140px] bg-teal-600 hover:bg-teal-700"
          >
            {submitting ? (
              'Saving...'
            ) : currentStepIndex + 1 === INTAKE_QUESTIONS.length ? (
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
        </CardFooter>
      </Card>

      {/* Reset Session Confirmation Dialog */}
      <Dialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Start Over / Clear Session?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
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
