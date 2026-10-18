import React, { useState } from 'react';
import { DocumentUploadZone, type UploadedDocItem } from '../documents/DocumentUploadZone';
import { DocumentViewerModal } from '../documents/DocumentViewerModal';
import { ClinicalContextLedger } from './ClinicalContextLedger';
import { ContextDiffView } from './ContextDiffView';
import { mockClinicalFacts } from '../../lib/api/mockData';
import type { ClinicalFact } from '../../lib/api/types';
import {
  FileText,
  GitCompare,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

export const LedgerDiffHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'upload' | 'ledger' | 'diff'>('all');
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const facts: ClinicalFact[] = mockClinicalFacts;

  const handleViewDocument = (doc: UploadedDocItem) => {
    setSelectedDoc(doc);
    setIsViewerOpen(true);
  };

  const handleSelectSourceDocument = (sourceId: string) => {
    const foundDoc: UploadedDocItem = {
      id: sourceId,
      name: sourceId === 'doc_synth_rx_01' ? 'St. Jude Pharmacy Refill Order.pdf' : `${sourceId}.pdf`,
      size: 1024 * 1024 * 1.8,
      type: 'application/pdf',
      status: 'EXTRACTED',
      progress: 100,
      uploadedAt: '2026-10-18T08:20:00Z',
      extractedFactIds: [sourceId === 'doc_synth_rx_01' ? 'fact_003' : 'fact_005'],
    };
    setSelectedDoc(foundDoc);
    setIsViewerOpen(true);
  };

  const handleSelectCitation = (factId: string) => {
    console.log(`Citation selected for fact: ${factId}`);
  };

  const handleDocumentExtracted = (docId: string, extractedFactIds: string[]) => {
    console.log(`Document ${docId} extracted with facts:`, extractedFactIds);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6" data-testid="ledger-diff-hub">
      {/* Top Banner & Navigation Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-extrabold tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
              G3 Workstream
            </span>
            <span className="text-xs font-mono text-slate-400">TASK-P1-301</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Clinical Context Ledger & Patient Context Diff
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Audit-grade patient context ledger with multimodal OCR document ingestion, provenance verification tracking, and contradictory claim reconciliation.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 inline" />
            Full Suite
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 inline" />
            Document Upload
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'ledger'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 inline" />
            Context Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('diff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'diff'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 mr-1.5 inline" />
            Context Diff
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="space-y-6">
        {/* Document Upload Zone */}
        {(activeSubTab === 'all' || activeSubTab === 'upload') && (
          <DocumentUploadZone
            encounterId="enc_demo_001"
            onViewDocument={handleViewDocument}
            onDocumentExtracted={handleDocumentExtracted}
          />
        )}

        {/* Clinical Context Ledger */}
        {(activeSubTab === 'all' || activeSubTab === 'ledger') && (
          <ClinicalContextLedger
            facts={facts}
            encounterId="enc_demo_001"
            onSelectSourceDocument={handleSelectSourceDocument}
            onSelectCitation={handleSelectCitation}
          />
        )}

        {/* Patient Context Diff View */}
        {(activeSubTab === 'all' || activeSubTab === 'diff') && (
          <ContextDiffView />
        )}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={selectedDoc}
        facts={facts}
      />
    </div>
  );
};
