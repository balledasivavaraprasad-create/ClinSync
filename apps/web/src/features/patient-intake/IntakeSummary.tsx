import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { ClinicalFact } from '../../lib/api/types';
import {
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

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
      <Card className="shadow-lg border-teal-200 overflow-hidden">
        <div className="h-2 bg-teal-600" />
        <CardHeader className="text-center pt-8 pb-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-3 border border-teal-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900">
            Intake Completed Successfully
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 max-w-md mx-auto">
            Thank you, <strong>{patientName}</strong> {patientId ? `(${patientId})` : ''}. Your reported symptoms have been recorded under encounter{' '}
            <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-teal-800">
              {encounterId}
            </code>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 sm:px-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 flex items-center">
              <ClipboardList className="w-4 h-4 mr-1.5 text-teal-600" />
              Recorded Clinical Facts (Context Ledger)
            </span>
            <span className="text-xs text-slate-400">
              {displayFacts.length} fact(s) captured
            </span>
          </div>

          <div className="space-y-2.5">
            {displayFacts.map((fact) => (
              <div
                key={fact.id}
                className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">
                      {fact.concept}
                    </span>
                    <span className="text-xs text-slate-500">({fact.value})</span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Source: {fact.source_type} • Method: {fact.extraction_method || 'direct'}
                  </span>
                </div>
                <Badge status={fact.status} />
              </div>
            ))}
          </div>

          <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-teal-900 text-xs flex items-start space-x-2.5 mt-4">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>
              Your symptoms are ready for clinician review. You can attach medical documents or proceed directly to clinic appointment booking.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border-t border-slate-100 px-6 sm:px-8 py-4">
          <Button
            variant="outline"
            onClick={onStartNewSession}
            data-testid="return-home-btn"
            className="w-full sm:w-auto text-slate-600"
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
                className="w-full sm:w-auto text-teal-800 border-teal-300 hover:bg-teal-50"
              >
                Upload Documents
              </Button>
            )}

            {onProceedToScheduling && (
              <Button
                variant="primary"
                onClick={onProceedToScheduling}
                data-testid="proceed-to-scheduling-btn"
                className="w-full sm:w-auto"
              >
                Book Appointment (G4)
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
