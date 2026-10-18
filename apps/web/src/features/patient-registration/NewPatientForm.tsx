import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
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
        className="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Welcome
      </button>

      <Card className="shadow-lg border-slate-200 overflow-hidden">
        <div className="h-2 bg-indigo-600" />
        <CardHeader className="pt-6 pb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                New Patient Registration
              </CardTitle>
              <CardDescription className="text-slate-600 text-sm">
                Enter your basic details to start your clinical intake encounter.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4 px-6 sm:px-8">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-patient-name"
                className="block text-sm font-semibold text-slate-800"
              >
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="new-patient-name"
                  data-testid="patient-name-input"
                  type="text"
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 text-base py-3"
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
                  className="block text-sm font-semibold text-slate-800"
                >
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-patient-dob"
                    data-testid="patient-dob-input"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="pl-10 text-base py-3"
                    required
                  />
                  <Calendar className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-patient-phone"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Mobile / Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="new-patient-phone"
                    data-testid="patient-phone-input"
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 text-base py-3"
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
                className="block text-sm font-semibold text-slate-800"
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
                  className="pl-10 text-base py-3"
                />
                <HeartPulse className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Consent Toggle */}
            <div className="pt-2">
              <label className="flex items-start space-x-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  data-testid="registration-consent-checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold block text-slate-900">
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
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs"
              >
                {validationError}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between bg-slate-50 border-t border-slate-100 px-6 sm:px-8 py-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              data-testid="submit-registration-btn"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px]"
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
          </CardFooter>
        </form>
      </Card>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
        <span>Data is encrypted and stored strictly in compliance with hospital security protocols.</span>
      </div>
    </div>
  );
};
