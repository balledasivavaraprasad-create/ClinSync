import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockApi } from '../../lib/api/mockAdapter';
import type { ApprovalResponse, ClinicalFact } from '../../lib/api/types';
import {
  CheckCircle2,
  AlertCircle,
  Edit3,
  XCircle,
  ShieldCheck,
} from 'lucide-react';

interface DoctorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterId: string;
  patientName: string;
  facts?: ClinicalFact[];
  onApprovalRecorded: (response: ApprovalResponse['data']) => void;
}

export const DoctorApprovalModal: React.FC<DoctorApprovalModalProps> = ({
  isOpen,
  onClose,
  encounterId,
  patientName,
  facts = [],
  onApprovalRecorded,
}) => {
  const [decision, setDecision] = useState<'APPROVED' | 'CORRECTIONS_NEEDED' | 'REJECTED'>('APPROVED');
  const [doctorNotes, setDoctorNotes] = useState<string>(
    'Reviewed synthesized brief, medication reconciliation, and diagnostic records. Plan confirmed with patient.'
  );
  const [selectedCorrectionIds, setSelectedCorrectionIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleFactCorrection = (factId: string) => {
    setSelectedCorrectionIds((prev) =>
      prev.includes(factId) ? prev.filter((id) => id !== factId) : [...prev, factId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await mockApi.submitDoctorApproval(encounterId, {
        doctor_id: 'dr_clara_chen',
        decision,
        doctor_notes: doctorNotes,
        corrected_fact_ids: decision === 'CORRECTIONS_NEEDED' ? selectedCorrectionIds : undefined,
      });

      onApprovalRecorded(res.data);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to record clinical approval'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Clinical Review Sign-off & Encounter Approval"
      description={`Encounter #${encounterId} • Patient: ${patientName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-3" data-testid="doctor-approval-modal">
        {/* Decision Radio Cards */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
            Clinical Sign-Off Decision
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setDecision('APPROVED')}
              data-testid="decision-approved-btn"
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                decision === 'APPROVED'
                  ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200 ring-2 ring-emerald-500/40 shadow-md shadow-emerald-500/10'
                  : 'border-white/[0.08] bg-[#0a0f1d]/80 hover:bg-[#0e1629] text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-white">Approve & Sign</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Context verified; ready for prescription / treatment.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDecision('CORRECTIONS_NEEDED')}
              data-testid="decision-corrections-btn"
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                decision === 'CORRECTIONS_NEEDED'
                  ? 'border-amber-500/80 bg-amber-950/40 text-amber-200 ring-2 ring-amber-500/40 shadow-md shadow-amber-500/10'
                  : 'border-white/[0.08] bg-[#0a0f1d]/80 hover:bg-[#0e1629] text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span className="text-white">Request Edits</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Flag disputed facts or symptom timeline discrepancy.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDecision('REJECTED')}
              data-testid="decision-rejected-btn"
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                decision === 'REJECTED'
                  ? 'border-rose-500/80 bg-rose-950/40 text-rose-200 ring-2 ring-rose-500/40 shadow-md shadow-rose-500/10'
                  : 'border-white/[0.08] bg-[#0a0f1d]/80 hover:bg-[#0e1629] text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span className="text-white">Refute / Escalate</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Reject intake findings; escalate to in-person ER.
              </p>
            </button>
          </div>
        </div>

        {/* Fact flagging if corrections needed */}
        {decision === 'CORRECTIONS_NEEDED' && facts.length > 0 && (
          <div className="space-y-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl">
            <span className="text-xs font-bold text-amber-300 block">
              Select Facts Requiring Physician Amendment:
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {facts.map((f) => {
                const isSelected = selectedCorrectionIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFactCorrection(f.id)}
                    data-testid={`correction-fact-${f.id}`}
                    className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/20 text-white font-bold'
                        : 'border-white/10 bg-[#050811] text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{f.concept}: {f.value}</span>
                    <Badge variant="neutral" size="sm" className="ml-2 text-[10px] text-slate-400 border-white/10">
                      {f.fact_type}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Doctor Clinical Notes */}
        <div className="space-y-1.5">
          <label htmlFor="doctor-notes" className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
            Physician Consultation Notes & Treatment Plan:
          </label>
          <textarea
            id="doctor-notes"
            data-testid="doctor-notes-textarea"
            rows={3}
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            required
            className="w-full text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-[#050811] text-white leading-relaxed font-sans placeholder-slate-500"
            placeholder="Document clinical observations, diagnosis, and post-consultation directions..."
          />
        </div>

        {/* Error Notice */}
        {submitError && (
          <div
            role="alert"
            data-testid="approval-error-alert"
            className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-xl text-xs flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center text-xs text-slate-400 space-x-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Appends immutable audit record to encounter ledger</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none text-xs min-h-[44px] text-slate-300 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              data-testid="submit-approval-btn"
              className="flex-1 sm:flex-none text-xs min-h-[44px] px-6 font-bold cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Commit Sign-off'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};
