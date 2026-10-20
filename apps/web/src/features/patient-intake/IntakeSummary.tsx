import React from 'react';
import { Button } from '../../components/ui/Button';
import type { ClinicalFact } from '../../lib/api/types';
import {
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { PatientAITransparencyLedger } from './PatientAITransparencyLedger';

interface IntakeSummaryProps {
  patientId?: string;
  patientName: string;
  encounterId: string;
  facts: ClinicalFact[];
  onStartNewSession: () => void;
  onProceedToDocuments?: () => void;
  onProceedToScheduling?: () => void;
}

export const IntakeSummary: React.FC<IntakeSummaryProps> = ({
  patientId,
  patientName,
  encounterId,
  facts,
  onStartNewSession,
  onProceedToDocuments,
  onProceedToScheduling,
}) => {
  // Fallback demo facts if none returned from mock turn
  const displayFacts: ClinicalFact[] = facts.length > 0 ? facts : [
    {
      id: 'fact_reported_01',
      patient_id: 'pat_synth_001',
      encounter_id: encounterId,
      concept: 'Persistent dry cough',
      value: 'present',
      unit: null,
      clinical_time: '3 days',
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_VOICE',
      source_id: 'turn_01',
      source_location: 'kiosk_voice_audio',
      extraction_method: 'automated_llm',
      confidence: 0.94,
      reviewed_by: null,
      supersedes_fact_id: null,
    },
    {
      id: 'fact_reported_02',
      patient_id: 'pat_synth_001',
      encounter_id: encounterId,
      concept: 'Discomfort Rating',
      value: '4/10',
      unit: 'pain_scale_10',
      clinical_time: null,
      recorded_at: new Date().toISOString(),
      fact_type: 'symptom',
      status: 'reported',
      source_type: 'PATIENT_FORM',
      source_id: 'turn_03',
      source_location: 'touch_slider',
      extraction_method: 'deterministic_input',
      confidence: 1.0,
      reviewed_by: null,
      supersedes_fact_id: null,
    },
  ];

  return (
    <div
      data-testid="intake-summary-container"
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <div className="text-center pt-8 pb-4 px-6 sm:px-8 border-b border-white/[0.06]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30 shadow-lg shadow-emerald-500/15">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight">
            Intake Completed Successfully
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
            Thank you, <strong className="text-white">{patientName}</strong> {patientId ? `(${patientId})` : ''}. Your reported symptoms have been recorded under encounter{' '}
            <code className="text-xs font-mono bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded text-cyan-300">
              {encounterId}
            </code>
            .
          </p>
        </div>

        <div className="space-y-6 px-6 sm:px-8 py-6">
          <PatientAITransparencyLedger
            facts={displayFacts}
            encounterId={encounterId}
            patientName={patientName}
            showCardWrapper={false}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811]/90 border-t border-white/[0.06] px-6 sm:px-8 py-4">
          <Button
            variant="outline"
            onClick={onStartNewSession}
            data-testid="return-home-btn"
            className="w-full sm:w-auto text-slate-300 hover:text-white border-white/10"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Finish & Return
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {onProceedToDocuments && (
              <Button
                variant="outline"
                onClick={onProceedToDocuments}
                data-testid="proceed-to-documents-btn"
                className="w-full sm:w-auto text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
              >
                Upload Documents
              </Button>
            )}

            {onProceedToScheduling && (
              <Button
                variant="primary"
                onClick={onProceedToScheduling}
                data-testid="proceed-to-scheduling-btn"
                className="w-full sm:w-auto font-bold"
              >
                Book Appointment (G4)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
