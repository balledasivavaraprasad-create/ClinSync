import React, { useState, useEffect } from 'react';
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
              Question {currentStepIndex + 1} of {INTAKE_QUESTIONS.length}
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
        <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-500" />
        <div className="pt-7 pb-3 px-6 sm:px-8 border-b border-white/[0.06]">
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
          {clarificationNotice && (
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
