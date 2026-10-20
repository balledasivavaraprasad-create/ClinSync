import React from 'react';
import { Shield, HelpCircle, Globe, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface KioskLayoutProps {
  title?: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  onResetSession?: () => void;
  onHelp?: () => void;
  onBackToLanding?: () => void;
  children: React.ReactNode;
}

export const KioskLayout: React.FC<KioskLayoutProps> = ({
  title = 'ClinSync Patient Kiosk',
  subtitle = 'St. Jude Academic Medical Center',
  currentStep,
  totalSteps,
  onResetSession,
  onHelp,
  onBackToLanding,
  children,
}) => {
  return (
    <div
      data-testid="patient-kiosk-layout"
      className="min-h-screen bg-transparent flex flex-col justify-between text-slate-100 select-none relative"
    >
      <span className="sr-only">Phase 1–6 Prototype</span>
      {/* Top Tablet Header Bar */}
      <header className="bg-[#080c17]/90 backdrop-blur-2xl border-b border-white/[0.08] px-6 py-4 shadow-2xl flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight flex items-center space-x-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.5 rounded">
                Live
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Status / Language / Steps */}
        <div className="flex items-center space-x-3">
          {currentStep && totalSteps && (
            <div className="hidden sm:flex items-center space-x-2 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
              <span className="text-xs font-medium text-slate-400">Progress</span>
              <span className="text-xs font-bold text-cyan-300 font-mono">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/10">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>English (US)</span>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              data-testid="btn-back-to-landing"
              className="text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] px-3 py-1.5 rounded-full transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Return to the ClinSync landing page"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Portal</span>
            </button>
          )}

          {onResetSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetSession}
              aria-label="Start over"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10"
            >
              Start Over
            </Button>
          )}
        </div>
      </header>

      {/* Main Kiosk Touch Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center relative z-10">
        {children}
      </main>

      {/* Persistent Bottom Help & Privacy Footer */}
      <footer className="bg-[#080c17]/90 backdrop-blur-2xl border-t border-white/[0.08] px-6 py-4 flex items-center justify-between relative z-10 text-xs text-slate-400 shadow-xl">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Hospital Secure Intake Session • Data encrypted and HIPAA protected</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onHelp}
          leftIcon={<HelpCircle className="w-4 h-4 text-cyan-400" />}
          className="min-h-[48px] bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10"
        >
          Staff Assistance
        </Button>
      </footer>
    </div>
  );
};
