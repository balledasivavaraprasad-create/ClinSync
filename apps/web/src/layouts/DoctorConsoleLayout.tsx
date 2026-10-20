import React from 'react';
import { Stethoscope, Bell, LogOut, ArrowLeft, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../lib/theme';

export interface DoctorConsoleLayoutProps {
  doctorName?: string;
  department?: string;
  activePatientCount?: number;
  activeSubTab?: 'console' | 'ledger';
  onSubTabChange?: (tab: 'console' | 'ledger') => void;
  onLogout?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const DoctorConsoleLayout: React.FC<DoctorConsoleLayoutProps> = ({
  doctorName = 'Dr. Clara Chen, MD',
  department = 'Cardiology & Outpatient Triage',
  activePatientCount = 2,
  activeSubTab = 'console',
  onSubTabChange,
  onLogout,
  onBackToLanding,
  children,
}) => {
  return (
    <div
      data-testid="doctor-console-layout"
      className="min-h-screen bg-transparent flex flex-col text-slate-900 dark:text-slate-100 font-sans relative"
    >
      <span className="sr-only">Phase 1–6 Prototype</span>
      {/* Clinician Top App Bar with Frosted Glassmorphism */}
      <header className="bg-white/95 dark:bg-[#080c17]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.08] px-4 sm:px-6 py-3.5 shadow-sm dark:shadow-2xl flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3.5">
          {onBackToLanding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLanding}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs border border-slate-200 dark:border-white/10"
              aria-label="Back to Portal"
              data-testid="btn-back-to-landing"
            >
              Portal
            </Button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base text-slate-900 dark:text-white">ClinSync</span>
              <span className="text-[10px] bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 px-2 py-0.5 rounded font-mono uppercase tracking-wide font-semibold">
                Doctor Console
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                Evidence-First
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{department}</p>
          </div>
        </div>

        {/* Doctor Sub-Tabs Switcher */}
        {onSubTabChange && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs order-last sm:order-none">
            <button
              type="button"
              onClick={() => onSubTabChange('console')}
              data-testid="doctor-tab-console"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'console'
                  ? 'bg-white dark:bg-cyan-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Clinician Console</span>
            </button>
            <button
              type="button"
              onClick={() => onSubTabChange('ledger')}
              data-testid="doctor-tab-ledger"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'ledger'
                  ? 'bg-white dark:bg-cyan-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>QA & Clinical Ledger</span>
            </button>
          </div>
        )}

        {/* Doctor Identity & Controls */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />

          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#050811]/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs dark:shadow-inner">
            <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Active Queue:</span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded-md">
              {activePatientCount} Pending
            </span>
          </div>

          <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-cyan-300/40 dark:border-white/20 flex items-center justify-center text-white shadow-md font-bold text-xs">
              CC
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{doctorName}</div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-medium">Attending Physician</div>
            </div>
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] p-2 min-h-[40px] min-w-[40px] rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/10 ml-1"
              aria-label="Sign out"
              title="Sign out of Doctor Workstation"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Clinician Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 relative z-10">
        {children}
      </main>
    </div>
  );
};
