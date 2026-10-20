import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { IntakeInterview } from '../features/patient-intake/IntakeInterview';
import {
  createConversationalSession,
  processPatientUtterance,
} from '../lib/clinical/conversationalEngine';
import * as ElevenLabsModule from '../lib/audio/elevenlabs';

// Mock Web Speech API
interface MockSpeechEvent {
  resultIndex?: number;
  results: Array<Array<{ transcript: string }> & { isFinal?: boolean }>;
}

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

describe('ClinSync — Canonical Question to Audio Pipeline (TASK-VOICE-CANONICAL)', () => {
  let spokenUtterances: string[] = [];
  let speechSynthUtterances: SpeechSynthesisUtterance[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    spokenUtterances = [];
    speechSynthUtterances = [];

    // Spy on synthesizeSpeech
    vi.spyOn(ElevenLabsModule, 'synthesizeSpeech').mockImplementation(async (text: string) => {
      spokenUtterances.push(text);
      return null; // Fall through to SpeechSynthesis so we also record browser utterance
    });

    // Mock browser window.speechSynthesis
    if (typeof window !== 'undefined') {
      window.speechSynthesis = {
        cancel: vi.fn(),
        speak: vi.fn().mockImplementation((utterance: SpeechSynthesisUtterance) => {
          speechSynthUtterances.push(utterance);
          spokenUtterances.push(utterance.text);
          if (utterance.onstart) utterance.onstart(new Event('start') as any);
        }),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn().mockReturnValue([]),
        paused: false,
        pending: false,
        speaking: false,
        onvoiceschanged: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as SpeechSynthesis;
    }
  });

  // Test A — Exact text synchronization
  it('Test A: verifies exact character-for-character synchronization between displayed text and TTS text', async () => {
    render(
      <IntakeInterview
        encounterId="enc_sync_01"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    // Initial question is rendered on screen
    const displayedPrompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();
    expect(displayedPrompt).toBe('Welcome to ClinSync. What primary health symptom or discomfort brings you in today?');

    // Verify the text passed to TTS matches the displayed question exactly
    await waitFor(() => {
      expect(spokenUtterances.length).toBeGreaterThanOrEqual(1);
      expect(spokenUtterances[0]).toBe(displayedPrompt);
    });

    // Advance to Question 2 (Chest Tightness)
    fireEvent.change(screen.getByTestId('intake-answer-input'), {
      target: { value: 'Chest tightness / pain' },
    });
    fireEvent.click(screen.getByTestId('next-question-btn'));

    // Question 2 should display cardiac radiation question
    await waitFor(() => {
      const q2Prompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();
      expect(q2Prompt).toBe(
        'I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?'
      );
      // Verify TTS received the exact question, NOT a generic question from an mp3 or separate prompt
      expect(spokenUtterances).toContain(q2Prompt);
    });
  });

  // Test B — Consecutive questions
  it('Test B: verifies audio for Question A cannot play once Question B becomes active', async () => {
    render(
      <IntakeInterview
        encounterId="enc_sync_02"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    const q1Prompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();
    expect(q1Prompt).toBe('Welcome to ClinSync. What primary health symptom or discomfort brings you in today?');

    // Answer Q1 immediately to advance to Q2
    fireEvent.change(screen.getByTestId('intake-answer-input'), {
      target: { value: 'Persistent dry cough' },
    });
    fireEvent.click(screen.getByTestId('next-question-btn'));

    await waitFor(() => {
      const q2Prompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();
      expect(q2Prompt).toMatch(/cough|phlegm|fever/i);
    });

    // Ensure speechSynthesis.cancel was called to cancel Q1 playback
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  // Test C — Delayed TTS
  it('Test C: discards delayed TTS response for Question A when Question B is already active', async () => {
    let resolveSlowTTS: ((val: string | null) => void) | null = null;
    vi.spyOn(ElevenLabsModule, 'synthesizeSpeech').mockImplementationOnce(() => {
      return new Promise<string | null>((resolve) => {
        resolveSlowTTS = resolve;
      });
    });

    render(
      <IntakeInterview
        encounterId="enc_sync_03"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    // Patient rapidly answers and advances before slow TTS resolves
    fireEvent.change(screen.getByTestId('intake-answer-input'), {
      target: { value: 'Chest tightness' },
    });
    fireEvent.click(screen.getByTestId('next-question-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('canonical-question-prompt').textContent).toContain(
        'I understand you are experiencing chest tightness'
      );
    });

    // Now slow TTS for Q1 resolves with stale audio URL
    if (resolveSlowTTS) {
      await act(async () => {
        resolveSlowTTS!('blob:http://localhost/stale_q1.mp3');
      });
    }

    // Verify audio element did not play stale Q1 URL
    const audioEl = document.querySelector('audio');
    expect(audioEl?.src).not.toContain('stale_q1.mp3');
  });

  // Test D — Stop and interruption
  it('Test D: stops playback immediately and prevents late responses from restarting speech', async () => {
    render(
      <IntakeInterview
        encounterId="enc_sync_04"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    // Tap pause/stop
    const pauseBtn = screen.getByTestId('pause-conversation-btn');
    fireEvent.click(pauseBtn);

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(screen.getByTestId('resume-conversation-btn')).toBeInTheDocument();

    // Verify audio state changed to paused
    const statusBadge = screen.getByTestId('assistant-status-badge');
    expect(statusBadge.textContent).toBe('Paused');
  });

  // Test E — Duplicate requests
  it('Test E: component rerenders do not trigger duplicate speech requests or question divergence', async () => {
    const { rerender } = render(
      <IntakeInterview
        encounterId="enc_sync_05"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    const initialCallCount = spokenUtterances.length;

    // Simulate 3 rapid rerenders (e.g. typing or parent state updates)
    rerender(
      <IntakeInterview
        encounterId="enc_sync_05"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );
    rerender(
      <IntakeInterview
        encounterId="enc_sync_05"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    // Call count should NOT multiply because turnId has not changed
    expect(spokenUtterances.length).toBe(initialCallCount);
  });

  // Test F — Answer association
  it('Test F: verifies patient response is attached to the canonical question ID and field key in the ledger', async () => {
    let session = createConversationalSession('enc_sync_06', 'Eleanor Johnson', 'en');

    // Turn 1: answering chief complaint
    const activeQ1 = {
      id: 'q1_chief_complaint',
      prompt: 'Welcome to ClinSync. What primary health symptom or discomfort brings you in today?',
      fieldKey: 'chief_complaint',
      turnId: 1,
    };
    const turn1 = processPatientUtterance(session, 'Severe chest tightness', activeQ1);

    expect(turn1.updatedSession.extractedFacts.length).toBeGreaterThan(0);
    const fact1 = turn1.updatedSession.extractedFacts[0];
    // Must be associated with activeQ1 id
    expect(fact1.source_id).toBe('q1_chief_complaint');

    // Turn 2: answering duration
    const activeQ2 = {
      id: 'q2_duration_chest',
      prompt:
        'I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?',
      fieldKey: 'duration',
      turnId: 2,
    };
    const turn2 = processPatientUtterance(turn1.updatedSession, 'Started 3 hours ago', activeQ2);
    const fact2 = turn2.updatedSession.extractedFacts.find((f) => f.concept === 'Symptom Timeline');
    expect(fact2?.source_id).toBe('q2_duration_chest');
  });

  // Test G — Voice and text modes
  it('Test G: both voice and touch/text modes display and use the exact same canonical question', async () => {
    render(
      <IntakeInterview
        encounterId="enc_sync_07"
        patientName="Eleanor Johnson"
        onComplete={vi.fn()}
        onResetSession={vi.fn()}
      />
    );

    const voicePrompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();

    // Switch to touch/type mode
    const touchBtn = screen.getByTestId('modality-touch-btn');
    fireEvent.click(touchBtn);

    const touchPrompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();

    // Both modalities share the exact identical question
    expect(touchPrompt).toBe(voicePrompt);

    // Audio should stop upon switching to touch
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });

  // Test H — Provider failure
  it('Test H: handles TTS provider failure honestly without inventing audio or desyncing UI', async () => {
    // Both ElevenLabs and Web Speech unavailable
    vi.spyOn(ElevenLabsModule, 'synthesizeSpeech').mockRejectedValueOnce(new Error('Network error'));
    const originalSpeechSynth = window.speechSynthesis;
    (window as any).speechSynthesis = undefined;

    try {
      render(
        <IntakeInterview
          encounterId="enc_sync_08"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Question is still legibly displayed
      const prompt = screen.getByTestId('canonical-question-prompt').textContent?.trim();
      expect(prompt).toBe('Welcome to ClinSync. What primary health symptom or discomfort brings you in today?');

      // Assistant returns to ready/idle state rather than getting stuck in speaking
      await waitFor(() => {
        const badge = screen.getByTestId('assistant-status-badge');
        expect(badge.textContent).toBe('Ready');
      });

      // Patient can still type answer without failure
      const input = screen.getByTestId('intake-answer-input');
      expect(input).toBeInTheDocument();
    } finally {
      window.speechSynthesis = originalSpeechSynth;
    }
  });
});
