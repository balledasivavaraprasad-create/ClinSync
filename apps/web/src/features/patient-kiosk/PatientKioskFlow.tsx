import React, { useState } from 'react';
import { KioskWelcome } from './KioskWelcome';
import { IdentityConfirmationModal } from './IdentityConfirmationModal';
import { NewPatientForm } from '../patient-registration/NewPatientForm';
import { IntakeInterview } from '../patient-intake/IntakeInterview';
import { IntakeSummary } from '../patient-intake/IntakeSummary';
import { DocumentUploadZone } from '../documents/DocumentUploadZone';
import { AppointmentSchedulingHub } from '../appointments/AppointmentSchedulingHub';
import { KioskLayout } from '../../layouts/KioskLayout';
import { mockApi } from '../../lib/api/mockAdapter';
import type { IdentityCandidate, ClinicalFact, Encounter } from '../../lib/api/types';

export type KioskFlowStep =
  | 'welcome'
  | 'confirm-identity'
  | 'new-patient'
  | 'interview'
  | 'summary'
  | 'documents'
  | 'scheduling';

export const PatientKioskFlow: React.FC<{ initialStep?: KioskFlowStep }> = ({
  initialStep = 'welcome',
}) => {
  const [currentStep, setCurrentStep] = useState<KioskFlowStep>(initialStep);
  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [encounterId, setEncounterId] = useState<string>('');
  const [collectedFacts, setCollectedFacts] = useState<ClinicalFact[]>([]);
  const [candidates, setCandidates] = useState<IdentityCandidate[]>([]);
  const [candidate, setCandidate] = useState<IdentityCandidate | undefined>(undefined);

  // 1. Returning patient check-in initiated
  const handleSelectReturning = async () => {
    try {
      // Lookup candidate list from mockApi
      const res = await mockApi.lookupCandidates({});
      setCandidates(res.data.candidates);
      setCandidate(res.data.candidates[0]);
    } catch {
      // fallback candidate if lookup fails
      const fallback: IdentityCandidate = {
        candidate_id: 'cand_demo_001',
        masked_name: 'E. J***son',
        dob_year: 1982,
        contact_hint: '(***) ***-4821',
      };
      setCandidates([fallback]);
      setCandidate(fallback);
    }
    setCurrentStep('confirm-identity');
  };

  // 2. Identity confirmed -> create encounter and advance to interview
  const handleIdentityConfirmed = async (confirmation: {
    patient_id: string;
    display_name: string;
  }) => {
    setPatientId(confirmation.patient_id);
    setPatientName(confirmation.display_name);

    try {
      const encounterRes = await mockApi.createEncounter({
        patient_id: confirmation.patient_id,
        intake_language: 'en-US',
      });
      setEncounterId(encounterRes.data.id);
    } catch {
      setEncounterId(`enc_${Date.now()}`);
    }

    setCurrentStep('interview');
  };

  // 3. New patient registration completed -> advance to interview
  const handleNewPatientRegistered = (
    patient: { id: string; name: string },
    encounter: Encounter
  ) => {
    setPatientId(patient.id);
    setPatientName(patient.name);
    setEncounterId(encounter.id);
    setCurrentStep('interview');
  };

  // 4. Interview completed -> advance to summary
  const handleInterviewComplete = (facts: ClinicalFact[]) => {
    setCollectedFacts(facts);
    setCurrentStep('summary');
  };

  // 5. Reset session completely
  const handleResetSession = () => {
    setPatientId('');
    setPatientName('');
    setEncounterId('');
    setCollectedFacts([]);
    setCandidate(undefined);
    setCurrentStep('welcome');
  };

  return (
    <KioskLayout
      onResetSession={handleResetSession}
      onHelp={() => alert('Hospital Staff notified to assist Kiosk Station A.')}
    >
      <div className="w-full flex justify-center py-4">
        {currentStep === 'welcome' && (
          <KioskWelcome
            onSelectReturning={handleSelectReturning}
            onSelectNew={() => setCurrentStep('new-patient')}
            onEmergencyEscalation={() => {
              // Direct emergency escalation
              setEncounterId(`enc_emerg_${Date.now()}`);
              setPatientName('Urgent Walk-in');
              setCurrentStep('interview');
            }}
          />
        )}

        {currentStep === 'confirm-identity' && (
          <IdentityConfirmationModal
            candidate={candidate}
            candidates={candidates}
            onConfirmed={handleIdentityConfirmed}
            onCancel={handleResetSession}
            onRouteToStaff={handleResetSession}
          />
        )}

        {currentStep === 'new-patient' && (
          <NewPatientForm
            onRegistered={handleNewPatientRegistered}
            onCancel={handleResetSession}
          />
        )}

        {currentStep === 'interview' && (
          <IntakeInterview
            encounterId={encounterId || 'enc_synth_001'}
            patientName={patientName || 'Eleanor Johnson'}
            onComplete={handleInterviewComplete}
            onResetSession={handleResetSession}
          />
        )}

        {currentStep === 'summary' && (
          <IntakeSummary
            patientId={patientId}
            patientName={patientName || 'Eleanor Johnson'}
            encounterId={encounterId || 'enc_synth_001'}
            facts={collectedFacts}
            onStartNewSession={handleResetSession}
            onProceedToDocuments={() => setCurrentStep('documents')}
            onProceedToScheduling={() => setCurrentStep('scheduling')}
          />
        )}

        {currentStep === 'documents' && (
          <div className="w-full max-w-4xl space-y-6" data-testid="kiosk-documents-step">
            <DocumentUploadZone encounterId={encounterId || 'enc_demo_001'} />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetSession}
                data-testid="kiosk-finish-checkin-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 min-h-[48px] px-6 py-3 shadow-xs text-sm"
              >
                Skip & Return to Welcome
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('scheduling')}
                data-testid="proceed-to-scheduling-from-docs-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 min-h-[48px] px-6 py-3 shadow-sm text-sm font-semibold"
              >
                Proceed to Appointment Scheduling (G4)
              </button>
            </div>
          </div>
        )}

        {currentStep === 'scheduling' && (
          <div className="w-full max-w-4xl" data-testid="kiosk-scheduling-step">
            <AppointmentSchedulingHub
              encounterId={encounterId || 'enc_demo_001'}
              patientName={patientName || 'Eleanor Johnson'}
              onReturnHome={handleResetSession}
            />
          </div>
        )}
      </div>
    </KioskLayout>
  );
};
