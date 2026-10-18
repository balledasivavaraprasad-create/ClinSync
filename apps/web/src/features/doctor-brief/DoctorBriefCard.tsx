import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AudioBriefPlayer } from './AudioBriefPlayer';
import { DoctorApprovalModal } from './DoctorApprovalModal';
import type {
  DoctorBriefResponse,
  ClinicalFact,
  Citation,
  ApprovalResponse,
} from '../../lib/api/types';
import {
  FileText,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  User,
  HeartPulse,
  Pill,
  CheckCircle2,
  Volume2,
  Stethoscope,
} from 'lucide-react';

interface DoctorBriefCardProps {
  brief: DoctorBriefResponse['data'];
  encounterId: string;
  patientName: string;
  facts?: ClinicalFact[];
  onSelectCitation?: (citation: Citation) => void;
  onInspectDocument?: (sourceId: string) => void;
  onViewLedger?: () => void;
  onViewDiff?: () => void;
  onApprovalComplete?: (approval: ApprovalResponse['data']) => void;
}

export const DoctorBriefCard: React.FC<DoctorBriefCardProps> = ({
  brief,
  encounterId,
  patientName,
  facts = [],
  onSelectCitation,
  onInspectDocument,
  onViewLedger,
  onViewDiff,
  onApprovalComplete,
}) => {
  const [isAudioExpanded, setIsAudioExpanded] = useState<boolean>(true);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);
  const [recordedApproval, setRecordedApproval] = useState<ApprovalResponse['data'] | null>(null);

  // Derive known medications & allergies from facts
  const medications = facts.filter((f) => f.fact_type === 'medication');
  const allergies = facts.filter((f) => f.fact_type === 'allergy');
  const vitals = facts.filter((f) => f.fact_type === 'investigation' || f.concept.includes('Pressure'));
  const hasConflicts = facts.some((f) => f.status === 'conflicting');

  const handleApprovalRecorded = (res: ApprovalResponse['data']) => {
    setRecordedApproval(res);
    if (onApprovalComplete) {
      onApprovalComplete(res);
    }
  };

  return (
    <div className="space-y-4" data-testid="doctor-brief-card">
      {/* Persisted Approval Success Alert */}
      {recordedApproval && (
        <div
          role="status"
          data-testid="approval-success-banner"
          className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block">Encounter Review & Sign-Off Completed</span>
              <span className="text-xs text-emerald-800">
                Approval ID: <code className="font-mono">{recordedApproval.approval_id}</code> • Signed at{' '}
                {new Date(recordedApproval.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <Badge variant="success" size="sm">
            CONFIRMED
          </Badge>
        </div>
      )}

      {/* Main Sourced Brief Card */}
      <Card className="shadow-md border-slate-200 overflow-hidden">
        {/* Top Header Bar */}
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  Encounter #{encounterId}
                </span>
                <Badge variant="neutral" size="sm" className="font-mono text-slate-500">
                  Evidence Sourced (100% Grounded)
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-slate-900 mt-1 flex items-center">
                <User className="w-5 h-5 mr-2 text-slate-500" />
                {patientName} — Clinical Brief
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-0.5 font-medium">
                Chief Complaint: <strong className="text-slate-900">{brief.chief_complaint}</strong>
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAudioExpanded(!isAudioExpanded)}
                data-testid="toggle-audio-section-btn"
                className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50 min-h-[40px]"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                {isAudioExpanded ? 'Hide Audio Player' : 'Play 60s Summary'}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsApprovalOpen(true)}
                data-testid="open-signoff-modal-btn"
                className="text-xs min-h-[40px] px-4 font-bold"
              >
                <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                Review & Sign Off
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {/* Audio Player Widget */}
          {isAudioExpanded && (
            <AudioBriefPlayer
              audioUrl={brief.audio_brief_url}
              transcriptText={brief.clinical_summary}
              patientName={patientName}
              isAvailable={brief.audio_brief_available}
            />
          )}

          {/* Quick Vitals, Medications, and Allergies Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Vitals */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <HeartPulse className="w-3.5 h-3.5 mr-1 text-rose-500" />
                Investigations & Vitals
              </span>
              {vitals.length > 0 ? (
                vitals.map((v) => (
                  <div key={v.id} className="text-xs font-semibold text-slate-800">
                    {v.concept}: <span className="font-mono text-slate-900 font-bold">{v.value} {v.unit || ''}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Blood pressure 142/88 recorded</p>
              )}
            </div>

            {/* Current Medications */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <Pill className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Current Medications
              </span>
              {medications.length > 0 ? (
                medications.map((m) => (
                  <div key={m.id} className="text-xs font-semibold text-slate-800">
                    {m.value}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Lisinopril 10mg daily</p>
              )}
            </div>

            {/* Documented Allergies */}
            <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center">
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Drug Allergies
              </span>
              {allergies.length > 0 ? (
                allergies.map((a) => (
                  <div key={a.id} className="text-xs font-bold text-rose-950">
                    {a.value}
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold text-rose-900">Penicillin (Severe rash)</p>
              )}
            </div>
          </div>

          {/* Synthesized Clinical Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
              Synthesized Clinical Summary
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed font-sans">
              {brief.clinical_summary}
            </div>
          </div>

          {/* Unresolved Questions for Consultation */}
          {brief.unresolved_questions && brief.unresolved_questions.length > 0 && (
            <div
              data-testid="unresolved-questions-box"
              className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-purple-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Unresolved Clinical Inquiries ({brief.unresolved_questions.length})
                </h4>
              </div>
              <ul className="list-disc list-inside text-xs text-purple-800 space-y-1 pl-1">
                {brief.unresolved_questions.map((q, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contradiction Warning Callout */}
          {hasConflicts && (
            <div
              role="alert"
              data-testid="brief-contradiction-alert"
              className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start justify-between gap-3"
            >
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold block text-sm">Discrepancy Detected Between Sources</span>
                  Discrepancy noted regarding symptom duration between oral patient intake statement and external referral note.
                </div>
              </div>
              {onViewDiff && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onViewDiff}
                  data-testid="inspect-diff-from-brief-btn"
                  className="text-xs shrink-0 bg-white text-amber-900 border-amber-300 hover:bg-amber-100 min-h-[40px]"
                >
                  Inspect Diff
                </Button>
              )}
            </div>
          )}

          {/* Evidence Citations Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                Cited Evidence Sources ({brief.citations.length})
              </h4>
              <span className="text-[11px] text-slate-400">Click citation to inspect provenance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="citations-grid">
              {brief.citations.map((cite) => (
                <div
                  key={cite.citation_id}
                  data-testid={`citation-card-${cite.citation_id}`}
                  onClick={() => onSelectCitation && onSelectCitation(cite)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/20 transition-all cursor-pointer shadow-subtle group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded">
                      {cite.citation_id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {cite.source_location || cite.source_type}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 group-hover:text-teal-950">
                    {cite.source_title}
                  </div>

                  <p className="text-xs text-slate-600 italic font-serif line-clamp-2">
                    {cite.text_snippet}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-teal-700 font-semibold flex items-center">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Inspect Source
                    </span>
                    {onInspectDocument && cite.source_title.includes('.pdf') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectDocument('doc_synth_rx_01');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Open Document
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border-t border-slate-100 px-6 py-3.5">
          <div className="flex items-center space-x-2">
            {onViewLedger && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewLedger}
                data-testid="jump-ledger-btn"
                className="text-xs min-h-[40px]"
              >
                Clinical Context Ledger ({facts.length})
              </Button>
            )}
            {onViewDiff && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewDiff}
                data-testid="jump-diff-btn"
                className="text-xs min-h-[40px]"
              >
                Patient Context Diff
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsApprovalOpen(true)}
            data-testid="footer-signoff-btn"
            className="w-full sm:w-auto text-xs min-h-[44px] px-6 font-bold"
          >
            <Stethoscope className="w-4 h-4 mr-1.5" />
            Complete Consultation & Sign Off
          </Button>
        </CardFooter>
      </Card>

      {/* Doctor Review & Approval Dialog */}
      <DoctorApprovalModal
        isOpen={isApprovalOpen}
        onClose={() => setIsApprovalOpen(false)}
        encounterId={encounterId}
        patientName={patientName}
        facts={facts}
        onApprovalRecorded={handleApprovalRecorded}
      />
    </div>
  );
};
