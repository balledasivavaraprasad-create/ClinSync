import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { DiffResponse } from '../../lib/api/types';
import { mockClinicalFacts } from '../../lib/api/mockData';
import {
  GitCompare,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  User,
  Stethoscope,
} from 'lucide-react';

interface ContextDiffViewProps {
  diffData?: DiffResponse['data'];
  onResolveConflict?: (index: number, resolution: 'accept_a' | 'accept_b' | 'escalate') => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const defaultDiffData: DiffResponse['data'] = {
  encounter_id: 'enc_demo_001',
  new_facts: [mockClinicalFacts[0], mockClinicalFacts[2]],
  changed_facts: [
    {
      historical: {
        ...mockClinicalFacts[3],
        id: 'fact_hist_bp_01',
        value: '130/80',
        clinical_time: '2025-11-10T14:00:00Z',
        recorded_at: '2025-11-10T14:15:00Z',
      },
      current: mockClinicalFacts[3],
    },
  ],
  conflicting_facts: [
    {
      claim_a: mockClinicalFacts[0],
      claim_b: mockClinicalFacts[4],
      conflict_description:
        'Contradictory onset timeline between patient intake statement (3 days) and clinic referral notes (2 weeks).',
    },
  ],
  unresolved_count: 1,
};

export const ContextDiffView: React.FC<ContextDiffViewProps> = ({
  diffData = defaultDiffData,
  onResolveConflict,
  isLoading = false,
  onRefresh,
}) => {
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<number, string>>({});

  const handleAction = (index: number, resolution: 'accept_a' | 'accept_b' | 'escalate') => {
    setResolvedConflicts((prev) => ({
      ...prev,
      [index]: resolution,
    }));
    if (onResolveConflict) {
      onResolveConflict(index, resolution);
    }
  };

  const activeUnresolvedCount =
    diffData.conflicting_facts.length - Object.keys(resolvedConflicts).length;

  return (
    <Card className="shadow-lg border-white/[0.08] bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl overflow-hidden" data-testid="context-diff-view">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-inner">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-serif text-white font-normal flex items-center space-x-2">
                <span>Patient Context Diff</span>
                {activeUnresolvedCount > 0 ? (
                  <Badge variant="error" className="text-xs font-semibold">
                    {activeUnresolvedCount} Unresolved {activeUnresolvedCount === 1 ? 'Conflict' : 'Conflicts'}
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    All Reconciled
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Automated reconciliation comparing current intake claims against historical health records
              </CardDescription>
            </div>
          </div>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-xs h-8 px-2.5 text-slate-300 hover:text-white border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Recompute Diff
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4">
        {isLoading ? (
          <div
            data-testid="diff-loading-state"
            className="p-12 text-center text-slate-400 space-y-2"
          >
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold font-mono">Computing patient context diff engine results...</p>
          </div>
        ) : (
          <>
            {/* 1. Unresolved Contradictions Section */}
            {diffData.conflicting_facts.length > 0 && (
              <div className="space-y-3" data-testid="unresolved-conflicts-section">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                    Unresolved Clinical Contradictions ({diffData.conflicting_facts.length})
                  </h3>
                </div>

                {diffData.conflicting_facts.map((conflict, idx) => {
                  const resolvedStatus = resolvedConflicts[idx];

                  return (
                    <div
                      key={idx}
                      data-testid={`conflict-card-${idx}`}
                      className="p-5 rounded-2xl border border-rose-500/40 bg-rose-950/40 backdrop-blur-md space-y-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono font-bold text-rose-300 uppercase tracking-widest block">
                            Conflict #{idx + 1}: Discrepancy Detected
                          </span>
                          <p className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed">
                            {conflict.conflict_description}
                          </p>
                        </div>

                        {resolvedStatus ? (
                          <Badge variant="success" className="text-xs shrink-0 font-semibold">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {resolvedStatus === 'accept_a'
                              ? 'Patient Claim Kept'
                              : resolvedStatus === 'accept_b'
                              ? 'Historical Retained'
                              : 'Escalated to MD'}
                          </Badge>
                        ) : (
                          <Badge variant="error" className="text-xs shrink-0 font-semibold">
                            Action Required
                          </Badge>
                        )}
                      </div>

                      {/* Side-by-side comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Claim A */}
                        <div className="bg-white/[0.03] p-4 rounded-xl border border-cyan-500/30 space-y-1.5 text-xs shadow-inner">
                          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300 font-semibold">
                            <span className="flex items-center">
                              <User className="w-3.5 h-3.5 mr-1" />
                              Claim A (Current Patient Intake)
                            </span>
                            <span className="text-slate-400">{conflict.claim_a.source_location || 'Turn 1'}</span>
                          </div>
                          <p className="font-bold text-white text-sm sm:text-base">
                            {conflict.claim_a.value}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Source: {conflict.claim_a.source_type} • Status: {conflict.claim_a.status}
                          </p>
                        </div>

                        {/* Claim B */}
                        <div className="bg-white/[0.03] p-4 rounded-xl border border-blue-500/30 space-y-1.5 text-xs shadow-inner">
                          <div className="flex items-center justify-between text-[11px] font-mono text-blue-300 font-semibold">
                            <span className="flex items-center">
                              <Stethoscope className="w-3.5 h-3.5 mr-1" />
                              Claim B (Referral Note / Prior EHR)
                            </span>
                            <span className="text-slate-400">{conflict.claim_b.source_location || 'Referral'}</span>
                          </div>
                          <p className="font-bold text-white text-sm sm:text-base">
                            {conflict.claim_b.value}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Source: {conflict.claim_b.source_type} • Status: {conflict.claim_b.status}
                          </p>
                        </div>
                      </div>

                      {/* Resolution actions */}
                      {!resolvedStatus && (
                        <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-rose-500/30">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'accept_a')}
                            data-testid={`resolve-patient-btn-${idx}`}
                            className="text-xs h-9 px-3 bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25"
                          >
                            Accept Patient Statement
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'accept_b')}
                            data-testid={`resolve-ehr-btn-${idx}`}
                            className="text-xs h-9 px-3 bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25"
                          >
                            Retain Prior EHR Record
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'escalate')}
                            data-testid={`resolve-escalate-btn-${idx}`}
                            className="text-xs h-9 px-3 bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 font-bold"
                          >
                            Flag for Doctor Review
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Changed / Updated Clinical Facts */}
            <div className="space-y-3" data-testid="changed-facts-section">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Changed / Superseded Facts ({diffData.changed_facts.length})
                </h3>
              </div>

              {diffData.changed_facts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No historical facts superseded in this encounter.</p>
              ) : (
                <div className="space-y-2.5">
                  {diffData.changed_facts.map((item, idx) => (
                    <div
                      key={idx}
                      data-testid={`changed-fact-card-${idx}`}
                      className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
                          {item.current.concept}
                        </span>
                        <div className="flex items-center space-x-2.5 text-xs">
                          <span className="line-through text-slate-500 font-mono">
                            {item.historical.value} {item.historical.unit || ''}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-bold text-amber-300 font-mono text-sm sm:text-base">
                            {item.current.value} {item.current.unit || ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                        <span>Updated: {new Date(item.current.recorded_at).toLocaleDateString()}</span>
                        <Badge variant="warning" className="text-[10px] font-semibold">
                          Supersedes prior reading
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. New Clinical Facts */}
            <div className="space-y-3" data-testid="new-facts-section">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Newly Introduced Facts ({diffData.new_facts.length})
                </h3>
              </div>

              {diffData.new_facts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No new clinical facts introduced in this encounter.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diffData.new_facts.map((fact) => (
                    <div
                      key={fact.id}
                      data-testid={`new-fact-card-${fact.id}`}
                      className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] hover:border-cyan-400/40 space-y-1.5 shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">{fact.concept}</span>
                        <Badge variant="success" className="text-[10px] font-semibold">
                          NEW
                        </Badge>
                      </div>
                      <p className="text-sm text-cyan-300 font-bold">{fact.value}</p>
                      <p className="text-[11px] text-slate-400 pt-0.5 font-mono">
                        Source: {fact.source_type} ({fact.source_location || 'Recorded today'})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
