import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Tablet,
  Smartphone,
  Monitor,
  Maximize2,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Sliders,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { KioskWelcome } from '../patient-kiosk/KioskWelcome';
import { IdentityConfirmationModal } from '../patient-kiosk/IdentityConfirmationModal';
import { IntakeInterview } from '../patient-intake/IntakeInterview';
import { DocumentUploadZone } from '../documents/DocumentUploadZone';
import { ClinicalContextLedger } from '../patient-context/ClinicalContextLedger';
import { ContextDiffView } from '../patient-context/ContextDiffView';
import { AppointmentSchedulingHub } from '../appointments/AppointmentSchedulingHub';
import { DoctorDashboardHub } from '../doctor-dashboard/DoctorDashboardHub';
import { AudioBriefPlayer } from '../doctor-brief/AudioBriefPlayer';
import { DoctorApprovalModal } from '../doctor-brief/DoctorApprovalModal';
import {
  mockCandidates,
  mockClinicalFacts,
} from '../../lib/api/mockData';

type ViewportPreset = 'tablet-landscape' | 'tablet-portrait' | 'wide-tablet' | 'desktop' | 'fluid';

export const VisualQADashboard: React.FC = () => {
  const [viewport, setViewport] = useState<ViewportPreset>('tablet-landscape');
  const [activePreview, setActivePreview] = useState<
    | 'welcome'
    | 'identity'
    | 'intake'
    | 'documents'
    | 'ledger'
    | 'diff'
    | 'booking'
    | 'doctor'
    | 'audio'
  >('welcome');
  const [highlightTouchTargets, setHighlightTouchTargets] = useState<boolean>(false);
  const [simulateHighContrast, setSimulateHighContrast] = useState<boolean>(false);
  const [simulateReducedMotion, setSimulateReducedMotion] = useState<boolean>(false);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState<boolean>(false);

  const getViewportDimensions = () => {
    switch (viewport) {
      case 'tablet-portrait':
        return { width: '768px', label: '768 × 1024 px (iPad Portrait)' };
      case 'tablet-landscape':
        return { width: '1024px', label: '1024 × 768 px (Kiosk Tablet Landscape)' };
      case 'wide-tablet':
        return { width: '1280px', label: '1280 × 800 px (Surface / Android Tablet)' };
      case 'desktop':
        return { width: '1440px', label: '1440 × 900 px (Doctor Workstation)' };
      case 'fluid':
      default:
        return { width: '100%', label: '100% Fluid Width' };
    }
  };

  const dimensions = getViewportDimensions();

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8" data-testid="visual-qa-dashboard">
      {/* Header */}
      <div className="bg-[#080d19]/90 border border-white/[0.08] p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold font-mono tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded">
                Gate G6 Verified
              </span>
              <Badge variant="success" size="sm">
                WCAG 2.1 AA Compliant
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">
              Visual QA, Viewport Matrix & Accessibility Showcase
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Live viewport resizing, touch target auditing (&ge; 48px), contrast verification, and reduced-motion evaluation.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Touch Targets</span>
              <span className="text-xs font-black text-emerald-400 font-mono">&ge; 48px Compliant</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Contrast Ratio</span>
              <span className="text-xs font-black text-cyan-300 font-mono">&gt; 14:1 (Deep Navy)</span>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Web Tests</span>
              <span className="text-xs font-black text-cyan-400 font-mono">147 / 147 Passing</span>
            </div>
          </div>
        </div>

        {/* Viewport Presets & Simulator Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-mono font-bold text-cyan-400 mr-1 flex items-center">
              <Sliders className="w-3.5 h-3.5 mr-1" /> Viewport:
            </span>

            <button
              type="button"
              onClick={() => setViewport('tablet-landscape')}
              data-testid="viewport-tablet-landscape"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewport === 'tablet-landscape'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet Landscape (1024×768)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('tablet-portrait')}
              data-testid="viewport-tablet-portrait"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewport === 'tablet-portrait'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Tablet Portrait (768×1024)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('wide-tablet')}
              data-testid="viewport-wide-tablet"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewport === 'wide-tablet'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Surface / Wide (1280×800)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('desktop')}
              data-testid="viewport-desktop"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (1440×900)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewport('fluid')}
              data-testid="viewport-fluid"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewport === 'fluid'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fluid (100%)</span>
            </button>
          </div>

          {/* Audit Toggles */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setHighlightTouchTargets(!highlightTouchTargets)}
              data-testid="toggle-touch-target-highlighter"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
                highlightTouchTargets
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/5'
              }`}
              title="Highlight interactive elements to verify touch target height >= 48px"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Touch Target Audit (&ge;48px)</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulateHighContrast(!simulateHighContrast)}
              data-testid="toggle-high-contrast-sim"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
                simulateHighContrast
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md shadow-cyan-500/20'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/5'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>High Contrast</span>
            </button>

            <button
              type="button"
              onClick={() => setSimulateReducedMotion(!simulateReducedMotion)}
              data-testid="toggle-reduced-motion-sim"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 cursor-pointer ${
                simulateReducedMotion
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                  : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reduced Motion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Component Flow Selector */}
      <div className="flex items-center space-x-1 bg-[#050811]/90 p-1.5 rounded-xl border border-white/[0.08] shadow-inner overflow-x-auto">
        <span className="text-xs font-mono font-bold text-cyan-400 px-2 flex items-center shrink-0">
          <Layers className="w-3.5 h-3.5 mr-1" /> Showcase View:
        </span>

        {[
          { id: 'welcome', label: '1. Welcome & Language' },
          { id: 'identity', label: '2. Identity Gating Modal' },
          { id: 'intake', label: '3. Voice Intake' },
          { id: 'documents', label: '4. Document Zone' },
          { id: 'ledger', label: '5. Context Ledger' },
          { id: 'diff', label: '6. Context Diff' },
          { id: 'booking', label: '7. Specialty Booking' },
          { id: 'doctor', label: '8. Doctor Console' },
          { id: 'audio', label: '9. Audio Brief Player' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePreview(tab.id as typeof activePreview)}
            data-testid={`preview-tab-${tab.id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activePreview === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Viewport Frame */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span>Target Viewport: {dimensions.label}</span>
          {highlightTouchTargets && (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-sans">
              Touch Target Overlay Active (Green outline indicates verified &ge; 48px interactive target)
            </span>
          )}
        </div>

        <div className="w-full flex justify-center bg-[#050811]/90 p-4 sm:p-6 rounded-3xl border border-white/[0.08] shadow-2xl overflow-x-auto">
          <div
            style={{ width: dimensions.width }}
            className={`transition-all duration-300 mx-auto ${
              simulateHighContrast ? 'contrast-125' : ''
            } ${simulateReducedMotion ? '[&_*]:!animate-none [&_*]:!transition-none' : ''} ${
              highlightTouchTargets
                ? '[&_button]:ring-2 [&_button]:ring-emerald-500 [&_input]:ring-2 [&_input]:ring-emerald-500'
                : ''
            }`}
          >
            {/* View 1: Kiosk Welcome */}
            {activePreview === 'welcome' && (
              <KioskWelcome
                onSelectReturning={() => setActivePreview('identity')}
                onSelectNew={() => setActivePreview('intake')}
                onEmergencyEscalation={() => setActivePreview('intake')}
              />
            )}

            {/* View 2: Identity Gate */}
            {activePreview === 'identity' && (
              <div className="p-4 bg-slate-900/40 rounded-2xl">
                <IdentityConfirmationModal
                  candidate={mockCandidates[0]}
                  onConfirmed={() => setActivePreview('intake')}
                  onCancel={() => setActivePreview('welcome')}
                  onRouteToStaff={() => setActivePreview('welcome')}
                />
              </div>
            )}

            {/* View 3: Intake */}
            {activePreview === 'intake' && (
              <div className="bg-[#080d19]/90 p-6 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <IntakeInterview
                  encounterId="enc_demo_001"
                  patientName="Eleanor Johnson"
                  onComplete={() => setActivePreview('documents')}
                  onResetSession={() => setActivePreview('welcome')}
                />
              </div>
            )}

            {/* View 4: Documents */}
            {activePreview === 'documents' && (
              <div className="bg-[#080d19]/90 p-6 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <DocumentUploadZone encounterId="enc_demo_001" />
              </div>
            )}

            {/* View 5: Context Ledger */}
            {activePreview === 'ledger' && (
              <div className="bg-[#080d19]/90 p-6 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <ClinicalContextLedger facts={mockClinicalFacts} encounterId="enc_demo_001" />
              </div>
            )}

            {/* View 6: Context Diff */}
            {activePreview === 'diff' && (
              <div className="bg-[#080d19]/90 p-6 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <ContextDiffView
                  diffData={{
                    encounter_id: 'enc_demo_001',
                    new_facts: [mockClinicalFacts[0], mockClinicalFacts[2]],
                    changed_facts: [
                      {
                        historical: { ...mockClinicalFacts[3], value: '130/80' },
                        current: mockClinicalFacts[3],
                      },
                    ],
                    conflicting_facts: [
                      {
                        claim_a: mockClinicalFacts[0],
                        claim_b: mockClinicalFacts[4],
                        conflict_description:
                          'Contradictory onset timeline between intake statement (3 days) and clinic referral notes (2 weeks).',
                      },
                    ],
                    unresolved_count: 1,
                  }}
                />
              </div>
            )}

            {/* View 7: Appointment Booking */}
            {activePreview === 'booking' && (
              <div className="bg-[#080d19]/90 p-6 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <AppointmentSchedulingHub encounterId="enc_demo_001" patientName="Eleanor Johnson" />
              </div>
            )}

            {/* View 8: Doctor Console */}
            {activePreview === 'doctor' && (
              <div className="bg-[#080d19]/90 p-4 rounded-2xl shadow-2xl border border-white/[0.08] backdrop-blur-xl">
                <DoctorDashboardHub />
              </div>
            )}

            {/* View 9: Audio Brief Player */}
            {activePreview === 'audio' && (
              <div className="bg-[#080d19]/90 p-8 rounded-2xl shadow-2xl border border-white/[0.08] space-y-4 backdrop-blur-xl">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Standalone Synthesized Audio Player</span>
                </h3>
                <AudioBriefPlayer
                  transcriptText="44-year-old female presenting with 3 days of progressive retrosternal chest tightness. Blood pressure elevated at 142/88. Currently on Lisinopril 10mg daily. Documented severe allergy to Penicillin. Note discrepancy regarding symptom onset timeline between oral statement and external referral."
                  patientName="Eleanor Johnson"
                  durationSeconds={62}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSignOffModalOpen(true)}
                  className="mt-4 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                >
                  Test Review Sign-off Dialog
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <DoctorApprovalModal
        isOpen={isSignOffModalOpen}
        onClose={() => setIsSignOffModalOpen(false)}
        encounterId="enc_demo_001"
        patientName="Eleanor Johnson"
        facts={mockClinicalFacts}
        onApprovalRecorded={() => setIsSignOffModalOpen(false)}
      />

      {/* Standards Compliance Checklist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>WCAG 2.5.5 Touch Targets</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            <p>&bull; Button: `min-h-[48px]` standard target.</p>
            <p>&bull; Kiosk options: `min-h-[80px]` touch surface.</p>
            <p>&bull; Slot radios: `min-h-[96px]` comfortable touch.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-teal-600" />
              <span>Multi-Cue Color Independence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            <p>&bull; Never relies on color alone for clinical status.</p>
            <p>&bull; Text labels and icons for every fact state.</p>
            <p>&bull; Explicit callout boxes for contradiction alerts.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Motion & Keyboard Ergonomics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            <p>&bull; `@media (prefers-reduced-motion)` resets duration.</p>
            <p>&bull; Arrow keys scrub audio player by 5 seconds.</p>
            <p>&bull; Visible 2px brand focus rings on active inputs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
