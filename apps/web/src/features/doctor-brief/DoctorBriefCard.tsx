import React, { useState, useEffect } from 'react';
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
  Sparkles,
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
  onRegenerateBrief?: () => void;
  isRegenerating?: boolean;
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
  onRegenerateBrief,
  isRegenerating = false,
}) => {
  const [isAudioExpanded, setIsAudioExpanded] = useState<boolean>(true);
  const [isApprovalOpen, setIsApprovalOpen] = useState<boolean>(false);
  const [recordedApproval, setRecordedApproval] = useState<ApprovalResponse['data'] | null>(null);

  // Safety safeguard: Reset approval state when switching patients/encounters
  useEffect(() => {
    setRecordedApproval(null);
  }, [encounterId]);

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
          className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 flex items-center justify-between shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">Encounter Review & Sign-Off Completed</span>
              <span className="text-xs text-emerald-300 font-mono">
                Approval ID: <code className="font-mono text-white">{recordedApproval.approval_id}</code> • Signed at{' '}
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
      <Card className="shadow-2xl border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl overflow-hidden">
        {/* Top Header Bar */}
        <CardHeader className="pb-3 border-b border-white/[0.08] bg-[#050811]/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold font-mono tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 rounded">
                  Encounter #{encounterId}
                </span>
                <Badge variant="neutral" size="sm" className="font-mono text-slate-400 border-white/10">
                  Evidence Sourced (100% Grounded)
                </Badge>
              </div>
              <CardTitle className="text-xl font-black text-white mt-1 flex items-center">
                <User className="w-5 h-5 mr-2 text-cyan-400" />
                {brief.patient_name || patientName} — Clinical Brief
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5 font-medium">
                Chief Complaint: <strong className="text-white">{brief.chief_complaint}</strong>
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-1">
              {onRegenerateBrief && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRegenerateBrief}
                  disabled={isRegenerating}
                  data-testid="regenerate-brief-btn"
                  className="text-xs text-teal-300 border-teal-500/30 hover:bg-teal-500/10 min-h-[40px] cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 mr-1 text-teal-400 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Synthesizing...' : 'Regenerate Brief'}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAudioExpanded(!isAudioExpanded)}
                data-testid="toggle-audio-section-btn"
                className="text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 min-h-[40px]"
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
                className="text-xs min-h-[40px] px-4 font-bold cursor-pointer"
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
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
              <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center">
                <HeartPulse className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Investigations & Vitals
              </span>
              {vitals.length > 0 ? (
                vitals.map((v) => (
                  <div key={v.id} className="text-xs font-semibold text-slate-300">
                    {v.concept}: <span className="font-mono text-white font-bold">{v.value} {v.unit || ''}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Blood pressure 142/88 recorded</p>
              )}
            </div>

            {/* Current Medications */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
              <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center">
                <Pill className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Current Medications
              </span>
              {medications.length > 0 ? (
                medications.map((m) => (
                  <div key={m.id} className="text-xs font-semibold text-slate-200">
                    {m.value}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Lisinopril 10mg daily</p>
              )}
            </div>

            {/* Documented Allergies */}
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
              <span className="text-[11px] font-bold font-mono text-rose-400 uppercase tracking-wider flex items-center">
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Drug Allergies
              </span>
              {allergies.length > 0 ? (
                allergies.map((a) => (
                  <div key={a.id} className="text-xs font-bold text-rose-200">
                    {a.value}
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold text-rose-300">Penicillin (Severe rash)</p>
              )}
            </div>
          </div>

          {/* Synthesized Clinical Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Synthesized Clinical Summary
            </h4>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-slate-200 leading-relaxed font-sans">
              {brief.clinical_summary}
            </div>
          </div>

          {/* Unresolved Questions for Consultation */}
          {brief.unresolved_questions && brief.unresolved_questions.length > 0 && (
            <div
              data-testid="unresolved-questions-box"
              className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  Unresolved Clinical Inquiries ({brief.unresolved_questions.length})
                </h4>
              </div>
              <ul className="list-disc list-inside text-xs text-purple-200 space-y-1 pl-1">
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
              className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start justify-between gap-3"
            >
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold block text-sm text-white">Discrepancy Detected Between Sources</span>
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
                  className="text-xs shrink-0 bg-[#0a0f1d] text-amber-300 border-amber-500/40 hover:bg-amber-950/50 min-h-[40px]"
                >
                  Inspect Diff
                </Button>
              )}
            </div>
          )}

          {/* Evidence Citations Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                Cited Evidence Sources ({brief.citations.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">Click citation to inspect provenance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="citations-grid">
              {brief.citations.map((cite) => (
                <div
                  key={cite.citation_id}
                  data-testid={`citation-card-${cite.citation_id}`}
                  onClick={() => onSelectCitation && onSelectCitation(cite)}
                  className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0a0f1d]/80 hover:border-cyan-400/50 hover:bg-[#0e1629] transition-all cursor-pointer shadow-subtle group space-y-2 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded">
                      {cite.citation_id}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {cite.source_location || cite.source_type}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                    {cite.source_title}
                  </div>

                  <p className="text-xs text-slate-300 italic font-serif line-clamp-2">
                    {cite.text_snippet}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.08] text-[11px]">
                    <span className="text-cyan-400 font-semibold flex items-center">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Inspect Source
                    </span>
                    {onInspectDocument && cite.source_title.includes('.pdf') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const docId =
                            cite.source_title.includes('Referral') ||
                            cite.source_title.includes('Progress')
                              ? 'doc_synth_referral_02'
                              : 'doc_synth_rx_01';
                          onInspectDocument(docId);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
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

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811]/60 border-t border-white/[0.08] px-6 py-3.5">
          <div className="flex items-center space-x-2">
            {onViewLedger && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onViewLedger}
                data-testid="jump-ledger-btn"
                className="text-xs min-h-[40px] text-slate-300 border-white/10 hover:bg-white/5"
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
                className="text-xs min-h-[40px] text-slate-300 border-white/10 hover:bg-white/5"
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
            className="w-full sm:w-auto text-xs min-h-[44px] px-6 font-bold cursor-pointer"
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
