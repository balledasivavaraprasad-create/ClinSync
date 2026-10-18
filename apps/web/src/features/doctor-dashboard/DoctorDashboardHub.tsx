import React, { useState, useEffect, useCallback } from 'react';
import { DoctorQueueList } from './DoctorQueueList';
import { DoctorBriefCard } from '../doctor-brief/DoctorBriefCard';
import { ClinicalContextLedger } from '../patient-context/ClinicalContextLedger';
import { ContextDiffView } from '../patient-context/ContextDiffView';
import { DocumentUploadZone, type UploadedDocItem } from '../documents/DocumentUploadZone';
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
  UploadCloud,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'brief' | 'ledger' | 'diff' | 'documents'>('brief');
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
  const handleInspectDocument = (_sourceId: string) => {
    const docItem: UploadedDocItem = {
      id: 'doc_synth_rx_01',
      name: 'St. Jude Pharmacy Refill Order.pdf',
      size: 1024 * 1024 * 1.8,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: new Date().toISOString(),
      extractedFactIds: ['fact_003'],
    };
    setSelectedDoc(docItem);
    setIsDocModalOpen(true);
  };

  const activePatientItem = queue.find((q) => q.encounter_id === selectedEncounterId);

  return (
    <div className="w-full space-y-6" data-testid="doctor-dashboard-hub">
      {/* 1. Clinician Workstation Active Context Header Banner */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-extrabold text-sm border border-teal-200 shrink-0">
            {selectedPatientName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
            <h2 className="text-lg font-black text-slate-900 leading-tight mt-0.5">
              {selectedPatientName}
            </h2>
          </div>
        </div>

        {/* Anti-Wrong Patient Safeguard Confirmation & Quick Stats */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block">Queue Status</span>
            <span className="text-xs font-bold text-slate-700">
              {activePatientItem?.status === 'COMPLETED' ? (
                <span className="text-emerald-700 flex items-center justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sign-off Complete
                </span>
              ) : activePatientItem?.status === 'IN_CONSULTATION' ? (
                <span className="text-teal-700">In Active Consultation</span>
              ) : (
                'Pending Review'
              )}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchEncounterData(selectedEncounterId)}
            data-testid="refresh-encounter-btn"
            className="text-xs min-h-[40px] text-slate-600"
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
              className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2 text-xs"
            >
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Failed to load queue</span>
              </div>
              <p>{queueError}</p>
              <Button size="sm" variant="outline" onClick={fetchQueue} className="mt-2 text-xs">
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
          <div className="flex items-center space-x-1 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('brief')}
              data-testid="doc-tab-brief"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'brief'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Evidence Brief & Audio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              data-testid="doc-tab-ledger"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'ledger'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Context Ledger ({facts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              data-testid="doc-tab-diff"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'diff'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
              onClick={() => setActiveTab('documents')}
              data-testid="doc-tab-documents"
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'documents'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Diagnostic Documents</span>
            </button>
          </div>

          {/* Tab 1: Evidence Brief & Audio */}
          {activeTab === 'brief' && (
            <div>
              {isBriefLoading ? (
                <div
                  data-testid="brief-loading-indicator"
                  className="p-12 text-center text-slate-400 space-y-3 bg-white border border-slate-200 rounded-2xl"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-semibold">Synthesizing evidence-backed doctor brief...</p>
                </div>
              ) : briefError ? (
                <div
                  role="alert"
                  className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-center space-y-2"
                >
                  <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                  <h3 className="text-sm font-bold">Failed to load clinical brief</h3>
                  <p className="text-xs text-rose-700">{briefError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchEncounterData(selectedEncounterId)}
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
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs bg-white border border-dashed rounded-2xl">
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

          {/* Tab 4: Uploaded Diagnostic Documents */}
          {activeTab === 'documents' && (
            <div data-testid="tab-content-documents">
              <DocumentUploadZone
                encounterId={selectedEncounterId}
                onViewDocument={(doc) => {
                  setSelectedDoc(doc);
                  setIsDocModalOpen(true);
                }}
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
