import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { KioskWelcome } from '../features/patient-kiosk/KioskWelcome';
import { IdentityConfirmationModal } from '../features/patient-kiosk/IdentityConfirmationModal';
import { NewPatientForm } from '../features/patient-registration/NewPatientForm';
import { IntakeInterview } from '../features/patient-intake/IntakeInterview';
import { IntakeSummary } from '../features/patient-intake/IntakeSummary';
import { AudioVisualizer } from '../features/patient-intake/AudioVisualizer';
import { PatientKioskFlow } from '../features/patient-kiosk/PatientKioskFlow';
import type { ClinicalFact } from '../lib/api/types';

describe('TASK-P1-201: Patient Kiosk and Adaptive Intake UI', () => {
  describe('KioskWelcome Component', () => {
    it('renders welcome screen with emergency banner and 3 primary actions', () => {
      const onReturning = vi.fn();
      const onNew = vi.fn();
      const onEmergency = vi.fn();

      render(
        <KioskWelcome
          onSelectReturning={onReturning}
          onSelectNew={onNew}
          onEmergencyEscalation={onEmergency}
        />
      );

      expect(screen.getByTestId('kiosk-welcome-container')).toBeInTheDocument();
      expect(screen.getByTestId('emergency-banner')).toBeInTheDocument();
      expect(screen.getByTestId('returning-patient-btn')).toBeInTheDocument();
      expect(screen.getByTestId('new-patient-btn')).toBeInTheDocument();
      expect(screen.getByTestId('staff-help-btn')).toBeInTheDocument();
    });

    it('triggers callback when returning patient or new patient is clicked', () => {
      const onReturning = vi.fn();
      const onNew = vi.fn();
      const onEmergency = vi.fn();

      render(
        <KioskWelcome
          onSelectReturning={onReturning}
          onSelectNew={onNew}
          onEmergencyEscalation={onEmergency}
        />
      );

      fireEvent.click(screen.getByTestId('returning-patient-btn'));
      expect(onReturning).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('new-patient-btn'));
      expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('switches language when language buttons are tapped', () => {
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={vi.fn()}
        />
      );

      // Tap Spanish
      fireEvent.click(screen.getByText('ES'));
      expect(screen.getByText('Paciente Registrado')).toBeInTheDocument();

      // Tap Chinese
      fireEvent.click(screen.getByText('ZH'));
      expect(screen.getByText('复诊患者报到')).toBeInTheDocument();

      // Tap Hindi (Popular Indian language)
      fireEvent.click(screen.getByText('HI'));
      expect(screen.getByText('पुराने मरीज (लौटने वाले)')).toBeInTheDocument();

      // Tap Telugu (Popular Indian language)
      fireEvent.click(screen.getByText('TE'));
      expect(screen.getByText('గతంలో నమోదైన రోగి')).toBeInTheDocument();

      // Tap Tamil (Popular Indian language)
      fireEvent.click(screen.getByText('TA'));
      expect(screen.getByText('ஏற்கனவே பதிவுசெய்த நோயாளி')).toBeInTheDocument();

      // Switch via accessible dropdown to French
      const select = screen.getByTestId('language-select');
      fireEvent.change(select, { target: { value: 'fr' } });
      expect(screen.getByText('Patient Déjà Enregistré')).toBeInTheDocument();

      // Open all languages modal and pick Japanese
      fireEvent.click(screen.getByTestId('open-language-modal-btn'));
      expect(screen.getByText(/All Languages \(18\)/i)).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('modal-language-btn-ja'));
      expect(screen.getByText('再診の方 (診察券をお持ちの方)')).toBeInTheDocument();
    });

    it('triggers emergency escalation when red-flag banner is clicked', () => {
      const onEmergency = vi.fn();
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={onEmergency}
        />
      );

      fireEvent.click(screen.getByTestId('emergency-banner'));
      expect(onEmergency).toHaveBeenCalledTimes(1);
    });
  });

  describe('IdentityConfirmationModal Component', () => {
    it('displays masked candidate info without exposing unconfirmed medical records', () => {
      render(
        <IdentityConfirmationModal
          candidate={{
            candidate_id: 'cand_1',
            masked_name: 'E*** J***',
            dob_year: 1984,
            contact_hint: '(***) ***-4821',
          }}
          onConfirmed={vi.fn()}
          onCancel={vi.fn()}
          onRouteToStaff={vi.fn()}
        />
      );

      expect(screen.getByTestId('masked-candidate-name')).toHaveTextContent('E*** J***');
      expect(screen.getByText(/Birth Year: 1984/)).toBeInTheDocument();
      // Ensure no medical conditions are leaked
      expect(screen.queryByText(/Hypertension/i)).not.toBeInTheDocument();
    });

    it('requires DOB to confirm identity and triggers onConfirmed', async () => {
      const onConfirmed = vi.fn();
      render(
        <IdentityConfirmationModal
          candidate={{
            candidate_id: 'cand_1',
            masked_name: 'E*** J***',
            dob_year: 1984,
            contact_hint: '(***) ***-4821',
          }}
          onConfirmed={onConfirmed}
          onCancel={vi.fn()}
          onRouteToStaff={vi.fn()}
        />
      );

      fireEvent.change(screen.getByTestId('dob-input'), {
        target: { value: '1984-05-12' },
      });
      fireEvent.click(screen.getByTestId('confirm-identity-btn'));

      await waitFor(() => {
        expect(onConfirmed).toHaveBeenCalled();
      });
    });

    it('triggers onCancel when "This is Not Me" is clicked', () => {
      const onCancel = vi.fn();
      render(
        <IdentityConfirmationModal
          onConfirmed={vi.fn()}
          onCancel={onCancel}
          onRouteToStaff={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('not-me-btn'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('displays uncertain identity warning when entered birth year mismatches candidate record', async () => {
      const onRouteToStaff = vi.fn();
      render(
        <IdentityConfirmationModal
          candidate={{
            candidate_id: 'cand_1',
            masked_name: 'E*** J***',
            dob_year: 1984,
            contact_hint: '(***) ***-4821',
          }}
          onConfirmed={vi.fn()}
          onCancel={vi.fn()}
          onRouteToStaff={onRouteToStaff}
        />
      );

      // Enter mismatched birth year
      fireEvent.change(screen.getByTestId('dob-input'), {
        target: { value: '2001-05-12' },
      });
      fireEvent.click(screen.getByTestId('confirm-identity-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('identity-error-alert')).toBeInTheDocument();
        expect(screen.getByTestId('identity-error-alert')).toHaveTextContent(/Uncertain Identity/i);
      });

      // Tap reception desk link
      fireEvent.click(screen.getByTestId('uncertain-staff-link'));
      expect(onRouteToStaff).toHaveBeenCalled();
    });

    it('renders candidate selector when multiple candidates match', () => {
      render(
        <IdentityConfirmationModal
          candidates={[
            { candidate_id: 'c1', masked_name: 'E. J***son', dob_year: 1982, contact_hint: '4921' },
            { candidate_id: 'c2', masked_name: 'M. P***el', dob_year: 1968, contact_hint: '8812' },
          ]}
          onConfirmed={vi.fn()}
          onCancel={vi.fn()}
          onRouteToStaff={vi.fn()}
        />
      );

      expect(screen.getByText(/Multiple Match Candidates Found/i)).toBeInTheDocument();
      expect(screen.getAllByText('E. J***son').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('M. P***el')).toBeInTheDocument();
    });
  });

  describe('NewPatientForm Component', () => {
    it('validates required fields before allowing registration', async () => {
      const onRegistered = vi.fn();
      render(<NewPatientForm onRegistered={onRegistered} onCancel={vi.fn()} />);

      // Submit empty
      fireEvent.click(screen.getByTestId('submit-registration-btn'));
      expect(onRegistered).not.toHaveBeenCalled();
    });

    it('submits registration successfully when fields are filled', async () => {
      const onRegistered = vi.fn();
      render(<NewPatientForm onRegistered={onRegistered} onCancel={vi.fn()} />);

      fireEvent.change(screen.getByTestId('patient-name-input'), {
        target: { value: 'Marcus Brody' },
      });
      fireEvent.change(screen.getByTestId('patient-dob-input'), {
        target: { value: '1990-08-15' },
      });
      fireEvent.change(screen.getByTestId('patient-phone-input'), {
        target: { value: '(555) 345-6789' },
      });

      fireEvent.click(screen.getByTestId('submit-registration-btn'));

      await waitFor(() => {
        expect(onRegistered).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Marcus Brody' }),
          expect.objectContaining({ status: 'IN_PROGRESS' })
        );
      });
    });
  });

  describe('IntakeInterview Component', () => {
    it('renders initial chief complaint question and advances on answer submission', async () => {
      const onComplete = vi.fn();
      render(
        <IntakeInterview
          encounterId="enc_test_01"
          patientName="Eleanor Johnson"
          onComplete={onComplete}
          onResetSession={vi.fn()}
        />
      );

      expect(screen.getByText(/Question 1 of 5/i)).toBeInTheDocument();
      expect(screen.getByText(/What primary health symptom/i)).toBeInTheDocument();

      // Enter response
      fireEvent.change(screen.getByTestId('intake-answer-input'), {
        target: { value: 'Severe cough with wheezing' },
      });

      // Advance
      fireEvent.click(screen.getByTestId('next-question-btn'));

      await waitFor(() => {
        expect(screen.getByText(/Question 2 of 5/i)).toBeInTheDocument();
      });
    });

    it('toggles modality between Voice Mode and Touch/Type mode', () => {
      render(
        <IntakeInterview
          encounterId="enc_test_01"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Default is Voice Mode
      expect(screen.getByTestId('voice-interaction-area')).toBeInTheDocument();

      // Switch to touch/type
      fireEvent.click(screen.getByTestId('modality-touch-btn'));
      expect(screen.queryByTestId('voice-interaction-area')).not.toBeInTheDocument();
    });

    it('triggers emergency escalation when red-flag keyword "chest pain" is entered', async () => {
      const onEmergency = vi.fn();
      render(
        <IntakeInterview
          encounterId="enc_test_01"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
          onEmergencyTriggered={onEmergency}
        />
      );

      fireEvent.change(screen.getByTestId('intake-answer-input'), {
        target: { value: 'I have severe chest pain and dizziness' },
      });

      fireEvent.click(screen.getByTestId('next-question-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('urgent-escalation-screen')).toBeInTheDocument();
        expect(screen.getByText(/Immediate Clinical Triage Required/i)).toBeInTheDocument();
        expect(onEmergency).toHaveBeenCalled();
      });
    });

    it('allows quick chips to populate answer', () => {
      render(
        <IntakeInterview
          encounterId="enc_test_01"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Click chip 0
      fireEvent.click(screen.getByTestId('quick-chip-0'));
      const input = screen.getByTestId('intake-answer-input') as HTMLInputElement;
      expect(input.value).toBe('Persistent dry cough');
    });

    it('simulates voice recording and presents captured speech with clarification notice', async () => {
      render(
        <IntakeInterview
          encounterId="enc_test_01"
          patientName="Eleanor Johnson"
          onComplete={vi.fn()}
          onResetSession={vi.fn()}
        />
      );

      // Tap microphone to start recording
      const micBtn = screen.getByTestId('voice-record-btn');
      fireEvent.click(micBtn);

      expect(screen.getByLabelText('Stop Listening')).toBeInTheDocument();

      // Tap microphone to stop recording and trigger transcription
      fireEvent.click(micBtn);

      await waitFor(() => {
        expect(screen.getByTestId('clarification-notice')).toBeInTheDocument();
        expect(screen.getByText(/Speech captured/i)).toBeInTheDocument();
      });
    });

    it('captures dynamic speech via SpeechRecognition and updates response without hardcoding', async () => {
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
      const originalSR = win.SpeechRecognition;
      win.SpeechRecognition = MockSpeechRecognition;

      try {
        render(
          <IntakeInterview
            encounterId="enc_test_01"
            patientName="Eleanor Johnson"
            onComplete={vi.fn()}
            onResetSession={vi.fn()}
          />
        );

        const micBtn = screen.getByTestId('voice-record-btn');
        fireEvent.click(micBtn);

        expect(screen.getByLabelText('Stop Listening')).toBeInTheDocument();

        // Simulate recognition returning actual spoken words
        act(() => {
          if (latestOnResult) {
            latestOnResult({
              resultIndex: 0,
              results: [
                Object.assign([{ transcript: 'Severe migraine with dizziness and nausea' }], { isFinal: true }),
              ],
            });
          }
        });

        // Stop recognition
        fireEvent.click(micBtn);

        await waitFor(() => {
          const input = screen.getByTestId('intake-answer-input') as HTMLInputElement;
          expect(input.value).toBe('Severe migraine with dizziness and nausea');
          expect(
            screen.getAllByText(/Severe migraine with dizziness and nausea/i).length
          ).toBeGreaterThanOrEqual(1);
        });
      } finally {
        win.SpeechRecognition = originalSR;
      }
    });

    it('intelligently distills rambling patient speech and resolves self-corrections (not fever, but body ache)', async () => {
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
      const originalSR = win.SpeechRecognition;
      win.SpeechRecognition = MockSpeechRecognition;

      try {
        render(
          <IntakeInterview
            encounterId="enc_test_02"
            patientName="Eleanor Johnson"
            onComplete={vi.fn()}
            onResetSession={vi.fn()}
          />
        );

        const micBtn = screen.getByTestId('voice-record-btn');
        fireEvent.click(micBtn);

        // Simulate patient rambling and correcting themselves
        act(() => {
          if (latestOnResult) {
            latestOnResult({
              resultIndex: 0,
              results: [
                Object.assign(
                  [{ transcript: "Well, honestly it's not the fever that I have, it's the body ache I have." }],
                  { isFinal: true }
                ),
              ],
            });
          }
        });

        // Stop recognition
        fireEvent.click(micBtn);

        await waitFor(() => {
          const card = screen.getByTestId('clinical-dictation-card');
          expect(card).toBeInTheDocument();
          expect(screen.getAllByText(/fever/i).length).toBeGreaterThanOrEqual(1);
          expect(screen.getAllByText(/body ache/i).length).toBeGreaterThanOrEqual(1);
          expect(screen.getAllByText(/Ruled Out/i).length).toBeGreaterThanOrEqual(1);
        });
      } finally {
        win.SpeechRecognition = originalSR;
      }
    });
  });

  describe('AudioVisualizer Component', () => {
    it('renders idle, listening, transcribing, and thinking states', () => {
      const { rerender } = render(<AudioVisualizer state="idle" />);
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument();

      rerender(<AudioVisualizer state="listening" volume={0.8} />);
      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument();

      rerender(<AudioVisualizer state="transcribing" />);
      expect(screen.getByText(/Transcribing voice response/i)).toBeInTheDocument();

      rerender(<AudioVisualizer state="thinking" />);
      expect(screen.getByText(/Processing clinical facts/i)).toBeInTheDocument();
    });
  });

  describe('IntakeSummary Component', () => {
    it('renders collected facts and completion status', () => {
      const facts: ClinicalFact[] = [
        {
          id: 'fact_1',
          patient_id: 'pat_1',
          concept: 'Headache',
          value: 'Mild throbbing',
          fact_type: 'symptom',
          status: 'reported',
          source_type: 'PATIENT_VOICE',
          source_id: 'turn_1',
          recorded_at: new Date().toISOString(),
          clinical_time: null,
          extraction_method: 'automated',
          confidence: 0.9,
          reviewed_by: null,
          source_location: null,
          supersedes_fact_id: null,
          unit: null,
          encounter_id: 'enc_1',
        },
      ];

      render(
        <IntakeSummary
          patientName="Eleanor Johnson"
          encounterId="enc_1"
          facts={facts}
          onStartNewSession={vi.fn()}
        />
      );

      expect(screen.getByTestId('intake-summary-container')).toBeInTheDocument();
      expect(screen.getByText(/Headache/)).toBeInTheDocument();
      expect(screen.getByText(/reported/i)).toBeInTheDocument();
    });

    it('triggers onProceedToDocuments when proceed button is clicked', () => {
      const onProceed = vi.fn();
      render(
        <IntakeSummary
          patientName="Eleanor Johnson"
          encounterId="enc_1"
          facts={[]}
          onStartNewSession={vi.fn()}
          onProceedToDocuments={onProceed}
        />
      );

      fireEvent.click(screen.getByTestId('proceed-to-documents-btn'));
      expect(onProceed).toHaveBeenCalledTimes(1);
    });
  });

  describe('PatientKioskFlow Full Integration', () => {
    it('mounts welcome screen by default and transitions through the flow', async () => {
      render(<PatientKioskFlow />);

      expect(screen.getByTestId('kiosk-welcome-container')).toBeInTheDocument();

      // Click Returning patient
      fireEvent.click(screen.getByTestId('returning-patient-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('identity-confirmation-container')).toBeInTheDocument();
      });

      // Enter DOB and confirm
      fireEvent.change(screen.getByTestId('dob-input'), {
        target: { value: '1982-05-12' },
      });
      fireEvent.click(screen.getByTestId('confirm-identity-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('intake-interview-container')).toBeInTheDocument();
      });
    });
  });
});
