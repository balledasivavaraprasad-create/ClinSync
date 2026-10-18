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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080d19]/80 backdrop-blur-2xl p-5 sm:p-6 rounded-3xl border border-white/[0.08] shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] uppercase font-mono tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg font-semibold">
              Clinical Memory Audit
            </span>
            <span className="text-xs font-mono text-slate-400">Synchronized Clinical OS • Multi-Source Ledger</span>
            <span className="sr-only">G3 Workstream</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-white font-normal tracking-tight pt-1">
            Clinical Context Ledger & Patient Context Diff
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Audit-grade patient context ledger with multimodal OCR document ingestion, provenance verification tracking, and contradictory claim reconciliation.
          </p>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center space-x-1.5 bg-[#050811] p-1.5 rounded-2xl border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 inline" />
            Full Suite
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'upload'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 inline" />
            Document Upload
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 inline" />
            Context Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('diff')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'diff'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
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
