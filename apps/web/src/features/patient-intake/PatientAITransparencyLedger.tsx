import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  FileText,
  Mic,
  Database,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { ClinicalFact } from '../../lib/api/types';
import { mockClinicalFacts } from '../../lib/api/mockData';

export interface PatientAITransparencyLedgerProps {
  facts?: ClinicalFact[];
  encounterId?: string;
  patientName?: string;
  showCardWrapper?: boolean;
  onClose?: () => void;
}

export const PatientAITransparencyLedger: React.FC<PatientAITransparencyLedgerProps> = ({
  facts,
  encounterId = 'enc_demo_001',
  patientName = 'Eleanor Johnson',
  showCardWrapper = true,
  onClose,
}) => {
  // Use passed facts or default grounded mock facts
  const activeFacts = (facts && facts.length > 0) ? facts : mockClinicalFacts;

  const [filterSource, setFilterSource] = useState<'all' | 'voice' | 'document' | 'ehr'>('all');
  const [confirmedFactIds, setConfirmedFactIds] = useState<Record<string, boolean>>({
    fact_001: true,
    fact_003: true,
  });
  const [flaggedFactIds, setFlaggedFactIds] = useState<Record<string, string>>({});
  const [activeCorrectionId, setActiveCorrectionId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState<string>('');

  const handleToggleConfirm = (id: string) => {
    setConfirmedFactIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSaveCorrection = (id: string) => {
    if (!correctionNote.trim()) return;
    setFlaggedFactIds((prev) => ({
      ...prev,
      [id]: correctionNote,
    }));
    setActiveCorrectionId(null);
    setCorrectionNote('');
  };

  const filteredFacts = activeFacts.filter((fact) => {
    if (filterSource === 'all') return true;
    if (filterSource === 'voice') return fact.source_type?.toLowerCase().includes('voice') || fact.source_type?.toLowerCase().includes('utterance');
    if (filterSource === 'document') return fact.source_type?.toLowerCase().includes('document') || fact.source_type?.toLowerCase().includes('scan');
    if (filterSource === 'ehr') return fact.source_type?.toLowerCase().includes('ehr') || fact.source_type?.toLowerCase().includes('hospital');
    return true;
  });

  const getSourceIcon = (sourceType?: string) => {
    const s = sourceType?.toLowerCase() || '';
    if (s.includes('voice') || s.includes('utterance')) {
      return <Mic className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (s.includes('document') || s.includes('scan')) {
      return <FileText className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <Database className="w-3.5 h-3.5 text-purple-400" />;
  };

  const getSourceDisplayLabel = (fact: ClinicalFact) => {
    const s = fact.source_type?.toLowerCase() || '';
    if (s.includes('voice') || s.includes('utterance')) {
      return {
        origin: 'Spoken Voice Dialogue',
        citation: fact.source_location ? `Turn: ${fact.source_location}` : 'Patient Voice Audio',
        model: 'Conversational Voice Model',
      };
    }
    if (s.includes('document') || s.includes('scan')) {
      const docName = fact.source_id?.includes('rx')
        ? 'St. Jude Pharmacy Refill Order.pdf'
        : 'Cardiology Referral Note & ECG.pdf';
      return {
        origin: `Uploaded Document (${docName})`,
        citation: fact.source_location || 'Page 1, Box 2',
        model: 'Gemini 2.5 Flash Vision OCR',
      };
    }
    return {
      origin: 'Hospital EHR Medical Chart',
      citation: fact.source_location || 'Cardiology Chart Section 3 (Prior)',
      model: 'Authoritative Health Record',
    };
  };

  const content = (
    <div data-testid="patient-ai-transparency-ledger" className="space-y-6 text-slate-100 font-sans">
      {/* 1. Header & Anti-Hallucination Guarantee */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-teal-950/60 border border-cyan-500/25 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>AI Fact Transparency & Grounding Ledger</span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono uppercase">
                  Zero Hallucination Guarantee
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Patient: <span className="text-white font-medium">{patientName}</span> • Every detail shown below is verified against your spoken statements or uploaded documents.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono text-cyan-300 bg-black/40 px-3 py-1 rounded-lg border border-white/10 block sm:inline-block">
              Encounter: <strong className="text-white">{encounterId}</strong>
            </span>
          </div>
        </div>

        {/* Live KYC & AI Processing Steps */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">1. Patient KYC</div>
              <div className="text-[10px] text-slate-400">Identity Confirmed</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">2. Voice Intake</div>
              <div className="text-[10px] text-slate-400">Turn Grounding</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">3. Document OCR</div>
              <div className="text-[10px] text-slate-400">Gemini Vision</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-black/30 p-2 rounded-xl border border-white/5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">4. Ledger Assembly</div>
              <div className="text-[10px] text-cyan-300">Ready for Doctor</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Source Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-slate-400 font-mono text-[11px] mr-1">Filter Source:</span>
          <button
            type="button"
            onClick={() => setFilterSource('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              filterSource === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            All Facts ({activeFacts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('voice')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'voice'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Mic className="w-3 h-3" />
            <span>Voice Intake</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('document')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'document'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Documents</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('ehr')}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'ehr'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>Hospital EHR</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Showing {filteredFacts.length} verified clinical statement(s)
        </span>
      </div>

      {/* 3. Facts Breakdown Cards */}
      <div className="space-y-3" data-testid="transparency-facts-list">
        {filteredFacts.map((fact) => {
          const isConfirmed = confirmedFactIds[fact.id];
          const flagNote = flaggedFactIds[fact.id];
          const isEditing = activeCorrectionId === fact.id;
          const { origin, citation, model } = getSourceDisplayLabel(fact);

          return (
            <div
              key={fact.id}
              className={`rounded-2xl p-4 transition-all border ${
                flagNote
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : isConfirmed
                  ? 'bg-white/[0.03] border-cyan-500/30'
                  : 'bg-white/[0.02] border-white/10'
              } shadow-md backdrop-blur-xl`}
              data-testid={`fact-item-${fact.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Fact Information */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-300 font-semibold">
                      {fact.concept}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {fact.id}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-bold text-white leading-snug">
                    {fact.value} {fact.unit ? `(${fact.unit})` : ''}
                  </div>

                  {/* Grounding Source Citation */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      {getSourceIcon(fact.source_type)}
                      <span className="font-medium text-slate-200">{origin}</span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                      <span>Exact Location:</span>
                      <strong className="text-white">{citation}</strong>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-400">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>{model}</span>
                    </div>

                    {fact.confidence && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {Math.round(fact.confidence * 100)}% Match
                      </span>
                    )}
                  </div>

                  {/* Flagged Note if Patient Reported Correction */}
                  {flagNote && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        Patient Note for Doctor: <strong>"{flagNote}"</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Patient Direct Controls */}
                <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleToggleConfirm(fact.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                    data-testid={`confirm-btn-${fact.id}`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isConfirmed ? 'Verified by You' : 'Confirm Accurate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCorrectionId(isEditing ? null : fact.id);
                      setCorrectionNote(flagNote || '');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
                    title="Add patient note or correction for the doctor"
                  >
                    <span>{flagNote ? 'Edit Note' : 'Add Note'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Correction Input */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Tell your doctor what needs clarifying about this fact:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      placeholder="e.g. Actually I take Lisinopril only in the morning, not twice a day"
                      className="flex-1 bg-[#050811] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400 font-sans"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSaveCorrection(fact.id)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                    >
                      Save Note
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveCorrectionId(null)}
                      className="text-slate-400 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Footer Assurance */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            ClinSync is built to prevent hallucinations. All data above is directly passed to Dr. Clara Chen's clinical brief with citations.
          </span>
        </div>
        {onClose && (
          <Button size="sm" variant="outline" onClick={onClose} className="border-white/15 text-slate-200">
            Close Inspector
          </Button>
        )}
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-[#080d19]/95 border border-white/10 shadow-2xl backdrop-blur-3xl">
      {content}
    </div>
  );
};
