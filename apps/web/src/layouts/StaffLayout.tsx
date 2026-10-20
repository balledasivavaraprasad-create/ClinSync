import React from 'react';
import { Building2, Users, LogOut, ArrowLeft, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface StaffLayoutProps {
  terminalName?: string;
  shiftName?: string;
  activeQueueCount?: number;
  activeSubTab?: 'operations' | 'ledger';
  onSubTabChange?: (tab: 'operations' | 'ledger') => void;
  onLogout?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const StaffLayout: React.FC<StaffLayoutProps> = ({
  terminalName = 'Front Desk Terminal 01',
  shiftName = 'Morning Shift',
  activeQueueCount = 7,
  activeSubTab = 'operations',
  onSubTabChange,
  onLogout,
  onBackToLanding,
  children,
}) => {
  return (
    <div
      data-testid="staff-operations-layout"
      className="min-h-screen bg-transparent flex flex-col text-slate-900 dark:text-slate-100 font-sans relative"
    >
      {/* Hospital Staff Top App Bar with Frosted Glassmorphism */}
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

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base text-slate-900 dark:text-white">ClinSync</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 px-2 py-0.5 rounded font-mono uppercase tracking-wide font-semibold">
                Staff Operations
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
                Clinic Flow
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {terminalName} • {shiftName}
            </p>
          </div>
        </div>

        {/* View Switcher: Operations vs QA & Clinical Ledger */}
        {onSubTabChange && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs order-last sm:order-none">
            <button
              type="button"
              onClick={() => onSubTabChange('operations')}
              data-testid="staff-tab-operations"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'operations'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Triage & Fleet</span>
            </button>
            <button
              type="button"
              onClick={() => onSubTabChange('ledger')}
              data-testid="staff-tab-ledger"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'ledger'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>QA & Clinical Ledger</span>
            </button>
          </div>
        )}

        {/* Staff Identity & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#050811]/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs dark:shadow-inner">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Triage:</span>
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-md">
              {activeQueueCount} Waiting
            </span>
          </div>

          <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 border border-emerald-300/40 dark:border-white/20 flex items-center justify-center text-white shadow-md font-bold text-xs">
              FD
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">Sarah Lin, RN</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium">Lead Triage & Front Desk</div>
            </div>
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] p-2 min-h-[40px] min-w-[40px] rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-white/10 ml-1"
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
