import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
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
      <Card className="shadow-lg border-teal-100 overflow-hidden">
        <div className="h-2 bg-teal-600" />
        <CardHeader className="pb-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center mb-2 border border-teal-100">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Confirm Your Identity
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm">
            For medical privacy, we must verify your identity before starting your intake encounter.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleConfirm}>
          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Multiple Candidate Selector if > 1 */}
            {candidateList.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  Multiple Match Candidates Found. Please select your record:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {candidateList.map((cand, idx) => (
                    <button
                      key={cand.candidate_id}
                      type="button"
                      onClick={() => {
                        setSelectedCandidateIndex(idx);
                        setErrorMessage(null);
                        setUncertainState(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        selectedCandidateIndex === idx
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950 font-bold ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="truncate">{cand.masked_name}</div>
                      <div className="text-[11px] text-slate-500 font-normal">Born {cand.dob_year}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Masked Candidate Card */}
            <div
              data-testid="masked-candidate-card"
              className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                  Matched Record Candidate
                </span>
                <span
                  data-testid="masked-candidate-name"
                  className="text-lg font-bold text-slate-800"
                >
                  {currentCandidate.masked_name}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Birth Year: {currentCandidate.dob_year} • Phone: {currentCandidate.contact_hint}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800">
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Candidate Found
                </span>
              </div>
            </div>

            {/* Privacy Warning Guard */}
            <div className="bg-amber-50/80 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-lg text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Protocol:</strong> No previous medical records or clinical history are displayed until your Date of Birth is confirmed.
              </span>
            </div>

            {/* Secondary Verification: DOB */}
            <div className="space-y-1.5">
              <label
                htmlFor="dob-input"
                className="block text-sm font-semibold text-slate-800"
              >
                Enter your Date of Birth (Secondary Verification):
              </label>
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
                  className="w-full text-base py-3 pl-10"
                  required
                />
                <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
              <span className="text-xs text-slate-500">
                Example: {currentCandidate.dob_year}-05-12 (Enter full birth date as registered in your records)
              </span>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start space-x-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                data-testid="consent-checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 mt-0.5"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                I confirm this is my record and consent to automated clinical intake questioning and structured fact extraction for clinical triage.
              </span>
            </label>

            {/* Error / Uncertain State Banner */}
            {errorMessage && (
              <div
                role="alert"
                data-testid="identity-error-alert"
                className={`p-3.5 rounded-lg text-xs flex items-start space-x-2 border ${
                  uncertainState
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${uncertainState ? 'text-amber-600' : 'text-rose-600'}`} />
                <div className="flex-1">
                  <span className="font-semibold block">
                    {uncertainState ? 'Uncertain Identity State' : 'Verification Failed'}
                  </span>
                  <span>{errorMessage}</span>
                  {uncertainState && (
                    <div className="mt-2 pt-2 border-t border-amber-200 flex items-center justify-between">
                      <span className="text-amber-800">Need reception staff to look up your chart?</span>
                      <button
                        type="button"
                        data-testid="uncertain-staff-link"
                        onClick={onRouteToStaff}
                        className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
                      >
                        Go to Reception Desk
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 border-t border-slate-100 px-6 sm:px-8 py-4">
            <Button
              type="button"
              variant="outline"
              data-testid="not-me-btn"
              onClick={onCancel}
              className="w-full sm:w-auto text-slate-600"
            >
              This is Not Me
            </Button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={onRouteToStaff}
                className="text-xs text-slate-600"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
                Staff Help
              </Button>
              <Button
                type="submit"
                variant="primary"
                data-testid="confirm-identity-btn"
                disabled={loading}
                className="flex-1 sm:flex-none min-w-[150px]"
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
