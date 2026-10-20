import React from 'react';
import { Stethoscope, Bell, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface DoctorConsoleLayoutProps {
  doctorName?: string;
  department?: string;
  activePatientCount?: number;
  onLogout?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const DoctorConsoleLayout: React.FC<DoctorConsoleLayoutProps> = ({
  doctorName = 'Dr. Clara Chen, MD',
  department = 'Cardiology & Outpatient Triage',
  activePatientCount = 2,
  onLogout,
  onBackToLanding,
  children,
}) => {
  return (
    <div
      data-testid="doctor-console-layout"
      className="min-h-screen bg-transparent flex flex-col text-slate-100 font-sans relative"
    >
      <span className="sr-only">Phase 1–6 Prototype</span>
      {/* Clinician Top App Bar with Frosted Glassmorphism */}
      <header className="bg-[#080c17]/90 backdrop-blur-2xl border-b border-white/[0.08] px-6 py-4 shadow-2xl flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-4">
          {onBackToLanding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToLanding}
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="text-slate-400 hover:text-white hover:bg-white/[0.06] text-xs border border-white/10"
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
              <span className="font-bold tracking-tight text-base text-white">ClinSync</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                Doctor Console
              </span>
              <span className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                Evidence-First
              </span>
            </div>
            <p className="text-xs text-slate-400">{department}</p>
          </div>
        </div>

        {/* Doctor Identity & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#050811]/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Active Queue:</span>
            <span className="text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md">
              {activePatientCount} Pending
            </span>
          </div>

          <div className="flex items-center space-x-2.5 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 border border-white/20 flex items-center justify-center text-white shadow-md font-bold text-xs">
              CC
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">{doctorName}</div>
              <div className="text-[10px] text-cyan-400 font-mono">Attending Physician</div>
            </div>
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-white hover:bg-white/[0.06] p-2 min-h-[40px] min-w-[40px] rounded-lg border border-transparent hover:border-white/10 ml-1"
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
