import React from 'react';
import { Stethoscope, User, Bell, LogOut } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface DoctorConsoleLayoutProps {
  doctorName?: string;
  department?: string;
  activePatientCount?: number;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const DoctorConsoleLayout: React.FC<DoctorConsoleLayoutProps> = ({
  doctorName = 'Dr. Clara Chen, MD',
  department = 'Cardiology & Outpatient Triage',
  activePatientCount = 2,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-ink-primary font-sans">
      {/* Clinician Top App Bar */}
      <header className="bg-slate-900 text-white px-6 py-3.5 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-9 h-9 rounded-md bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-base text-white">ClinSync</span>
              <span className="text-xs bg-teal-900/60 text-teal-300 border border-teal-700/60 px-2 py-0.5 rounded font-mono">
                Doctor Console
              </span>
            </div>
            <p className="text-xs text-slate-400">{department}</p>
          </div>
        </div>

        {/* Doctor Identity & Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">Queue:</span>
            <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded">
              {activePatientCount} Pending
            </span>
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-200 hidden md:inline">
              {doctorName}
            </span>
          </div>

          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 min-h-[40px] min-w-[40px]"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Clinician Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {children}
      </main>
    </div>
  );
};
