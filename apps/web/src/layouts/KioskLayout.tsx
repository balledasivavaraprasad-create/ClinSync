import React from 'react';
import { Shield, HelpCircle, Globe, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export interface KioskLayoutProps {
  title?: string;
  subtitle?: string;
  currentStep?: number;
  totalSteps?: number;
  onResetSession?: () => void;
  onHelp?: () => void;
  children: React.ReactNode;
}

export const KioskLayout: React.FC<KioskLayoutProps> = ({
  title = 'ClinSync Patient Kiosk',
  subtitle = 'St. Jude Academic Medical Center',
  currentStep,
  totalSteps,
  onResetSession,
  onHelp,
  children,
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between text-ink-primary select-none">
      {/* Top Tablet Header Bar */}
      <header className="bg-surface border-b border-borderSubtle px-6 py-4 shadow-subtle flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-primary leading-tight">
              {title}
            </h1>
            <p className="text-xs font-medium text-ink-muted">{subtitle}</p>
          </div>
        </div>

        {/* Status / Language / Steps */}
        <div className="flex items-center space-x-4">
          {currentStep && totalSteps && (
            <div className="hidden sm:flex items-center space-x-2 bg-surfaceMuted px-3 py-1.5 rounded-full border border-borderSubtle">
              <span className="text-xs font-medium text-ink-muted">Progress</span>
              <span className="text-sm font-semibold text-brand-700">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-xs font-medium text-ink-secondary bg-surfaceMuted px-3 py-1.5 rounded-lg border border-borderSubtle">
            <Globe className="w-4 h-4 text-brand-600" />
            <span>English (US)</span>
          </div>

          {onResetSession && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetSession}
              aria-label="Start over"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="text-ink-muted hover:text-ink-primary"
            >
              Start Over
            </Button>
          )}
        </div>
      </header>

      {/* Main Kiosk Touch Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 flex flex-col justify-center">
        {children}
      </main>

      {/* Persistent Bottom Help & Privacy Footer */}
      <footer className="bg-surface border-t border-borderSubtle px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-ink-muted">
          <Shield className="w-4 h-4 text-brand-600" />
          <span>Hospital Secure Intake Session • Data encrypted and HIPAA protected</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onHelp}
          leftIcon={<HelpCircle className="w-4 h-4 text-brand-600" />}
          className="min-h-[48px]"
        >
          Staff Assistance
        </Button>
      </footer>
    </div>
  );
};
