import React, { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import type { UploadedDocItem } from './DocumentUploadZone';
import type { ClinicalFact } from '../../lib/api/types';
import { mockClinicalFacts } from '../../lib/api/mockData';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  FileSearch,
} from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UploadedDocItem | null;
  facts?: ClinicalFact[];
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  facts = mockClinicalFacts,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 2;

  if (!document) return null;

  // Filter facts anchored to this document
  const associatedFacts = facts.filter(
    (f) =>
      document.extractedFactIds.includes(f.id) ||
      f.source_id === document.id ||
      f.source_type === 'document_scan'
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={document.name}
      description={`ID: ${document.id} • Type: ${document.type} • Uploaded ${new Date(document.uploadedAt).toLocaleString()}`}
      className="max-w-4xl p-0 overflow-hidden"
    >
      <div data-testid="document-viewer-modal" className="flex flex-col max-h-[80vh] bg-[#080d19] text-white">
        {/* Status Callout Bar */}
        <div className="px-6 py-2.5 bg-[#050811] border-b border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Badge variant="neutral" className="text-[11px] bg-white/[0.06] text-cyan-300 border-white/10">
              Source Verified
            </Badge>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono text-[11px]">MD5: e92a47b198c8</span>
          </div>

          <Badge variant="warning" className="text-xs font-semibold">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Unverified OCR Draft
          </Badge>
        </div>

        {/* Content Body: Split into Document Preview and Extracted Facts Panel */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/[0.06] min-h-[360px]">
          {/* Document Visual Preview (Simulated PDF/Scan viewer) */}
          <div className="md:col-span-7 p-5 bg-black/20 flex flex-col justify-between">
            <div>
              {/* Pagination Bar */}
              <div className="flex items-center justify-between mb-3 text-xs text-slate-300 bg-[#0c1222] border border-white/10 px-3 py-1.5 rounded-xl shadow-sm">
                <span className="font-semibold font-mono">Document Page {currentPage} of {totalPages}</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                    className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                    className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Document Page Simulation */}
              <div
                data-testid="document-page-preview"
                className="bg-[#0b1122] border border-white/10 rounded-2xl p-6 shadow-xl min-h-[260px] font-mono text-xs text-slate-300 space-y-3"
              >
                <div className="border-b border-white/[0.06] pb-2 flex justify-between items-center text-[10px] text-slate-400">
                  <span>ST. JUDE HEALTH SYSTEM • MEDICAL CLINIC</span>
                  <span className="text-cyan-400">CONFIDENTIAL MEDICAL RECORD</span>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">PATIENT CLINICAL SUMMARY & PHARMACY ORDER</p>
                  <p className="text-[11px] text-slate-400">Patient: Eleanor Johnson • DOB: 1982-05-12 • MRN: #SJ-99214</p>
                </div>

                <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-200 font-sans relative shadow-inner">
                  <span className="absolute -top-2.5 right-2 text-[10px] bg-cyan-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center font-mono shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    OCR Extracted Box
                  </span>
                  <p className="font-bold text-xs text-white">Rx Item: Lisinopril 10 MG Oral Tablet</p>
                  <p className="text-xs text-cyan-200 mt-0.5">Sig: Take 1 tablet daily by mouth for Essential Hypertension.</p>
                  <p className="text-[11px] text-cyan-300/80 mt-1 font-mono">Refills: 2 • Prescriber: Dr. Marcus Vance, MD (NPI: 1992019281)</p>
                </div>

                <div className="p-2.5 border border-white/[0.06] rounded-xl text-slate-400 text-[11px] bg-white/[0.02]">
                  Clinical Notes: Patient reports occasional lightheadedness when rising. Vital check: BP 142/88 mmHg. Advised continued sodium moderation.
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Multimodal extraction processed via Gemini Vision API</span>
              <span className="flex items-center text-cyan-300 font-semibold">
                <FileText className="w-3 h-3 mr-1" />
                Immutable Document Anchor
              </span>
            </div>
          </div>

          {/* Right Panel: Extracted Context Facts */}
          <div className="md:col-span-5 p-5 flex flex-col justify-between bg-[#080d19]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center font-mono">
                  <FileSearch className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Facts Extracted from File ({associatedFacts.length})
                </span>
              </div>

              {associatedFacts.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                  No facts linked to this document yet.
                </div>
              ) : (
                <div className="space-y-2.5" data-testid="associated-facts-list">
                  {associatedFacts.map((fact) => (
                    <div
                      key={fact.id}
                      data-testid={`viewer-fact-${fact.id}`}
                      className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.025] space-y-2 hover:border-cyan-400/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {fact.concept}
                        </span>
                        <Badge
                          variant={fact.status === 'doctor_confirmed' ? 'success' : 'neutral'}
                          className={`text-[10px] font-semibold ${
                            fact.status === 'extracted_unverified'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : ''
                          }`}
                        >
                          {fact.status === 'extracted_unverified'
                            ? 'Extracted (Unverified)'
                            : fact.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-300 font-medium">
                        {fact.value}
                      </p>

                      <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Loc: {fact.source_location || 'Page 1'}</span>
                        <span className="font-semibold text-cyan-300">
                          Confidence: {Math.round((fact.confidence || 0.9) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strict Regulatory / Clinical Warning Banner */}
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-amber-300">Clinical Governance Rule:</strong> Extracted facts remain marked as unverified drafts until reviewed and affirmed by an attending physician.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#050811] border-t border-white/[0.06] flex-shrink-0 flex items-center justify-between">
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            Source document is immutable and cryptographically hashed for clinical integrity.
          </span>
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            data-testid="close-viewer-btn"
            className="text-xs h-9 px-4 font-bold"
          >
            Done Inspecting
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
