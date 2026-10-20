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

    it('dynamically adapts through all 6 clinical reasoning steps for localized complaint', () => {
      // Turn 1: Patient reports rash
      const turn1 = { chief_complaint: 'Small rash on my left arm' };
      const q2 = determineNextAdaptiveQuestion(turn1, 1);
      expect(q2).not.toBeNull();
      expect(q2?.fieldKey).toBe('duration');

      // Turn 2: Patient reports duration and onset
      const turn2 = { ...turn1, duration: 'Started yesterday, mild itch' };
      const q3 = determineNextAdaptiveQuestion(turn2, 2);
      expect(q3).not.toBeNull();
      expect(q3?.fieldKey).toBe('severity');

      // Turn 3: Discomfort & functional impact
      const turn3 = { ...turn2, severity: '4/10' };
      const q4 = determineNextAdaptiveQuestion(turn3, 3);
      expect(q4).not.toBeNull();
      expect(q4?.fieldKey).toBe('associated_symptoms');

      // Turn 4: Associated signs & triggers
      const turn4 = { ...turn3, associated_symptoms: 'No facial swelling or fever' };
      const q5 = determineNextAdaptiveQuestion(turn4, 4);
      expect(q5).not.toBeNull();
      expect(q5?.fieldKey).toBe('triggers_treatments');

      // Turn 5: Medical history review
      const turn5 = { ...turn4, triggers_treatments: 'Applied hydrocortisone cream' };
      const q6 = determineNextAdaptiveQuestion(turn5, 5);
      expect(q6).not.toBeNull();
      expect(q6?.fieldKey).toBe('medical_history_review');

      // Concludes after 6 questions!
      const turn6 = { ...turn5, medical_history_review: 'No allergies' };
      const q7 = determineNextAdaptiveQuestion(turn6, 6);
      expect(q7).toBeNull();
    });

    it('dynamically adapts through all 6 clinical reasoning steps for cough complaint', () => {
      const turn1 = { chief_complaint: 'Dry seasonal cough' };
      const q2 = determineNextAdaptiveQuestion(turn1, 1);
      expect(q2).not.toBeNull();

      const turn2 = { ...turn1, duration: 'For about 3 days' };
      const q3 = determineNextAdaptiveQuestion(turn2, 2);
      expect(q3).not.toBeNull();
      expect(q3?.fieldKey).toBe('breathing_difficulty');

      const turn3 = { ...turn2, breathing_difficulty: 'Breathing is completely normal' };
      const q4 = determineNextAdaptiveQuestion(turn3, 3);
      expect(q4).not.toBeNull();
      expect(q4?.fieldKey).toBe('associated_symptoms');

      const turn4 = { ...turn3, associated_symptoms: 'Mild throat tickle' };
      const q5 = determineNextAdaptiveQuestion(turn4, 4);
      expect(q5).not.toBeNull();
      expect(q5?.fieldKey).toBe('triggers_treatments');

      const turn5 = { ...turn4, triggers_treatments: 'Warm tea with honey' };
      const q6 = determineNextAdaptiveQuestion(turn5, 5);
      expect(q6).not.toBeNull();
      expect(q6?.fieldKey).toBe('medical_history_review');

      const turn6 = { ...turn5, medical_history_review: 'No regular medications' };
      const q7 = determineNextAdaptiveQuestion(turn6, 6);
      expect(q7).toBeNull();
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

    it('deeply understands semantics separating symptoms from triggers (cold rain fever case)', () => {
      const answers = {
        chief_complaint: 'I am having a fever because I just went out yesterday in cold rain',
      };
      const q2 = determineNextAdaptiveQuestion(answers, 1);
      expect(q2).not.toBeNull();
      expect(q2?.fieldKey).toBe('duration');
      expect(q2?.category).toContain('Fever');
      // Must NOT naively say "When did your having a fever because I just went out yesterday in cold rain first begin"
      expect(q2?.prompt).not.toContain('having a fever because I just went out');
      // Must clinically acknowledge the rain exposure and inquire about fever height, chills, or temperature
      expect(q2?.prompt).toMatch(/cold rain/i);
      expect(q2?.prompt).toMatch(/fever/i);
      expect(q2?.prompt).toMatch(/chills|temperature/i);
    });

    it('generates native Telugu questions when patient speaks or writes in Telugu', () => {
      const answers = {
        chief_complaint: 'నిన్న చలి వర్షంలో తడిశాను, నాకు జ్వరం వచ్చింది',
      };
      const q2 = determineNextAdaptiveQuestion(answers, 1);
      expect(q2).not.toBeNull();
      // Prompt must be in Telugu script and acknowledge rain trigger
      expect(q2?.prompt).toMatch(/[\u0C00-\u0C7F]/);
      expect(q2?.prompt).toContain('జ్వరం');
      expect(q2?.subtitle).toMatch(/[\u0C00-\u0C7F]/);
      expect(q2?.quickChips[0]).toMatch(/[\u0C00-\u0C7F]/);

      // Turn 3: Severity rating in Telugu
      const turn2Answers = {
        ...answers,
        duration: 'తీవ్రమైన జ్వరం & చలి',
      };
      const q3 = determineNextAdaptiveQuestion(turn2Answers, 2);
      expect(q3).not.toBeNull();
      expect(q3?.fieldKey).toBe('severity');
      expect(q3?.prompt).toContain('0 నుండి 10');
      expect(q3?.inputType).toBe('slider');

      // Turn 4: Associated symptoms in Telugu
      const turn3Answers = {
        ...turn2Answers,
        severity: '8/10',
      };
      const q4 = determineNextAdaptiveQuestion(turn3Answers, 3);
      expect(q4).not.toBeNull();
      expect(q4?.fieldKey).toBe('associated_symptoms');
      expect(q4?.prompt).toContain('జ్వరంతో పాటు');
    });

    it('supports romanized Telugu phonetic speech recognition input', () => {
      const answers = {
        chief_complaint: 'ninna varshamlo tadisanu, jwaram vachindi',
      };
      const q2 = determineNextAdaptiveQuestion(answers, 1);
      expect(q2).not.toBeNull();
      expect(q2?.prompt).toMatch(/[\u0C00-\u0C7F]/);
      expect(q2?.prompt).toContain('జ్వరం');
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
