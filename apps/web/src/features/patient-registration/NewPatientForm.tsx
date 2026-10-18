import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { mockApi } from '../../lib/api/mockAdapter';
import type { Encounter } from '../../lib/api/types';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Phone,
  User,
  Calendar,
  HeartPulse,
} from 'lucide-react';

interface NewPatientFormProps {
  onRegistered: (patient: { id: string; name: string }, encounter: Encounter) => void;
  onCancel: () => void;
}

export const NewPatientForm: React.FC<NewPatientFormProps> = ({
  onRegistered,
  onCancel,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!fullName.trim()) {
      setValidationError('Please enter your full legal name.');
      return;
    }
    if (!dob.trim()) {
      setValidationError('Please enter your date of birth.');
      return;
    }
    if (!phone.trim()) {
      setValidationError('Please enter a contact phone number.');
      return;
    }
    if (!consent) {
      setValidationError('Please accept the clinical intake consent to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const newPatientId = `pat_synth_${Date.now().toString().slice(-4)}`;
      const encounterRes = await mockApi.createEncounter({
        patient_id: newPatientId,
        intake_language: 'en-US',
      });

      onRegistered(
        { id: newPatientId, name: fullName.trim() },
        encounterRes.data
      );
    } catch {
      setValidationError('Registration service is temporarily unreachable. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="new-patient-registration-container"
      className="w-full max-w-2xl mx-auto space-y-4"
    >
      <button
        onClick={onCancel}
        className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer font-mono"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Welcome
      </button>

      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-teal-400" />
        <div className="pt-7 pb-4 px-6 sm:px-8 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight">
                New Patient Registration
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">
                Enter your basic details to start your clinical intake encounter.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 pt-5 pb-6 px-6 sm:px-8">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-patient-name"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
              >
                Full Legal Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Input
                  id="new-patient-name"
                  data-testid="patient-name-input"
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
                  required
                />
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Date of Birth & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-patient-dob"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
                >
                  Date of Birth <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-patient-dob"
                    data-testid="patient-dob-input"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="pl-10 text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
                    required
                  />
                  <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-patient-phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
                >
                  Mobile / Phone <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-patient-phone"
                    data-testid="patient-phone-input"
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
                    required
                  />
                  <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-patient-emergency"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono"
              >
                Emergency Contact (Name & Phone)
              </label>
              <div className="relative">
                <Input
                  id="new-patient-emergency"
                  data-testid="patient-emergency-input"
                  type="text"
                  placeholder="e.g. John Vance (Spouse) - (555) 123-4567"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="pl-10 text-base py-3 bg-[#0d1322] border-white/15 text-white focus:border-cyan-400"
                />
                <HeartPulse className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Consent Toggle */}
            <div className="pt-2">
              <label className="flex items-start space-x-3 cursor-pointer p-4 bg-white/[0.025] border border-white/[0.08] rounded-xl group hover:border-cyan-400/40 transition-colors">
                <input
                  type="checkbox"
                  data-testid="registration-consent-checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 text-cyan-500 rounded border-white/20 bg-slate-900 focus:ring-cyan-400 mt-0.5 accent-cyan-400"
                />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold block text-white group-hover:text-cyan-300 transition-colors">
                    Consent to Digital Intake & Clinical Fact Processing
                  </span>
                  I consent to the collection and algorithmic extraction of my reported symptoms for clinical triage and doctor preparation.
                </div>
              </label>
            </div>

            {/* Validation Error Message */}
            {validationError && (
              <div
                role="alert"
                data-testid="registration-error-alert"
                className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-200 rounded-xl text-xs"
              >
                {validationError}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-[#050811]/90 border-t border-white/[0.06] px-6 sm:px-8 py-4">
            <Button type="button" variant="outline" onClick={onCancel} className="text-slate-300 hover:text-white border-white/10">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              data-testid="submit-registration-btn"
              disabled={submitting}
              className="min-w-[160px] font-bold"
            >
              {submitting ? (
                'Registering...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Begin Intake
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>Data is encrypted and stored strictly in compliance with hospital security protocols.</span>
      </div>
    </div>
  );
};
