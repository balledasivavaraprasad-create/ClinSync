import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Stethoscope,
  Tablet,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export type UserRole = 'doctor' | 'kiosk' | 'auditor';

export interface LoginSuccessPayload {
  role: UserRole;
  userId: string;
  userName: string;
  department?: string;
}

interface LoginPageProps {
  onLoginSuccess: (payload: LoginSuccessPayload) => void;
  onBackToLanding: () => void;
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding,
  initialRole = 'doctor',
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [userId, setUserId] = useState<string>('dr_clara_chen');
  const [password, setPassword] = useState<string>('demo1234');
  const [rememberWorkstation, setRememberWorkstation] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick-fill synthetic profiles
  const handleSelectPreset = (preset: {
    role: UserRole;
    id: string;
    pass: string;
    name: string;
    dept?: string;
  }) => {
    setSelectedRole(preset.role);
    setUserId(preset.id);
    setPassword(preset.pass);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userId.trim()) {
      setErrorMessage('Please enter your Staff ID or Station ID.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your security passcode.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against synthetic hospital directory
    setTimeout(() => {
      setIsLoading(false);
      if (selectedRole === 'doctor') {
        const isClara = userId.toLowerCase().includes('clara') || userId === 'dr_clara_chen';
        onLoginSuccess({
          role: 'doctor',
          userId: isClara ? 'dr_clara_chen' : userId,
          userName: isClara ? 'Dr. Clara Chen, MD' : 'Dr. Marcus Vance, MD',
          department: isClara ? 'Cardiology & Chest Pain Center' : 'General Internal Medicine',
        });
      } else if (selectedRole === 'kiosk') {
        onLoginSuccess({
          role: 'kiosk',
          userId: userId || 'kiosk_station_01',
          userName: 'Tablet Intake Station 01',
          department: 'Emergency & Urgent Ambulatory Check-in',
        });
      } else {
        onLoginSuccess({
          role: 'auditor',
          userId: 'auditor_quality_lead',
          userName: 'Clinical Quality & Ledger Auditor',
          department: 'Clinical Governance & Safety',
        });
      }
    }, 450);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-base">ClinSync</span>
              <span className="text-[10px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded">
                Hospital Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Memorial Health System • Workstation Auth</p>
          </div>
        </div>

        <button
          onClick={onBackToLanding}
          className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5"
          data-testid="btn-login-back-to-landing"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Landing Page</span>
        </button>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md space-y-6">
          {/* Presets Bar / Role Switcher */}
          <div className="bg-slate-800/60 p-1 rounded-xl border border-slate-700/70 grid grid-cols-3 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('doctor');
                setUserId('dr_clara_chen');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                selectedRole === 'doctor'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="role-tab-doctor"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('kiosk');
                setUserId('kiosk_tablet_01');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                selectedRole === 'kiosk'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="role-tab-kiosk"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Patient Kiosk</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('auditor');
                setUserId('auditor_quality');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                selectedRole === 'auditor'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              data-testid="role-tab-auditor"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>QA / Ledger</span>
            </button>
          </div>

          {/* Login Card */}
          <Card className="border border-slate-800 bg-slate-850/90 shadow-2xl backdrop-blur-xl text-slate-100">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white font-semibold flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-teal-400" />
                  <span>
                    {selectedRole === 'doctor'
                      ? 'Physician Sign-In'
                      : selectedRole === 'kiosk'
                      ? 'Tablet Kiosk Activation'
                      : 'Clinical Auditor Access'}
                  </span>
                </CardTitle>
                <Badge variant="info" className="text-teal-300 border-teal-500/30 bg-teal-500/10">
                  Secure SSO
                </Badge>
              </div>
              <CardDescription className="text-slate-400 text-xs">
                {selectedRole === 'doctor'
                  ? 'Enter physician ID to access active intake queue, citations, and briefs.'
                  : selectedRole === 'kiosk'
                  ? 'Activate bedside or check-in tablet for multimodal patient intake.'
                  : 'Audit-level verification of clinical provenance and safety rules.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
                {errorMessage && (
                  <div
                    className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-start space-x-2"
                    role="alert"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="login-userid" className="block text-xs font-medium text-slate-300">
                    {selectedRole === 'doctor'
                      ? 'Staff Physician ID'
                      : selectedRole === 'kiosk'
                      ? 'Kiosk Station Identifier'
                      : 'Auditor ID'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-userid"
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder={
                        selectedRole === 'doctor'
                          ? 'e.g. dr_clara_chen'
                          : selectedRole === 'kiosk'
                          ? 'e.g. kiosk_station_01'
                          : 'e.g. auditor_01'
                      }
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      data-testid="input-login-userid"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-passcode" className="block text-xs font-medium text-slate-300">
                      Security Passcode / Badge Token
                    </label>
                    <span className="text-[11px] text-teal-400 font-mono">Demo: demo1234</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-passcode"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      data-testid="input-login-passcode"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberWorkstation}
                      onChange={(e) => setRememberWorkstation(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                    />
                    <span>Remember workstation</span>
                  </label>
                  <span className="text-slate-500">TLS 1.3 Encrypted</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-lg shadow-teal-600/20 min-h-[48px] flex items-center justify-center space-x-2 text-sm"
                  isLoading={isLoading}
                  data-testid="btn-login-submit"
                >
                  <span>
                    {selectedRole === 'doctor'
                      ? 'Sign In to Doctor Console'
                      : selectedRole === 'kiosk'
                      ? 'Launch Patient Kiosk'
                      : 'Access Ledger & QA'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              {/* Demo Quick-Fill Presets */}
              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Quick Demo Profiles (1-Click Fill)</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPreset({
                        role: 'doctor',
                        id: 'dr_clara_chen',
                        pass: 'demo1234',
                        name: 'Dr. Clara Chen, MD',
                        dept: 'Cardiology',
                      })
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-750 hover:border-teal-500/40 text-xs transition-colors flex items-center justify-between group"
                    data-testid="preset-dr-clara"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-300 flex items-center justify-center font-bold text-[10px]">
                        CC
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-white">
                          Dr. Clara Chen, MD
                        </div>
                        <div className="text-[11px] text-slate-400">Cardiology & Chest Pain Center</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 font-mono">Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPreset({
                        role: 'doctor',
                        id: 'dr_marcus_vance',
                        pass: 'demo1234',
                        name: 'Dr. Marcus Vance, MD',
                        dept: 'Internal Medicine',
                      })
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-750 hover:border-teal-500/40 text-xs transition-colors flex items-center justify-between group"
                    data-testid="preset-dr-marcus"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md bg-sky-500/10 text-sky-300 flex items-center justify-center font-bold text-[10px]">
                        MV
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-white">
                          Dr. Marcus Vance, MD
                        </div>
                        <div className="text-[11px] text-slate-400">General Internal Medicine</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 font-mono">Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectPreset({
                        role: 'kiosk',
                        id: 'kiosk_station_01',
                        pass: 'demo1234',
                        name: 'Intake Tablet Kiosk',
                        dept: 'Emergency Intake',
                      })
                    }
                    className="w-full text-left p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-750 hover:border-teal-500/40 text-xs transition-colors flex items-center justify-between group"
                    data-testid="preset-kiosk-station"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                        TK
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-white">
                          Tablet Intake Kiosk
                        </div>
                        <div className="text-[11px] text-slate-400">Ambulatory Check-in Station</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-teal-400 font-mono">Fill &rarr;</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Security Banner */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              Synthetic patient data verified. Zero PHI leakage in access logs. Hospital demo policy compliant.
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-800 text-center text-xs text-slate-500">
        ClinSync Hospital Intake & Clinician Handoff • Version 0.1.0 • All data synthetic
      </footer>
    </div>
  );
};
