import React, { useState } from 'react';
import { Shield, HelpCircle, Globe, RotateCcw, ArrowLeft, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PatientAITransparencyLedger } from '../features/patient-intake/PatientAITransparencyLedger';

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
  const [showTransparencyModal, setShowTransparencyModal] = useState<boolean>(false);

  return (
    <div
      data-testid="patient-kiosk-layout"
      className="min-h-screen bg-transparent flex flex-col justify-between text-slate-900 dark:text-slate-100 select-none relative"
    >
      <span className="sr-only">Phase 1–6 Prototype</span>
      {/* Top Tablet Header Bar */}
      <header className="bg-white/95 dark:bg-[#080c17]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/[0.08] px-6 py-4 shadow-sm dark:shadow-2xl flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center space-x-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 px-1.5 py-0.5 rounded font-semibold">
                Live
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Status / Transparency Button / Steps */}
        <div className="flex items-center space-x-3">
          {/* AI Live Fact Grounding Button */}
          <button
            type="button"
            onClick={() => setShowTransparencyModal(true)}
            data-testid="btn-patient-ai-transparency"
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 transition-colors shadow-sm cursor-pointer"
            title="Inspect all AI extracted facts, document sources, and anti-hallucination citations"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">AI Fact Inspector</span>
            <span className="sm:hidden">Facts</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          </button>

          {currentStep && totalSteps && (
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 dark:bg-white/[0.04] px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 shadow-inner">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10">
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>English (US)</span>
          </div>

          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              data-testid="btn-back-to-landing"
              className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.1] px-3 py-1.5 rounded-full transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Return to the ClinSync landing page"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
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
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-slate-200 dark:hover:border-white/10"
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
      <footer className="bg-white/95 dark:bg-[#080c17]/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/[0.08] px-6 py-4 flex items-center justify-between relative z-10 text-xs text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-xl">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Hospital Secure Intake Session • Data encrypted and HIPAA protected</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onHelp}
          leftIcon={<HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
          className="min-h-[48px] bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10"
        >
          Staff Assistance
        </Button>
      </footer>

      {/* Slide-over / Modal for AI Transparency Ledger */}
      {showTransparencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-[#090e1d] border border-slate-200 dark:border-white/15 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Patient AI Fact Grounding & Ledger
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time provenance citations and anti-hallucination verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransparencyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center text-slate-600 dark:text-slate-300"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PatientAITransparencyLedger />

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setShowTransparencyModal(false)}
                className="px-6"
              >
                Done Reviewing Facts
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
