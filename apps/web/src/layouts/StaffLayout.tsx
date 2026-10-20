import React from 'react';
import { Building2, Users, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface StaffLayoutProps {
  terminalName?: string;
  shiftName?: string;
  activeQueueCount?: number;
  onLogout?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  terminalName = 'Front Desk Terminal 01',
  shiftName = 'Morning Shift',
  activeQueueCount = 7,
  onLogout,
  onBackToLanding,
  children,
}) => {
  return (
    <div
      data-testid="staff-operations-layout"
      className="min-h-screen bg-transparent flex flex-col text-slate-100 font-sans relative"
    >
      {/* Hospital Staff Top App Bar with Frosted Glassmorphism */}
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

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base text-white">ClinSync</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                Staff Operations
              </span>
              <span className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                Clinic Flow
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {terminalName} • {shiftName}
            </p>
          </div>
        </div>

        {/* Staff Identity & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#050811]/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Triage Flow:</span>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              {activeQueueCount} Waiting
            </span>
          </div>

          <div className="flex items-center space-x-2.5 pl-3 border-l border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 border border-white/20 flex items-center justify-center text-white shadow-md font-bold text-xs">
              FD
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">Sarah Lin, RN</div>
              <div className="text-[10px] text-emerald-400 font-mono">Lead Triage & Front Desk</div>
            </div>
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-white hover:bg-white/[0.06] p-2 min-h-[40px] min-w-[40px] rounded-lg border border-transparent hover:border-white/10 ml-1"
              aria-label="Sign out"
              title="Sign out of Staff Terminal"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Staff Operations Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 relative z-10">
        {children}
      </main>
    </div>
  );
};
