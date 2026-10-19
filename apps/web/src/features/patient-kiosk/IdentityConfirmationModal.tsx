import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mockApi } from '../../lib/api/mockAdapter';
import type { IdentityCandidate, IdentityConfirmResponse } from '../../lib/api/types';
import {
  ShieldAlert,
  UserCheck,
  Calendar,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Users,
  Sparkles,
  Zap,
} from 'lucide-react';

interface IdentityConfirmationModalProps {
  candidate?: IdentityCandidate;
  candidates?: IdentityCandidate[];
  onConfirmed: (confirmation: IdentityConfirmResponse['data']) => void;
  onCancel: () => void;
  onRouteToStaff: () => void;
}

export const IdentityConfirmationModal: React.FC<IdentityConfirmationModalProps> = ({
  candidate,
  candidates,
  onConfirmed,
  onCancel,
  onRouteToStaff,
}) => {
  // If candidates array provided, use first as default
  const candidateList = candidates && candidates.length > 0 ? candidates : candidate ? [candidate] : [
    {
      candidate_id: 'cand_demo_001',
      masked_name: 'E. J***son',
      dob_year: 1982,
      contact_hint: '(***) ***-4821',
    },
    {
      candidate_id: 'cand_demo_002',
      masked_name: 'M. P***el',
      dob_year: 1968,
      contact_hint: '(***) ***-8812',
    },
  ];

  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [dob, setDob] = useState<string>('');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uncertainState, setUncertainState] = useState<boolean>(false);

  const currentCandidate = candidateList[selectedCandidateIndex] || candidateList[0];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUncertainState(false);

    if (!dob.trim()) {
      setErrorMessage('Please enter your Date of Birth to verify identity.');
      return;
    }

    if (!consentGiven) {
      setErrorMessage('Consent to electronic triage intake is required to proceed.');
      return;
    }

    // Verify year matches candidate record
    const enteredYear = parseInt(dob.split('-')[0], 10);
    if (!isNaN(enteredYear) && currentCandidate.dob_year && enteredYear !== currentCandidate.dob_year) {
      setUncertainState(true);
      setErrorMessage(
        `Uncertain Identity: The birth year entered (${enteredYear}) does not match this candidate record (${currentCandidate.dob_year}). Please re-verify your Date of Birth or proceed to the reception desk for staff assistance.`
      );
      return;
    }

    setLoading(true);
    try {
      // Validate secondary verification via mockApi
      const res = await mockApi.confirmIdentity({
        candidate_id: currentCandidate.candidate_id,
        secondary_auth_type: 'dob_full',
        auth_payload: dob,
      });

      if (res.data.confirmed) {
        onConfirmed(res.data);
      } else {
        setUncertainState(true);
        setErrorMessage(
          'Identity could not be verified with the provided details. Please re-enter your Date of Birth or ask reception staff for assistance.'
        );
      }
    } catch {
      setErrorMessage('Network error communicating with identity service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="identity-confirmation-container"
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500" />
        <div className="pt-7 pb-4 px-6 sm:px-8 text-center border-b border-white/[0.06]">
          <div className="w-13 h-13 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-3 border border-cyan-500/25 shadow-lg shadow-cyan-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight">
            Confirm Your Identity
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
            For medical privacy, we must verify your identity before starting your intake encounter.
          </p>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="space-y-5 px-6 sm:px-8 py-6">
            {/* Multiple Candidate Selector if > 1 */}
            {candidateList.length > 1 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Multiple Match Candidates Found. Please select your record:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {candidateList.map((cand, idx) => (
                    <button
                      key={cand.candidate_id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidateIndex(idx);
                        setErrorMessage(null);
                        setUncertainState(false);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        selectedCandidateIndex === idx
                          ? 'border-cyan-400 bg-cyan-500/15 text-white font-bold ring-2 ring-cyan-500/25 shadow-md shadow-cyan-500/10'
                          : 'border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      <div className="truncate text-white font-semibold">{cand.masked_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">Born {cand.dob_year}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Masked Candidate Card */}
            <div
              data-testid="masked-candidate-card"
              className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-inner"
            >
              <div>
                <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block">
                  Matched Record Candidate
                </span>
                <span
                  data-testid="masked-candidate-name"
                  className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5 block"
                >
                  {currentCandidate.masked_name}
                </span>
                <span className="text-xs text-slate-400 block mt-1 font-mono">
                  Birth Year: {currentCandidate.dob_year} • Phone: {currentCandidate.contact_hint}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm">
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Candidate Found
                </span>
              </div>
            </div>

            {/* Privacy Warning Guard */}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl text-xs flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="text-amber-300">Privacy Protocol:</strong> No previous medical records or clinical history are displayed until your Date of Birth is confirmed.
              </span>
            </div>

            {/* Secondary Verification: DOB */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="dob-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
                >
                  Enter your Date of Birth (Secondary Verification):
                </label>
              </div>
              <div className="relative">
                <Input
                  id="dob-input"
                  data-testid="dob-input"
                  type="date"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setErrorMessage(null);
                    setUncertainState(false);
                  }}
                  placeholder="YYYY-MM-DD"
                  className="w-full text-base py-3 pl-10 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
                  required
                />
                <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                Example: {currentCandidate.dob_year}-05-12 (Enter full birth date as registered in your records)
              </span>

              {/* Sample Login Quick Options */}
              <div className="pt-2">
                <span className="text-[11px] uppercase tracking-wider text-cyan-400/90 font-mono font-semibold flex items-center mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Quick Sample Login (Demo Access):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="sample-login-cand1-btn"
                    onClick={() => {
                      setSelectedCandidateIndex(0);
                      setDob('1982-05-12');
                      setConsentGiven(true);
                      setErrorMessage(null);
                      setUncertainState(false);
                      // Auto trigger confirmation for instant login
                      onConfirmed({
                        confirmed: true,
                        patient_id: 'pat_synth_001',
                        display_name: 'Eleanor Johnson',
                        identity_status: 'CONFIRMED',
                      });
                    }}
                    className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-left transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-cyan-300 flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                        Sample Login: Eleanor J.
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        DOB: 1982-05-12 (Cardiology)
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      Login →
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="sample-login-cand2-btn"
                    onClick={() => {
                      setSelectedCandidateIndex(1);
                      setDob('1968-09-24');
                      setConsentGiven(true);
                      setErrorMessage(null);
                      setUncertainState(false);
                      // Auto trigger confirmation for instant login
                      onConfirmed({
                        confirmed: true,
                        patient_id: 'pat_synth_002',
                        display_name: 'Marcus Patel',
                        identity_status: 'CONFIRMED',
                      });
                    }}
                    className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-left transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-teal-300 flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-1 text-teal-400" />
                        Sample Login: Marcus P.
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        DOB: 1968-09-24 (Neurology)
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-teal-400 group-hover:translate-x-0.5 transition-transform">
                      Login →
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start space-x-3 cursor-pointer pt-1 group">
              <input
                type="checkbox"
                data-testid="consent-checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-5 h-5 text-cyan-500 rounded border-white/20 bg-slate-900 focus:ring-cyan-400 mt-0.5 accent-cyan-400"
              />
              <span className="text-xs text-slate-300 leading-relaxed group-hover:text-white transition-colors">
                I confirm this is my record and consent to automated clinical intake questioning and structured fact extraction for clinical triage.
              </span>
            </label>

            {/* Error / Uncertain State Banner */}
            {errorMessage && (
              <div
                role="alert"
                data-testid="identity-error-alert"
                className={`p-4 rounded-xl text-xs flex items-start space-x-2.5 border backdrop-blur-md ${
                  uncertainState
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${uncertainState ? 'text-amber-400' : 'text-rose-400'}`} />
                <div className="flex-1">
                  <span className="font-bold block text-sm">
                    {uncertainState ? 'Uncertain Identity State' : 'Verification Failed'}
                  </span>
                  <span className="mt-1 block leading-relaxed">{errorMessage}</span>
                  {uncertainState && (
                    <div className="mt-2.5 pt-2.5 border-t border-amber-500/30 flex items-center justify-between">
                      <span className="text-amber-300">Need reception staff to look up your chart?</span>
                      <button
                        type="button"
                        data-testid="uncertain-staff-link"
                        onClick={onRouteToStaff}
                        className="font-bold underline text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        Go to Reception Desk
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811]/90 border-t border-white/[0.06] px-6 sm:px-8 py-4">
            <Button
              type="button"
              variant="outline"
              data-testid="not-me-btn"
              onClick={onCancel}
              className="w-full sm:w-auto text-slate-300 hover:text-white border-white/10"
            >
              This is Not Me
            </Button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={onRouteToStaff}
                className="text-xs text-slate-400 hover:text-white"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
                Staff Help
              </Button>
              <Button
                type="submit"
                variant="primary"
                data-testid="confirm-identity-btn"
                disabled={loading}
                className="flex-1 sm:flex-none min-w-[160px] font-bold"
              >
                {loading ? (
                  'Verifying...'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm & Proceed
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
