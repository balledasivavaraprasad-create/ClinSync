import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ThemeToggle } from '../../lib/theme';
import { LanguageSelectorDropdown } from '../../components/shared/LanguageSelectorDropdown';
import { useLanguage } from '../../lib/i18n';
import {
  Stethoscope,
  Tablet,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export type UserRole = 'doctor' | 'kiosk' | 'auditor' | 'staff';

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
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [userId, setUserId] = useState<string>('dr_clara_chen');
  const [password, setPassword] = useState<string>('demo1234');
  const [rememberWorkstation, setRememberWorkstation] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEnterPatientConsole = () => {
    onLoginSuccess({
      role: 'kiosk',
      userId: 'patient_self_service',
      userName: 'Patient Intake Kiosk',
      department: 'Emergency & Urgent Ambulatory Check-in',
    });
  };

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
    if (preset.role === 'kiosk') {
      handleEnterPatientConsole();
    }
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
      } else if (selectedRole === 'staff') {
        onLoginSuccess({
          role: 'staff',
          userId: userId || 'nurse_sarah_lin',
          userName: 'Sarah Lin, RN',
          department: 'Front Desk & Triage Operations',
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
    <div className="min-h-screen bg-slate-100 dark:bg-[#05070d] text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
      {/* Dynamic ambient glow orbs with architectural refraction */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="ambient-backdrop-image opacity-30 dark:opacity-100" />
        <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] rounded-full bg-cyan-600/[0.12] dark:bg-cyan-600/[0.07] blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.08] dark:bg-blue-600/[0.05] blur-[150px]" />
      </div>

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] bg-white/85 dark:bg-[#070a14]/80 backdrop-blur-2xl relative z-10 shadow-sm dark:shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-bold text-xs ring-1 ring-white/20">
            CS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-slate-900 dark:text-white text-base font-sans">ClinSync</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-400/30 px-1.5 py-0.5 rounded font-semibold">
                Hospital Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Memorial Health System • Workstation Auth</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <LanguageSelectorDropdown testId="login-language-selector" align="right" />
          <ThemeToggle />
          <button
            onClick={onBackToLanding}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-300 dark:border-white/[0.1] px-3.5 py-1.5 rounded-full transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
            data-testid="btn-login-back-to-landing"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Landing Page</span>
          </button>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Presets Bar / Role Switcher */}
          <div className="bg-slate-200/90 dark:bg-[#050811]/90 p-1.5 rounded-2xl border border-slate-300 dark:border-white/[0.08] grid grid-cols-3 gap-1.5 shadow-inner backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('doctor');
                setUserId('dr_clara_chen');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                selectedRole === 'doctor'
                  ? 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
              data-testid="role-tab-doctor"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>{t('auth.doctor_role', 'Doctor')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('kiosk');
                setUserId('kiosk_tablet_01');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                selectedRole === 'kiosk'
                  ? 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
              data-testid="role-tab-kiosk"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>{t('auth.kiosk_role', 'Patient Kiosk')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('staff');
                setUserId('nurse_sarah_lin');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                selectedRole === 'staff'
                  ? 'bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
              data-testid="role-tab-staff"
            >
              <User className="w-3.5 h-3.5" />
              <span>Staff Desk</span>
            </button>
          </div>

          {/* Quick direct jump banner for patient self-check-in */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleEnterPatientConsole}
              className="text-xs font-semibold text-cyan-900 dark:text-cyan-200 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900/90 border border-cyan-300 dark:border-cyan-500/40 px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
              data-testid="link-direct-patient-kiosk"
            >
              <Tablet className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              <span>Are you a patient? Enter into Patient Console directly &rarr;</span>
            </button>
          </div>

          {/* Login Card */}
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#080c17]/90 shadow-xl backdrop-blur-3xl rounded-3xl text-slate-900 dark:text-slate-100 p-6 sm:p-8">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-slate-900 dark:text-white font-semibold flex items-center space-x-2">
                  {selectedRole === 'kiosk' ? (
                    <Tablet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  )}
                  <span>
                    {selectedRole === 'doctor'
                      ? t('auth.physician_signin', 'Physician Sign-In')
                      : selectedRole === 'kiosk'
                      ? t('auth.kiosk_activation', 'Patient Kiosk Check-In')
                      : selectedRole === 'staff'
                      ? 'Staff Desk Sign-In'
                      : t('auth.auditor_access', 'Clinical Auditor Access')}
                  </span>
                </CardTitle>
                <Badge
                  variant={selectedRole === 'kiosk' ? 'success' : 'info'}
                  className={
                    selectedRole === 'kiosk'
                      ? 'text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10'
                      : 'text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/30 bg-teal-100 dark:bg-teal-500/10'
                  }
                >
                  {selectedRole === 'kiosk' ? 'No Login Required' : 'Secure Sign-In'}
                </Badge>
              </div>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
                {selectedRole === 'doctor'
                  ? 'Enter physician ID to access patient queue, evidence briefs, and clinical ledger.'
                  : selectedRole === 'kiosk'
                  ? 'Direct patient access. No password needed — start intake or check in directly.'
                  : selectedRole === 'staff'
                  ? 'Hospital staff terminal for patient queue triage and check-in management.'
                  : 'Audit-level verification of clinical provenance and safety rules.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {selectedRole === 'kiosk' ? (
                <div className="space-y-5" data-testid="kiosk-direct-entry-container">
                  <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/20 text-xs text-slate-800 dark:text-slate-300 space-y-2.5">
                    <div className="flex items-center space-x-2 text-cyan-800 dark:text-cyan-300 font-semibold">
                      <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Patient Check-In & Intake</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                      No password needed. You can register as a new patient, check in for your appointment, or talk with the voice intake assistant.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="flex items-center space-x-2 bg-white dark:bg-black/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>New Patient Registration</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white dark:bg-black/40 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span>Returning Patient Check-in</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleEnterPatientConsole}
                    variant="primary"
                    className="w-full bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 font-bold shadow-xl shadow-cyan-400/25 min-h-[50px] flex items-center justify-center space-x-2 text-sm rounded-xl cursor-pointer"
                    data-testid="btn-login-submit"
                  >
                    <span>Enter into Patient Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
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
                  <label htmlFor="login-userid" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {selectedRole === 'doctor'
                      ? t('auth.staff_id_label', 'Staff Physician ID')
                      : selectedRole === 'staff'
                      ? 'Staff Member ID'
                      : t('auth.auditor_id_label', 'Auditor ID')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-userid"
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder={
                        selectedRole === 'doctor'
                          ? 'e.g. dr_clara_chen'
                          : selectedRole === 'staff'
                          ? 'e.g. nurse_sarah_lin'
                          : 'e.g. auditor_01'
                      }
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#050811] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono transition-colors"
                      data-testid="input-login-userid"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-passcode" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t('auth.passcode_label', 'Security Passcode / Badge Token')}
                    </label>
                    <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">Demo: demo1234</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-passcode"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#050811] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono transition-colors"
                      data-testid="input-login-passcode"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberWorkstation}
                      onChange={(e) => setRememberWorkstation(e.target.checked)}
                      className="rounded bg-slate-100 dark:bg-[#050811] border-slate-300 dark:border-white/20 text-cyan-500 focus:ring-cyan-400 accent-cyan-500"
                    />
                    <span>{t('auth.remember_workstation', 'Remember workstation')}</span>
                  </label>
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">TLS 1.3 Encrypted</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold shadow-lg shadow-cyan-600/20 dark:shadow-cyan-400/25 min-h-[48px] flex items-center justify-center space-x-2 text-sm rounded-xl cursor-pointer transition-colors"
                  isLoading={isLoading}
                  data-testid="btn-login-submit"
                >
                  <span>
                    {selectedRole === 'doctor'
                      ? t('auth.signin_btn', 'Sign In to Doctor Console')
                      : selectedRole === 'staff'
                      ? 'Sign In to Staff Desk'
                      : t('auth.access_ledger', 'Access Ledger & QA')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
              )}

              {/* Demo Quick-Fill Presets */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{t('auth.sample_logins_title', 'Quick Demo Profiles (1-Click Fill)')}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
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
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.025] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.07] hover:border-cyan-400/50 text-xs transition-colors flex items-center justify-between group cursor-pointer"
                    data-testid="preset-dr-clara"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 flex items-center justify-center font-bold text-[10px]">
                        CC
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                          Dr. Clara Chen, MD
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Cardiology & Chest Pain Center</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Fill &rarr;</span>
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
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.025] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.07] hover:border-cyan-400/50 text-xs transition-colors flex items-center justify-between group cursor-pointer"
                    data-testid="preset-dr-marcus"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30 flex items-center justify-center font-bold text-[10px]">
                        MV
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          Dr. Marcus Vance, MD
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">General Internal Medicine</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Fill &rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('kiosk');
                      handleEnterPatientConsole();
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.025] dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.07] hover:border-cyan-400/50 text-xs transition-colors flex items-center justify-between group cursor-pointer"
                    data-testid="preset-kiosk-station"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30 flex items-center justify-center font-bold text-[10px]">
                        TK
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                          Patient Kiosk
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Direct Patient Console • No Login Required</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Enter &rarr;</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance & Security Banner */}
          <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#080c17]/80 border border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-cyan-400 shrink-0" />
            <span>
              Synthetic patient data verified. Zero PHI leakage in access logs. Hospital demo policy compliant.
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.06] bg-white/70 dark:bg-[#070a14]/60 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
        ClinSync Hospital Intake & Clinician Handoff • Version 0.1.0 • All data synthetic
      </footer>
    </div>
  );
};
