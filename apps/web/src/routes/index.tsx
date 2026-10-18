import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { LuxuryMasterDashboard } from '../features/luxury-dashboard';
import {
  Sparkles,
  Database,
  Activity,
} from 'lucide-react';

export interface MainViewProps {
  initialTab?: 'dashboard' | 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa';
  onBackToLanding?: () => void;
  onOpenLogin?: () => void;
  currentUser?: {
    role: string;
    userId: string;
    userName: string;
    department?: string;
  } | null;
}

export const MainView: React.FC<MainViewProps> = ({
  initialTab = 'dashboard',
  onBackToLanding,
  onOpenLogin,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa'
  >(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
    <LuxuryMasterDashboard
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onBackToLanding={onBackToLanding}
      onOpenLogin={onOpenLogin}
      currentUser={currentUser}
      onLaunchKiosk={() => setActiveTab('kiosk')}
      onOpenDoctorConsole={() => setActiveTab('doctor')}
      onOpenLedger={() => setActiveTab('ledger')}
      onOpenAppointments={() => setActiveTab('appointments')}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full"
        >
          {/* 1. KIOSK TAB */}
          {activeTab === 'kiosk' && <PatientKioskFlow />}

          {/* 2. LEDGER & DIFF TAB */}
          {activeTab === 'ledger' && (
            <div className="p-2 sm:p-4 max-w-7xl mx-auto">
              <LedgerDiffHub />
            </div>
          )}

          {/* 3. APPOINTMENTS TAB (G4) */}
          {activeTab === 'appointments' && (
            <div className="p-2 sm:p-4 max-w-7xl mx-auto">
              <AppointmentSchedulingHub />
            </div>
          )}

          {/* 4. DOCTOR CONSOLE TAB */}
          {activeTab === 'doctor' && (
            <DoctorConsoleLayout activePatientCount={mockDoctorQueue.length}>
              <DoctorDashboardHub />
            </DoctorConsoleLayout>
          )}

            {/* 5. SHOWROOM TAB */}
            {activeTab === 'showroom' && (
              <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
                    <Sparkles className="w-8 h-8 text-teal-400" />
                    <span>ClinSync Design System & Component Showroom</span>
                  </h2>
                  <p className="text-sm text-slate-400">
                    Conforming to <code className="text-xs bg-slate-800 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">docs/UI_UX_DIRECTION.md</code>: calm clinical tones, accessible 48px touch targets, visible focus, and Apple-grade frosted depth.
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
                    <div className="p-4 border border-white/10 rounded-xl bg-slate-900/60 space-y-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spinner Loading</span>
                      <LoadingState message="Extracting prescription facts from PDF..." />
                    </div>

                    <div className="p-4 border border-white/10 rounded-xl bg-slate-900/60 space-y-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skeleton Loading</span>
                      <LoadingState variant="skeleton" />
                    </div>

                    <div className="p-4 border border-white/10 rounded-xl bg-slate-900/60 space-y-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empty State</span>
                      <EmptyState
                        title="No pending lab documents"
                        description="Patient has not uploaded any outside diagnostic reports or past prescriptions yet."
                        actionLabel="Scan Document"
                        onAction={() => alert('Trigger file input')}
                      />
                    </div>

                    <div className="p-4 border border-white/10 rounded-xl bg-slate-900/60 space-y-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Error with Retry</span>
                      {errorExample ? (
                        <SuccessState
                          title="Connection Restored"
                          message="Retry was successful. Data re-synced."
                          actionLabel="Reset to Error"
                          onAction={() => setErrorExample(false)}
                        />
                      ) : (
                        <ErrorState
                          title="Failed to Load Encounter"
                          message="Could not connect to the encounter persistence service. Please retry."
                          code="HTTP_503_SERVICE_UNAVAILABLE"
                          onRetry={() => setErrorExample(true)}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* E. ACCESSIBLE DIALOG */}
                <Card>
                  <CardHeader>
                    <CardTitle>5. Accessible Dialog (Focus-trapped & ESC listener)</CardTitle>
                    <CardDescription>
                      Full screen reader accessibility, dark frosted glass, and keyboard dismiss listener.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setIsDialogOpen(true)} variant="secondary">
                      Open Demo Dialog
                    </Button>
                    <Dialog
                      isOpen={isDialogOpen}
                      onClose={() => setIsDialogOpen(false)}
                      title="Secondary Factor Patient Identity Check"
                      description="To protect patient health information, verify the year of birth before revealing clinical records."
                    >
                      <div className="space-y-4">
                        <Input
                          label="Patient Birth Year"
                          placeholder="e.g. 1982"
                          type="number"
                          helperText="Matches masked record E. J***son"
                        />
                        <div className="flex justify-end space-x-3 pt-3">
                          <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
                            Confirm Identity
                          </Button>
                        </div>
                      </div>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 6. MOCK API TAB */}
            {activeTab === 'mock-api' && (
              <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-8">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
                    <Database className="w-8 h-8 text-teal-400" />
                    <span>Contract-Conforming Mock API Client</span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Every endpoint below executes directly against <code className="text-xs bg-slate-800 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">apps/web/src/lib/api/mockAdapter.ts</code> conforming 100% to <code className="text-xs bg-slate-800 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded font-mono">packages/contracts/openapi.json</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Endpoint Buttons */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-slate-200">Interactive Endpoints (15 Total)</CardTitle>
                      <CardDescription>Click to execute mock response cycle:</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Health & Identity</span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /patients/{id}/context', () => mockApi.getPatientContext('pat_synth_001'))}
                          >
                            GET Patient Context
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('POST /identity/candidates', () => mockApi.lookupCandidates({ query: 'Eleanor Johnson' }))}
                          >
                            Lookup Candidates
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleTestEndpoint('POST /identity/confirm', () =>
                                mockApi.confirmIdentity({ candidate_id: 'cand_demo_001', secondary_auth_type: 'dob_full', auth_payload: '1982-04-12' })
                              )
                            }
                          >
                            Confirm Identity
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Encounters & Intake</span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleTestEndpoint('POST /encounters', () =>
                                mockApi.createEncounter({ patient_id: 'pat_synth_001', intake_language: 'en-US' })
                              )
                            }
                          >
                            Create Encounter
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleTestEndpoint('POST /encounters/{id}/answers', () =>
                                mockApi.submitAnswer('enc_demo_001', {
                                  question_id: 'q1_chief_complaint',
                                  transcription: 'Pain started 3 days ago, gets worse when walking.',
                                  input_modality: 'voice',
                                })
                              )
                            }
                          >
                            Submit Answer
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Documents & Ledger Diff</span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /encounters/{id}/facts', () => mockApi.getLedger('enc_demo_001'))}
                          >
                            Get Encounter Ledger
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /patients/{id}/diff', () => mockApi.getDiff('enc_demo_001'))}
                          >
                            Get Patient Diff
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /documents/{id}/status', () => mockApi.getDocumentStatus('doc_synth_rx_01'))}
                          >
                            Document Status
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-white/10">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduling & Doctor Queue</span>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('POST /routing/evaluate', () => mockApi.reviewRouting('enc_demo_001'))}
                          >
                            Evaluate Routing
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /appointments/slots', () => mockApi.getSlots('dept_cardiology'))}
                          >
                            Get Slots
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleTestEndpoint('POST /appointments/book', () =>
                                mockApi.bookAppointment({
                                  slot_id: 'slot_cardio_101',
                                  encounter_id: 'enc_demo_001',
                                  idempotency_key: 'idem_showroom_test_01',
                                })
                              )
                            }
                          >
                            Book Slot
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /doctor/queue', () => mockApi.getDoctorQueue('dr_clara_chen'))}
                          >
                            Doctor Queue
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTestEndpoint('GET /doctor/brief', () => mockApi.getDoctorBrief('enc_demo_001'))}
                          >
                            Doctor Brief
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleTestEndpoint('POST /doctor/approve', () =>
                                mockApi.submitDoctorApproval('enc_demo_001', {
                                  doctor_id: 'dr_clara_chen',
                                  decision: 'APPROVED',
                                  doctor_notes: 'Clinical intake and triage evidence approved.',
                                })
                              )
                            }
                          >
                            Approve Consult
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Results Console */}
                  <Card className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base text-slate-200">Execution Output</CardTitle>
                        <CardDescription>Live JSON contract response payload</CardDescription>
                      </div>
                      {mockLoading && (
                        <span className="text-xs font-mono text-teal-400 animate-pulse flex items-center space-x-1">
                          <Activity className="w-3.5 h-3.5" />
                          <span>FETCHING...</span>
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1">
                      <pre className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-teal-300 font-mono text-xs overflow-auto max-h-[460px] whitespace-pre-wrap shadow-inner leading-relaxed">
                        {mockApiResult}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

          {/* 7. VISUAL QA TAB (G6) */}
          {activeTab === 'visual-qa' && <VisualQADashboard />}
        </motion.div>
      </AnimatePresence>
    </LuxuryMasterDashboard>
  );
};
