import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { SuccessState } from '../components/shared/SuccessState';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';
import { PatientKioskFlow } from '../features/patient-kiosk/PatientKioskFlow';
import { LedgerDiffHub } from '../features/patient-context/LedgerDiffHub';
import { AppointmentSchedulingHub } from '../features/appointments/AppointmentSchedulingHub';
import { DoctorDashboardHub } from '../features/doctor-dashboard/DoctorDashboardHub';
import { VisualQADashboard } from '../features/visual-qa';
import { mockApi } from '../lib/api/mockAdapter';
import { mockDoctorQueue } from '../lib/api/mockData';
import {
  Sparkles,
  Stethoscope,
  Tablet,
  Database,
  FileSpreadsheet,
  Calendar,
  Eye,
  ArrowLeft,
} from 'lucide-react';

export interface MainViewProps {
  initialTab?: 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa';
  onBackToLanding?: () => void;
}

export const MainView: React.FC<MainViewProps> = ({ initialTab = 'kiosk', onBackToLanding }) => {
  const [activeTab, setActiveTab] = useState<
    'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa'
  >(initialTab);
  const [sliderVal, setSliderVal] = useState<number>(4);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>('Eleanor Johnson');
  const [errorExample, setErrorExample] = useState<boolean>(false);
  const [mockApiResult, setMockApiResult] = useState<string>('Click an endpoint below to test the typed mock adapter.');
  const [mockLoading, setMockLoading] = useState<boolean>(false);

  const handleTestEndpoint = async (name: string, fn: () => Promise<unknown>) => {
    setMockLoading(true);
    try {
      const res = await fn();
      setMockApiResult(`[${name}] OK:\n` + JSON.stringify(res, null, 2));
    } catch (err: unknown) {
      setMockApiResult(`[${name}] ERROR:\n` + (err instanceof Error ? err.message : String(err)));
    } finally {
      setMockLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Engineering Switcher Bar */}
      <div className="bg-slate-900 text-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between border-b border-slate-800 text-sm">
        <div className="flex items-center space-x-2">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              data-testid="btn-back-to-landing"
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-medium flex items-center space-x-1.5 transition-colors mr-2 shadow-sm"
              title="Return to the ClinSync landing page"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Landing Page</span>
            </button>
          )}
          <span className="font-bold text-white tracking-wide">CLINSYNC</span>
          <span className="text-xs bg-brand-600/30 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded font-mono">
            Phase 1–6 Prototype
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">• Active Workstream</span>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'kiosk'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Patient Kiosk</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            data-testid="tab-ledger-diff"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ledger'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ledger & Diff</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            data-testid="tab-appointments"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'appointments'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Appointments (G4)</span>
          </button>

          <button
            onClick={() => setActiveTab('doctor')}
            data-testid="tab-doctor-console"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'doctor'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Console</span>
          </button>

          <button
            onClick={() => setActiveTab('showroom')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'showroom'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Design Tokens & UI</span>
          </button>

          <button
            onClick={() => setActiveTab('mock-api')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'mock-api'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Mock API (15/15)</span>
          </button>

          <button
            onClick={() => setActiveTab('visual-qa')}
            data-testid="tab-visual-qa"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'visual-qa'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual QA (G6)</span>
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1">
        {/* 1. KIOSK TAB */}
        {activeTab === 'kiosk' && <PatientKioskFlow />}

        {/* 2. LEDGER & DIFF TAB */}
        {activeTab === 'ledger' && (
          <div className="p-6 md:p-8">
            <LedgerDiffHub />
          </div>
        )}

        {/* 3. APPOINTMENTS TAB (G4) */}
        {activeTab === 'appointments' && (
          <div className="p-6 md:p-8">
            <AppointmentSchedulingHub />
          </div>
        )}

        {/* 2. DOCTOR CONSOLE TAB */}
        {activeTab === 'doctor' && (
          <DoctorConsoleLayout activePatientCount={mockDoctorQueue.length}>
            <DoctorDashboardHub />
          </DoctorConsoleLayout>
        )}

        {/* 3. SHOWROOM TAB */}
        {activeTab === 'showroom' && (
          <div className="max-w-6xl mx-auto p-8 space-y-10">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-ink-primary">
                ClinSync Design System & Component Showroom
              </h2>
              <p className="text-base text-ink-muted mt-1">
                Conforming to <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">docs/UI_UX_DIRECTION.md</code>: calm clinical tones, accessible 48px touch targets, visible focus, and zero unapproved 3D.
              </p>
            </div>

            {/* A. BUTTONS */}
            <Card>
              <CardHeader>
                <CardTitle>1. Button Primitives (Touch Targets &ge; 48px)</CardTitle>
                <CardDescription>
                  Variants with visible keyboard focus rings, loading states, and icon integration.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 items-center">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="danger">Emergency Escalation</Button>
                <Button variant="primary" isLoading>
                  Loading State
                </Button>
                <Button variant="primary" disabled>
                  Disabled State
                </Button>
              </CardContent>
            </Card>

            {/* B. CLINICAL STATUS BADGES */}
            <Card>
              <CardHeader>
                <CardTitle>2. Clinical Fact Taxonomy Badges</CardTitle>
                <CardDescription>
                  Clear status distinctions from the Clinical Context Ledger. Never flatten into generic labels.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-center">
                <Badge status="reported">reported</Badge>
                <Badge status="extracted_unverified">extracted_unverified</Badge>
                <Badge status="historical_recorded">historical_recorded</Badge>
                <Badge status="doctor_confirmed">doctor_confirmed</Badge>
                <Badge status="uncertain">uncertain</Badge>
                <Badge status="conflicting">conflicting</Badge>
                <Badge status="rejected">rejected</Badge>
              </CardContent>
            </Card>

            {/* C. INPUTS & SLIDERS */}
            <Card>
              <CardHeader>
                <CardTitle>3. Inputs & Touch Sliders</CardTitle>
                <CardDescription>
                  Accessible touch inputs with labels, helper texts, and error validations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <Input
                  label="Patient Full Name"
                  placeholder="Enter full legal name"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  helperText="Primary demographic lookup identifier"
                />

                <Input
                  label="Contact Phone Number"
                  placeholder="(555) 000-0000"
                  error="Valid telephone number is required"
                  defaultValue="123"
                />

                <Slider
                  label="Reported Chest Tightness Severity (0 - 10 Scale)"
                  value={sliderVal}
                  min={0}
                  max={10}
                  unit="/ 10"
                  onChange={setSliderVal}
                />
              </CardContent>
            </Card>

            {/* D. FEEDBACK STATES */}
            <Card>
              <CardHeader>
                <CardTitle>4. Feedback & Empty States</CardTitle>
                <CardDescription>
                  Intentional UI states for loading, empty queues, errors with retry, and booking success.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-xl bg-white space-y-4">
                  <span className="text-xs font-bold text-ink-muted uppercase">Spinner Loading</span>
                  <LoadingState message="Extracting prescription facts from PDF..." />
                </div>

                <div className="p-4 border rounded-xl bg-white space-y-4">
                  <span className="text-xs font-bold text-ink-muted uppercase">Skeleton Loading</span>
                  <LoadingState variant="skeleton" />
                </div>

                <div className="p-4 border rounded-xl bg-white space-y-4">
                  <span className="text-xs font-bold text-ink-muted uppercase">Empty State</span>
                  <EmptyState
                    title="No pending lab documents"
                    description="Patient has not uploaded any outside diagnostic reports or past prescriptions yet."
                    actionLabel="Scan Document"
                    onAction={() => alert('Trigger file input')}
                  />
                </div>

                <div className="p-4 border rounded-xl bg-white space-y-4">
                  <span className="text-xs font-bold text-ink-muted uppercase">Error with Retry</span>
                  {errorExample ? (
                    <SuccessState
                      title="Connection Restored"
                      message="Retry was successful. Data re-synced."
                      actionLabel="Reset to Error"
                      onAction={() => setErrorExample(false)}
                    />
                  ) : (
                    <ErrorState
                      title="FastAPI Backend Unreachable"
                      message="The local API service did not respond within the 5000ms threshold."
                      code="CONN_REFUSED"
                      onRetry={() => setErrorExample(true)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* E. DIALOG */}
            <Card>
              <CardHeader>
                <CardTitle>5. Accessible Dialog / Modal</CardTitle>
                <CardDescription>
                  Modal overlay with keyboard ESC key listener and ARIA role="dialog".
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  Open Consent & Privacy Dialog
                </Button>

                <Dialog
                  isOpen={isDialogOpen}
                  onClose={() => setIsDialogOpen(false)}
                  title="Hospital Intake Consent & Privacy"
                  description="St. Jude Academic Medical Center — HIPAA Patient Disclosure"
                >
                  <div className="space-y-4 text-sm text-ink-secondary">
                    <p>
                      ClinSync uses voice transcription to assist your medical provider in preparing for your consultation. Your medical records remain strictly confidential and will never be shared without authorization.
                    </p>
                    <p>
                      You may opt out of voice recognition or biometric matching at any time and complete check-in manually with a hospital reception staff member.
                    </p>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-borderSubtle">
                      <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
                        Decline & Use Paper
                      </Button>
                      <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
                        I Consent & Agree
                      </Button>
                    </div>
                  </div>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. MOCK API INSPECTOR TAB */}
        {activeTab === 'mock-api' && (
          <div className="max-w-6xl mx-auto p-8 space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-ink-primary">
                OpenAPI 3.1.0 Mock Adapter Inspector (15 Endpoints)
              </h2>
              <p className="text-base text-ink-muted mt-1">
                Every endpoint below executes directly against <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">apps/web/src/lib/api/mockAdapter.ts</code> conforming 100% to <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">packages/contracts/openapi.json</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Endpoint Triggers */}
              <div className="md:col-span-1 space-y-2">
                <span className="text-xs font-bold text-ink-muted uppercase tracking-wider block mb-2">
                  15 Canonical Endpoints:
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /encounters', () =>
                      mockApi.createEncounter({ patient_id: 'pat_synth_001' })
                    )
                  }
                >
                  1. POST /encounters
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /identity/candidates', () =>
                      mockApi.lookupCandidates({ query: 'Johnson' })
                    )
                  }
                >
                  2. POST /identity/candidates
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /identity/confirm', () =>
                      mockApi.confirmIdentity({
                        candidate_id: 'cand_demo_001',
                        secondary_auth_type: 'dob_full',
                        auth_payload: '1982',
                      })
                    )
                  }
                >
                  3. POST /identity/confirm
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /patients/{id}/context', () =>
                      mockApi.getPatientContext('pat_synth_001')
                    )
                  }
                >
                  4. GET /patients/{'{id}'}/context
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /encounters/{id}/answers', () =>
                      mockApi.submitAnswer('enc_demo_001', {
                        question_id: 'q1',
                        transcription: 'Chest tightness for 3 days',
                        input_modality: 'voice',
                      })
                    )
                  }
                >
                  5. POST /encounters/{'{id}'}/answers
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /encounters/{id}/documents', () =>
                      mockApi.uploadDocument('enc_demo_001', {
                        filename: 'Cardiology_Referral.pdf',
                        mime_type: 'application/pdf',
                        file_size_bytes: 142000,
                      })
                    )
                  }
                >
                  6. POST /encounters/{'{id}'}/documents
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /documents/{id}/status', () =>
                      mockApi.getDocumentStatus('doc_991')
                    )
                  }
                >
                  7. GET /documents/{'{id}'}/status
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /encounters/{id}/ledger', () =>
                      mockApi.getLedger('enc_demo_001')
                    )
                  }
                >
                  8. GET /encounters/{'{id}'}/ledger
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /encounters/{id}/diff', () =>
                      mockApi.getDiff('enc_demo_001')
                    )
                  }
                >
                  9. GET /encounters/{'{id}'}/diff
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /encounters/{id}/routing-review', () =>
                      mockApi.reviewRouting('enc_demo_001')
                    )
                  }
                >
                  10. POST /encounters/{'{id}'}/routing-review
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /appointments/slots', () =>
                      mockApi.getSlots('dept_cardiology')
                    )
                  }
                >
                  11. GET /appointments/slots
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /appointments', () =>
                      mockApi.bookAppointment({
                        slot_id: 'slot_cardio_101',
                        encounter_id: 'enc_demo_001',
                        idempotency_key: 'idem_991',
                      })
                    )
                  }
                >
                  12. POST /appointments
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /doctors/{id}/queue', () =>
                      mockApi.getDoctorQueue('dr_chen')
                    )
                  }
                >
                  13. GET /doctors/{'{id}'}/queue
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('GET /encounters/{id}/brief', () =>
                      mockApi.getDoctorBrief('enc_demo_001')
                    )
                  }
                >
                  14. GET /encounters/{'{id}'}/brief
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start text-xs font-mono"
                  onClick={() =>
                    handleTestEndpoint('POST /encounters/{id}/approvals', () =>
                      mockApi.submitDoctorApproval('enc_demo_001', {
                        doctor_id: 'dr_chen',
                        decision: 'APPROVED',
                        doctor_notes: 'Reviewed and confirmed.',
                      })
                    )
                  }
                >
                  15. POST /encounters/{'{id}'}/approvals
                </Button>
              </div>

              {/* JSON Payload Inspection Output */}
              <div className="md:col-span-2">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-mono">Response Payload Preview</CardTitle>
                      {mockLoading && <span className="text-xs text-brand-600 animate-pulse">Calling mock...</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <pre className="p-4 bg-slate-900 text-teal-300 rounded-lg text-xs font-mono overflow-auto max-h-[500px] leading-relaxed">
                      {mockApiResult}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* 4. VISUAL QA (G6) TAB */}
        {activeTab === 'visual-qa' && <VisualQADashboard />}
      </div>
    </div>
  );
};
