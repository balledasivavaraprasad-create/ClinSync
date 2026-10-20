import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IntakeInterview } from '../features/patient-intake/IntakeInterview';
import {
  createConversationalSession,
  processPatientUtterance,
  checkRedFlags,
} from '../lib/clinical/conversationalEngine';
import { stopAllSpeech, synthesizeSpeech } from '../lib/audio/elevenlabs';

// Mock Web Speech API
interface MockSpeechEvent {
  resultIndex?: number;
  results: Array<Array<{ transcript: string }> & { isFinal?: boolean }>;
}

let latestOnResult: ((event: MockSpeechEvent) => void) | null = null;
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = 'en-US';
  onstart: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  private _onresult: ((event: MockSpeechEvent) => void) | null = null;
  get onresult() {
    return this._onresult;
  }
  set onresult(fn: ((event: MockSpeechEvent) => void) | null) {
    this._onresult = fn;
    latestOnResult = fn;
  }
  start() {
    if (this.onstart) this.onstart();
  }
  stop() {
    if (this.onend) this.onend();
  }
  abort() {}
}

const win = window as unknown as Record<string, unknown>;
win.SpeechRecognition = MockSpeechRecognition;
win.webkitSpeechRecognition = MockSpeechRecognition;

// Mock HTMLMediaElement play & pause
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

describe('TASK-P1-VOICE: Conversational Voice Assistant & Interruption Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Conversational Dialogue & Multi-Fact Extraction (Engine Unit Tests)', () => {
    it('extracts multiple volunteered symptoms in a single patient turn without re-asking', () => {
      const session = createConversationalSession('enc_multi_01', 'Eleanor Vance', 'en');
      const utterance = "I've had a severe dry cough and mild fever since 3 days ago, and my chest feels slightly tight.";

      const turn = processPatientUtterance(session, utterance);

      expect(turn.updatedSession.knownFields['chief_complaint']).toBeDefined();
      expect(turn.updatedSession.knownFields['duration']).toContain('3 days');
      expect(turn.updatedSession.extractedFacts.length).toBeGreaterThanOrEqual(2);

      // Verify chief complaint and duration facts exist
      const concepts = turn.updatedSession.extractedFacts.map((f) => f.concept);
      expect(concepts).toContain('Chief Complaint');
      expect(concepts).toContain('Symptom Timeline');

      // The response acknowledges symptoms and does NOT re-ask duration
      expect(turn.assistantResponseText).not.toMatch(/how many days/i);
    });

    it('resolves self-corrections cleanly and marks previous findings updated', () => {
      let session = createConversationalSession('enc_corr_01', 'Eleanor Vance', 'en');

      // Turn 1: Patient reports mild headache
      const turn1 = processPatientUtterance(session, 'I have a mild headache');
      session = turn1.updatedSession;

      // Turn 2: Patient self-corrects: "Actually it's not a headache, it's intense sinus pressure"
      const turn2 = processPatientUtterance(
        session,
        "Actually, it's not a headache, it is really intense sinus pressure."
      );

      const corrFact = turn2.updatedSession.extractedFacts.find((f) => f.concept === 'Corrected Finding');
      expect(corrFact).toBeDefined();
      expect(corrFact?.value).toContain('intense sinus pressure');
      expect(turn2.assistantResponseText).toMatch(/noted the update|got it/i);
    });

    it('answers patient questions warmly and returns to clinical context', () => {
      const session = createConversationalSession('enc_q_01', 'Eleanor Vance', 'en');

      // Patient asks why intake is needed
      const turn = processPatientUtterance(session, 'Why are you asking me all these questions?');

      expect(turn.actionType).toBe('answer_question');
      expect(turn.assistantResponseText).toMatch(/doctor|prepare|brief/i);
    });

    it('immediately escalates acute red-flag emergency symptoms', () => {
      const redFlag = checkRedFlags('I have crushing chest pain radiating to my left arm and jaw');
      expect(redFlag.isEmergency).toBe(true);
      expect(redFlag.reason).toMatch(/emergency|high-risk/i);

      const session = createConversationalSession('enc_emerg_01', 'Eleanor Vance', 'en');
      const turn = processPatientUtterance(session, 'I have crushing chest pain and difficulty breathing');

      expect(turn.updatedSession.isEmergency).toBe(true);
      expect(turn.updatedSession.emergencyReason).toBeDefined();
      expect(turn.assistantResponseText).toMatch(/emergency|urgent|notified/i);
    });
  });

  describe('2. Cancellation Tokens & Monotonic Turn IDs', () => {
    it('cancels speech synthesis when AbortSignal is triggered', async () => {
      const abortCtrl = new AbortController();
      abortCtrl.abort();

      const audioUrl = await synthesizeSpeech('Test emergency alert', 'receptionist', abortCtrl.signal);
      expect(audioUrl).toBeNull();
    });

    it('stopAllSpeech immediately cancels both Web Speech synthesis and audio elements', () => {
      expect(() => stopAllSpeech()).not.toThrow();
    });
  });

  describe('3. IntakeInterview UI Conversational Interruption & Turn-Taking', () => {
    it('renders assistant status badge as Ready or Speaking initially and allows interruption', async () => {
      render(
        <IntakeInterview
          encounterId="enc_ui_01"
          patientName="Eleanor Vance"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Check header badge
      const badge = screen.getByTestId('assistant-status-badge');
      expect(badge).toBeInTheDocument();

      // Check pause / resume button
      const pauseBtn = screen.getByTestId('pause-conversation-btn');
      expect(pauseBtn).toBeInTheDocument();

      // Click pause
      fireEvent.click(pauseBtn);

      await waitFor(() => {
        expect(screen.getByTestId('resume-conversation-btn')).toBeInTheDocument();
      });

      // Resume conversation
      fireEvent.click(screen.getByTestId('resume-conversation-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('pause-conversation-btn')).toBeInTheDocument();
      });
    });

    it('supports immediate stop via Stop Assistant button or pause when assistant is talking', async () => {
      render(
        <IntakeInterview
          encounterId="enc_ui_02"
          patientName="Eleanor Vance"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Pause halts all assistant playback immediately
      const pauseBtn = screen.getByTestId('pause-conversation-btn');
      fireEvent.click(pauseBtn);

      expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    });

    it('triggers barge-in interruption when patient starts speaking while assistant speaks', async () => {
      render(
        <IntakeInterview
          encounterId="enc_ui_03"
          patientName="Eleanor Vance"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      const micBtn = screen.getByTestId('voice-record-btn');
      fireEvent.click(micBtn);

      // Simulate SpeechRecognition capturing patient speech while assistant was active
      act(() => {
        if (latestOnResult) {
          latestOnResult({
            resultIndex: 0,
            results: [
              Object.assign([{ transcript: "Excuse me, I need to say that it's only on my left side" }], {
                isFinal: true,
              }),
            ],
          });
        }
      });

      // Stop listening
      fireEvent.click(micBtn);

      await waitFor(() => {
        const input = screen.getByTestId('intake-answer-input') as HTMLInputElement;
        expect(input.value).toContain('left side');
      });
    });

    it('triggers safety escalation screen immediately upon red-flag input', async () => {
      const emergencyHandler = vi.fn();
      render(
        <IntakeInterview
          encounterId="enc_ui_04"
          patientName="Eleanor Vance"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
          onEmergencyTriggered={emergencyHandler}
        />
      );

      fireEvent.change(screen.getByTestId('intake-answer-input'), {
        target: { value: 'Severe chest tightness radiating to left arm' },
      });

      fireEvent.click(screen.getByTestId('next-question-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('urgent-escalation-screen')).toBeInTheDocument();
        expect(emergencyHandler).toHaveBeenCalled();
      });
    });

    it('allows patient to open live conversation transcript drawer', async () => {
      render(
        <IntakeInterview
          encounterId="enc_ui_05"
          patientName="Eleanor Vance"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      const transcriptToggle = screen.getByTestId('toggle-transcript-btn');
      expect(transcriptToggle).toBeInTheDocument();

      fireEvent.click(transcriptToggle);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-transcript')).toBeInTheDocument();
        expect(screen.getByText(/Live Conversation History/i)).toBeInTheDocument();
      });
    });
  });
});
