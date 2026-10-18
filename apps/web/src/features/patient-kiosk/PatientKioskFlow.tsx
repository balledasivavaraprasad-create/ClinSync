import React, { useState } from 'react';
import { KioskWelcome } from './KioskWelcome';
import { IdentityConfirmationModal } from './IdentityConfirmationModal';
import { NewPatientForm } from '../patient-registration/NewPatientForm';
import { IntakeInterview } from '../patient-intake/IntakeInterview';
import { IntakeSummary } from '../patient-intake/IntakeSummary';
import { KioskLayout } from '../../layouts/KioskLayout';
import { mockApi } from '../../lib/api/mockAdapter';
import type { IdentityCandidate, ClinicalFact, Encounter } from '../../lib/api/types';

export type KioskFlowStep =
  | 'welcome'
  | 'confirm-identity'
  | 'new-patient'
  | 'interview'
  | 'summary';

export const PatientKioskFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<KioskFlowStep>('welcome');
  const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [encounterId, setEncounterId] = useState<string>('');
  const [collectedFacts, setCollectedFacts] = useState<ClinicalFact[]>([]);
  const [candidate, setCandidate] = useState<IdentityCandidate | undefined>(undefined);

  // 1. Returning patient check-in initiated
  const handleSelectReturning = async () => {
    try {
      // Lookup candidate list from mockApi
      const res = await mockApi.lookupCandidates({});
      const found = res.data.candidates[0];
      setCandidate(found);
    } catch {
      // fallback candidate if lookup fails
      setCandidate({
        candidate_id: 'cand_synth_001',
        masked_name: 'E*** J***',
        dob_year: 1984,
        contact_hint: '(***) ***-4821',
      });
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
          />
        )}
      </div>
    </KioskLayout>
  );
};
