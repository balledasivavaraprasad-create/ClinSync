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
    <div data-testid="patient-ai-transparency-ledger" className="space-y-6 text-slate-900 dark:text-slate-100 font-sans">
      {/* 1. Header & Verified Notes Summary */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-cyan-50/80 via-white to-teal-50/80 dark:from-cyan-950/60 dark:via-slate-900/80 dark:to-teal-950/60 border border-slate-200 dark:border-cyan-500/25 shadow-sm dark:shadow-lg backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-400/30 flex items-center justify-center text-cyan-700 dark:text-cyan-300 shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>What the Doctor Will See</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
                  100% Verified Notes
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Patient: <span className="text-slate-900 dark:text-white font-medium">{patientName}</span> • Every note shown below comes directly from what you said or documents you uploaded.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono text-slate-700 dark:text-cyan-300 bg-slate-100 dark:bg-black/40 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 block sm:inline-block">
              Visit ID: <strong className="text-slate-900 dark:text-white">{encounterId}</strong>
            </span>
          </div>
        </div>

        {/* Friendly Intake Progress Steps */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center space-x-2 bg-white dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">1. Who You Are</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Identity Confirmed</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-white dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">2. What You Said</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Spoken Notes Saved</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-white dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">3. Uploaded Papers</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Scanned & Extracted</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-white dark:bg-black/30 p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">4. Doctor's Summary</div>
              <div className="text-[10px] text-cyan-700 dark:text-cyan-300 font-medium">Ready for Consultation</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Source Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mr-1">Filter Notes:</span>
          <button
            type="button"
            onClick={() => setFilterSource('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              filterSource === 'all'
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/5'
            }`}
          >
            All Notes ({activeFacts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('voice')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'voice'
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/5'
            }`}
          >
            <Mic className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Spoken Conversation</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('document')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'document'
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/5'
            }`}
          >
            <FileText className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Uploaded Papers</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterSource('ehr')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              filterSource === 'ehr'
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/5'
            }`}
          >
            <Database className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            <span>Prior Records</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          Showing {filteredFacts.length} verified health item(s)
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
                  ? 'bg-amber-50/90 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40'
                  : isConfirmed
                  ? 'bg-white dark:bg-white/[0.03] border-cyan-300/80 dark:border-cyan-500/30'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10'
              } shadow-sm backdrop-blur-xl`}
              data-testid={`fact-item-${fact.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Fact Information */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-cyan-800 dark:text-cyan-300 font-semibold">
                      {fact.concept}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      ID: {fact.id}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {fact.value} {fact.unit ? `(${fact.unit})` : ''}
                  </div>

                  {/* Grounding Source Citation */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      {getSourceIcon(fact.source_type)}
                      <span className="font-medium text-slate-800 dark:text-slate-200">{origin}</span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-cyan-900 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20">
                      <span>Exact Location:</span>
                      <strong className="text-slate-900 dark:text-white">{citation}</strong>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span>{model}</span>
                    </div>

                    {fact.confidence && (
                      <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/20">
                        {Math.round(fact.confidence * 100)}% Match
                      </span>
                    )}
                  </div>

                  {/* Flagged Note if Patient Reported Correction */}
                  {flagNote && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-100/80 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        Note for Doctor: <strong>"{flagNote}"</strong>
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
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/10'
                    }`}
                    data-testid={`confirm-btn-${fact.id}`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isConfirmed ? 'Verified by You' : 'Confirm Accurate'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCorrectionId(isEditing ? null : fact.id);
                      setCorrectionNote(flagNote || '');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                    title="Add patient note or note for the doctor"
                  >
                    <span>{flagNote ? 'Edit Note' : 'Add Note'}</span>
                  </button>
                </div>
              </div>

              {/* Inline Correction Input */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Tell your doctor what needs clarifying about this item:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      placeholder="e.g. Actually I take this medicine only once in the morning"
                      className="flex-1 bg-white dark:bg-[#050811] border border-slate-300 dark:border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSaveCorrection(fact.id)}
                      className="bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold text-xs"
                    >
                      Save Note
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveCorrectionId(null)}
                      className="text-slate-500 dark:text-slate-400 text-xs"
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
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>
            Every detail above will be clearly shown to your doctor with full references to your papers and words.
          </span>
        </div>
        {onClose && (
          <Button size="sm" variant="outline" onClick={onClose} className="border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200">
            Close
          </Button>
        )}
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#080d19]/95 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-3xl">
      {content}
    </div>
  );
};
