import React, { useState, useEffect, useCallback } from 'react';
import { DoctorQueueList } from './DoctorQueueList';
import { DoctorBriefCard } from '../doctor-brief/DoctorBriefCard';
import { ClinicalContextLedger } from '../patient-context/ClinicalContextLedger';
import { ContextDiffView } from '../patient-context/ContextDiffView';
import type { UploadedDocItem } from '../documents/DocumentUploadZone';
import { DocumentViewerModal } from '../documents/DocumentViewerModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockApi } from '../../lib/api/mockAdapter';
import type {
  DoctorQueueItem,
  DoctorBriefResponse,
  ClinicalFact,
  DiffResponse,
  Citation,
  ApprovalResponse,
} from '../../lib/api/types';
import {
  Stethoscope,
  FileSpreadsheet,
  GitCompare,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  User,
} from 'lucide-react';
import { PatientProfileHub } from '../patient-profile';

interface DoctorDashboardHubProps {
  doctorId?: string;
  initialEncounterId?: string;
}

export const DoctorDashboardHub: React.FC<DoctorDashboardHubProps> = ({
  doctorId = 'dr_clara_chen',
  initialEncounterId = 'enc_demo_001',
}) => {
  // 1. Doctor Queue State
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // 2. Active Patient State
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(initialEncounterId);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('Eleanor Johnson');

  // 3. Clinical Data for Active Encounter
  const [activeTab, setActiveTab] = useState<'brief' | 'ledger' | 'diff' | 'documents' | 'profile'>('brief');
  const [brief, setBrief] = useState<DoctorBriefResponse['data'] | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState<boolean>(true);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [facts, setFacts] = useState<ClinicalFact[]>([]);
  const [isFactsLoading, setIsFactsLoading] = useState<boolean>(false);

  const [diffData, setDiffData] = useState<DiffResponse['data'] | undefined>(undefined);
  const [isDiffLoading, setIsDiffLoading] = useState<boolean>(false);

  // 4. Citation / Document Viewer Modal State
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocItem | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  // 1. Fetch Doctor Queue
  const fetchQueue = useCallback(async () => {
    setIsQueueLoading(true);
    setQueueError(null);
    try {
      const res = await mockApi.getDoctorQueue(doctorId);
      setQueue(res.data.queue);
      // If selected encounter is not set, select first
      if (res.data.queue.length > 0 && !selectedEncounterId) {
        setSelectedEncounterId(res.data.queue[0].encounter_id);
        setSelectedPatientName(res.data.queue[0].patient_name);
      }
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to retrieve doctor queue');
    } finally {
      setIsQueueLoading(false);
    }
  }, [doctorId, selectedEncounterId]);

  // 2. Fetch Brief, Facts, and Diff for Active Encounter
  const fetchEncounterData = useCallback(async (encId: string) => {
    setIsBriefLoading(true);
    setBriefError(null);
    setIsFactsLoading(true);
    setIsDiffLoading(true);

    try {
      const [briefRes, ledgerRes, diffRes] = await Promise.all([
        mockApi.getDoctorBrief(encId),
        mockApi.getLedger(encId),
        mockApi.getDiff(encId),
      ]);

      setBrief(briefRes.data);
      setFacts(ledgerRes.data.facts);
      setDiffData(diffRes.data);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Failed to retrieve clinical brief');
    } finally {
      setIsBriefLoading(false);
      setIsFactsLoading(false);
      setIsDiffLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    if (selectedEncounterId) {
      fetchEncounterData(selectedEncounterId);
    }
  }, [selectedEncounterId, fetchEncounterData]);

  // Handle patient switch from queue
  const handleSelectPatient = (item: DoctorQueueItem) => {
    setSelectedEncounterId(item.encounter_id);
    setSelectedPatientName(item.patient_name);
    // Switch to in consultation status if pending
    if (item.status === 'PENDING_REVIEW') {
      setQueue((prev) =>
        prev.map((q) =>
          q.encounter_id === item.encounter_id ? { ...q, status: 'IN_CONSULTATION' } : q
        )
      );
    }
  };

  // Handle sign-off completion
  const handleApprovalComplete = (approval: ApprovalResponse['data']) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.encounter_id === approval.encounter_id ? { ...item, status: 'COMPLETED' } : item
      )
    );
  };

  // Handle citation inspection
  const handleSelectCitation = (citation: Citation) => {
    // Find or simulate document
    const docItem: UploadedDocItem = {
      id: citation.source_title.includes('Refill') ? 'doc_synth_rx_01' : 'doc_synth_referral_02',
      name: citation.source_title,
      size: 1024 * 1024 * 2.1,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: new Date().toISOString(),
      extractedFactIds: [citation.fact_id],
    };
    setSelectedDoc(docItem);
    setIsDocModalOpen(true);
  };

  // Handle document open
  const handleInspectDocument = (sourceId: string) => {
    const isReferral =
      sourceId.includes('referral') ||
      sourceId.includes('progress') ||
      sourceId === 'doc_synth_referral_02';

    const docItem: UploadedDocItem = {
      id: sourceId || 'doc_synth_rx_01',
      name: isReferral
        ? 'External Referral Clinical Note.pdf'
        : 'St. Jude Pharmacy Refill Order.pdf',
      size: 1024 * 1024 * 1.8,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: new Date().toISOString(),
      extractedFactIds: isReferral ? ['fact_005'] : ['fact_003'],
    };
    setSelectedDoc(docItem);
    setIsDocModalOpen(true);
  };

  const activePatientItem = queue.find((q) => q.encounter_id === selectedEncounterId);

  return (
    <div className="w-full space-y-6" data-testid="doctor-dashboard-hub">
      {/* 1. Clinician Workstation Active Context Header Banner */}
      <div className="bg-white dark:bg-[#080d19]/90 border border-slate-200 dark:border-white/[0.08] p-4 rounded-2xl shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-extrabold text-sm border border-cyan-400/30 shrink-0 shadow-md shadow-cyan-500/20">
            {selectedPatientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-semibold">
                Active Consultation Case
              </span>
              <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                {selectedEncounterId}
              </Badge>
              {activePatientItem?.priority === 'URGENT' && (
                <Badge variant="error" size="sm">
                  URGENT
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {selectedPatientName}
            </h2>
            {activePatientItem && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {activePatientItem.department} • Scheduled {activePatientItem.appointment_time}
              </p>
            )}
          </div>
        </div>

        {/* Anti-Wrong Patient Safeguard Confirmation & Quick Stats */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">Queue Status</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {activePatientItem?.status === 'COMPLETED' ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sign-off Complete
                </span>
              ) : activePatientItem?.status === 'IN_CONSULTATION' ? (
                <span className="text-cyan-700 dark:text-cyan-300 font-semibold">In Active Consultation</span>
              ) : (
                'Pending Review'
              )}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchEncounterData(selectedEncounterId)}
            data-testid="refresh-encounter-btn"
            className="text-xs min-h-[40px] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isBriefLoading ? 'animate-spin' : ''}`} />
            Re-sync Case
          </Button>
        </div>
      </div>

      {/* 2. Main Workstation Grid: Left Queue (1/3) + Right Clinical Detail (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Triage Queue */}
        <div className="lg:col-span-4 space-y-4">
          {queueError ? (
            <div
              role="alert"
              className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-200 space-y-2 text-xs"
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Failed to load queue</span>
              </div>
              <p>{queueError}</p>
              <Button size="sm" variant="outline" onClick={fetchQueue} className="mt-2 text-xs text-slate-300 border-white/10">
                Retry Queue
              </Button>
            </div>
          ) : (
            <DoctorQueueList
              queue={queue}
              selectedEncounterId={selectedEncounterId}
              onSelectPatient={handleSelectPatient}
              isLoading={isQueueLoading}
              onRefresh={fetchQueue}
            />
          )}
        </div>

        {/* Right Column: Multi-tab Clinical Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {/* Sub-Navigation Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-[#050811]/90 p-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] shadow-inner overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('brief')}
              data-testid="doc-tab-brief"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'brief'
                  ? 'bg-white dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-slate-300 dark:border-cyan-400/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Evidence Brief & Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              data-testid="doc-tab-ledger"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-slate-300 dark:border-cyan-400/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Context Ledger ({facts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              data-testid="doc-tab-diff"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-white dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-slate-300 dark:border-cyan-400/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Context Diff</span>
              {diffData && diffData.unresolved_count > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              data-testid="doc-tab-profile"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border border-slate-300 dark:border-cyan-400/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Profile & History</span>
            </button>
          </div>

          {/* Tab 1: Evidence Brief & Audio */}
          {activeTab === 'brief' && (
            <div>
              {isBriefLoading ? (
                <div
                  data-testid="brief-loading-indicator"
                  className="p-12 text-center text-slate-400 space-y-3 bg-[#080d19]/80 border border-white/[0.08] rounded-2xl"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">Synthesizing evidence-backed doctor brief...</p>
                </div>
              ) : briefError ? (
                <div
                  role="alert"
                  className="p-6 rounded-2xl border border-rose-500/40 bg-rose-950/40 text-rose-200 text-center space-y-2"
                >
                  <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Failed to load clinical brief</h3>
                  <p className="text-xs text-rose-200">{briefError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchEncounterData(selectedEncounterId)}
                    className="text-slate-300 border-white/10 hover:bg-white/5"
                  >
                    Retry
                  </Button>
                </div>
              ) : brief ? (
                <DoctorBriefCard
                  brief={brief}
                  encounterId={selectedEncounterId}
                  patientName={selectedPatientName}
                  facts={facts}
                  onSelectCitation={handleSelectCitation}
                  onInspectDocument={handleInspectDocument}
                  onViewLedger={() => setActiveTab('ledger')}
                  onViewDiff={() => setActiveTab('diff')}
                  onApprovalComplete={handleApprovalComplete}
                  onRegenerateBrief={() => fetchEncounterData(selectedEncounterId)}
                  isRegenerating={isBriefLoading}
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-[#080d19]/40 border border-white/10 border-dashed rounded-2xl">
                  No brief available for this encounter.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Clinical Context Ledger */}
          {activeTab === 'ledger' && (
            <div data-testid="tab-content-ledger">
              <ClinicalContextLedger
                facts={facts}
                encounterId={selectedEncounterId}
                isLoading={isFactsLoading}
                onSelectSourceDocument={handleInspectDocument}
              />
            </div>
          )}

          {/* Tab 3: Context Diff View */}
          {activeTab === 'diff' && (
            <div data-testid="tab-content-diff">
              <ContextDiffView
                diffData={diffData}
                isLoading={isDiffLoading}
                onRefresh={() => fetchEncounterData(selectedEncounterId)}
              />
            </div>
          )}



          {/* Tab 5: Hospital Patient Record / Master Profile */}
          {activeTab === 'profile' && (
            <div data-testid="tab-content-profile" className="pt-2">
              <PatientProfileHub
                patientId={selectedEncounterId === 'enc_demo_002' ? 'pat_synth_002' : 'pat_synth_001'}
                isClinicianView={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Document Source Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setSelectedDoc(null);
        }}
        document={selectedDoc}
        facts={facts}
      />
    </div>
  );
};
