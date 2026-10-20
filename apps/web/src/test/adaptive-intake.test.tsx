import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  IntakeInterview,
  determineNextAdaptiveQuestion,
} from '../features/patient-intake/IntakeInterview';

// Mock Web Speech API
const mockSpeechRecognition = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = mockSpeechRecognition;
(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = mockSpeechRecognition;

// Mock HTMLMediaElement play/pause
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();

describe('Adaptive Patient Intake Questioning Engine', () => {
  describe('determineNextAdaptiveQuestion Unit Tests', () => {
    it('stops adaptively after 2 turns when patient states they have nothing else to add', () => {
      const answers = {
        chief_complaint: 'Mild papercut on index finger',
        duration: "That's all, nothing else",
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 2);
      expect(nextQ).toBeNull();
    });

    it('generates cardiac-specific questions for chest tightness / pain symptoms', () => {
      const answers = {
        chief_complaint: 'Tightness and squeezing pressure in chest',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 1);
      expect(nextQ).not.toBeNull();
      expect(nextQ?.fieldKey).toBe('duration');
      expect(nextQ?.category).toContain('Radiation');
      expect(nextQ?.prompt).toMatch(/jaw|arm|shoulder|spread/i);
    });

    it('generates abdominal-specific questions for stomach / gastro symptoms', () => {
      const answers = {
        chief_complaint: 'Severe stomach cramps and nausea',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 1);
      expect(nextQ).not.toBeNull();
      expect(nextQ?.fieldKey).toBe('duration');
      expect(nextQ?.category).toContain('Abdominal');
      expect(nextQ?.prompt).toMatch(/cramping|eating|radiate/i);
    });

    it('generates respiratory questions for cough and breathing symptoms', () => {
      const answers = {
        chief_complaint: 'Persistent dry cough and wheezing',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 1);
      expect(nextQ).not.toBeNull();
      expect(nextQ?.fieldKey).toBe('duration');
      expect(nextQ?.category).toMatch(/Cough|Respiratory/i);
    });

    it('clarifies vague or ambiguous duration responses', () => {
      const answers = {
        chief_complaint: 'Headache',
        duration: 'a while',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 2);
      expect(nextQ).not.toBeNull();
      expect(nextQ?.id).toBe('q_clarify_duration');
      expect(nextQ?.category).toBe('Clarification');
    });

    it('continues past 5 turns for multi-symptom / complex complaints without cutoff', () => {
      const answers = {
        chief_complaint: 'Chest pain and nausea',
        duration: 'Started 2 days ago',
        severity: '7 out of 10',
        associated_symptoms: 'Shortness of breath and sweating',
        trigger_factors: 'Worse when climbing stairs',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 5);
      expect(nextQ).not.toBeNull();
      expect(nextQ?.category).toMatch(/Medication/i);
    });

    it('concludes minor localized complaint in exactly 2 questions without forcing 5', () => {
      // Turn 1: Patient reports rash
      const turn1 = { chief_complaint: 'Small rash on my left arm' };
      const q2 = determineNextAdaptiveQuestion(turn1, 1);
      expect(q2).not.toBeNull();
      expect(q2?.fieldKey).toBe('duration');

      // Turn 2: Patient reports duration and onset
      const turn2 = { ...turn1, duration: 'Started yesterday, mild itch' };
      const q3 = determineNextAdaptiveQuestion(turn2, 2);
      // Must conclude at step 2!
      expect(q3).toBeNull();
    });

    it('concludes routine cough complaint in exactly 3 questions without forcing 5', () => {
      const turn1 = { chief_complaint: 'Dry seasonal cough' };
      const q2 = determineNextAdaptiveQuestion(turn1, 1);
      expect(q2).not.toBeNull();

      const turn2 = { ...turn1, duration: 'For about 3 days' };
      const q3 = determineNextAdaptiveQuestion(turn2, 2);
      expect(q3).not.toBeNull();
      expect(q3?.fieldKey).toBe('breathing_difficulty');

      const turn3 = { ...turn2, breathing_difficulty: 'Breathing is completely normal' };
      const q4 = determineNextAdaptiveQuestion(turn3, 3);
      // Concludes at step 3!
      expect(q4).toBeNull();
    });

    it('skips duration question when patient already provided timeline in initial chief complaint', () => {
      const turn1 = { chief_complaint: 'Severe chest tightness that started this morning' };
      const q2 = determineNextAdaptiveQuestion(turn1, 1);
      // Because patient said "started this morning" (duration) and "severe" (intensity), both are covered! Next is associated symptoms
      expect(q2).not.toBeNull();
      expect(q2?.fieldKey).toBe('associated_symptoms');
    });

    it('applies bounded safety limit at turn 9 to prevent infinite loops', () => {
      const answers: Record<string, string> = {
        chief_complaint: 'Vague fatigue',
        s1: 'more info',
        s2: 'more info',
        s3: 'more info',
        s4: 'more info',
        s5: 'more info',
        s6: 'more info',
        s7: 'more info',
        s8: 'more info',
        s9: 'more info',
      };
      const nextQ = determineNextAdaptiveQuestion(answers, 9);
      expect(nextQ).toBeNull();
    });
  });

  describe('IntakeInterview UI Adaptive Rendering', () => {
    it('displays dynamic Question counter without any "of 5" hardcoded limit', () => {
      render(
        <IntakeInterview
          encounterId="enc_test_adaptive"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Question 1 counter is visible
      const counter = screen.getByTestId('intake-question-counter');
      expect(counter).toHaveTextContent(/Question 1/i);
      expect(counter.textContent).not.toContain('of 5');
      expect(screen.queryByText(/of 5/i)).not.toBeInTheDocument();
    });

    it('allows patient to click Finished / Review Summary early for simple complaints', async () => {
      const onComplete = vi.fn();
      render(
        <IntakeInterview
          encounterId="enc_test_adaptive"
          patientName="Eleanor Johnson"
          onComplete={onComplete}
          onResetSession={vi.fn()}
        />
      );

      // Answer question 1
      fireEvent.change(screen.getByTestId('intake-answer-input'), {
        target: { value: 'Mild papercut' },
      });
      fireEvent.click(screen.getByTestId('next-question-btn'));

      // On question 2, Finish Early button is rendered
      await waitFor(() => {
        expect(screen.getByTestId('finish-early-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('finish-early-btn'));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('shares input state seamlessly between Voice Mode and Touch/Type Mode', () => {
      render(
        <IntakeInterview
          encounterId="enc_test_adaptive"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Type in text box while on Touch mode
      fireEvent.click(screen.getByTestId('modality-touch-btn'));
      const textInput = screen.getByTestId('intake-answer-input');
      fireEvent.change(textInput, { target: { value: 'Severe dizziness when standing' } });
      expect(textInput).toHaveValue('Severe dizziness when standing');

      // Switch to voice mode: value remains preserved
      fireEvent.click(screen.getByTestId('modality-voice-btn'));
      expect(screen.getByTestId('voice-interaction-area')).toBeInTheDocument();

      // Switch back to touch mode: value is still there
      fireEvent.click(screen.getByTestId('modality-touch-btn'));
      expect(screen.getByTestId('intake-answer-input')).toHaveValue('Severe dizziness when standing');
    });
  });
});
