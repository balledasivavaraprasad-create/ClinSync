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
    <Card className="shadow-sm border-slate-200" data-testid="context-diff-view">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
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
              <CardDescription className="text-xs text-slate-500">
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
              className="text-xs h-8 px-2.5 text-slate-600 hover:text-slate-900"
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
            <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold">Computing patient context diff engine results...</p>
          </div>
        ) : (
          <>
            {/* 1. Unresolved Contradictions Section */}
            {diffData.conflicting_facts.length > 0 && (
              <div className="space-y-3" data-testid="unresolved-conflicts-section">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-900">
                    Unresolved Clinical Contradictions ({diffData.conflicting_facts.length})
                  </h3>
                </div>

                {diffData.conflicting_facts.map((conflict, idx) => {
                  const resolvedStatus = resolvedConflicts[idx];

                  return (
                    <div
                      key={idx}
                      data-testid={`conflict-card-${idx}`}
                      className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3 shadow-subtle"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-rose-950 uppercase tracking-wider block">
                            Conflict #{idx + 1}: Discrepancy Detected
                          </span>
                          <p className="text-xs text-rose-900 font-medium leading-relaxed">
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
                        <div className="bg-white p-3 rounded-lg border border-rose-200/80 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span className="flex items-center text-teal-700">
                              <User className="w-3 h-3 mr-1" />
                              Claim A (Current Patient Intake)
                            </span>
                            <span>{conflict.claim_a.source_location || 'Turn 1'}</span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">
                            {conflict.claim_a.value}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Source: {conflict.claim_a.source_type} • Status: {conflict.claim_a.status}
                          </p>
                        </div>

                        {/* Claim B */}
                        <div className="bg-white p-3 rounded-lg border border-rose-200/80 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                            <span className="flex items-center text-blue-700">
                              <Stethoscope className="w-3 h-3 mr-1" />
                              Claim B (Referral Note / Prior EHR)
                            </span>
                            <span>{conflict.claim_b.source_location || 'Referral'}</span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">
                            {conflict.claim_b.value}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Source: {conflict.claim_b.source_type} • Status: {conflict.claim_b.status}
                          </p>
                        </div>
                      </div>

                      {/* Resolution actions */}
                      {!resolvedStatus && (
                        <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-rose-200/60">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'accept_a')}
                            data-testid={`resolve-patient-btn-${idx}`}
                            className="text-xs h-8 px-2.5 bg-white text-teal-800 border-teal-300 hover:bg-teal-50"
                          >
                            Accept Patient Statement
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'accept_b')}
                            data-testid={`resolve-ehr-btn-${idx}`}
                            className="text-xs h-8 px-2.5 bg-white text-blue-800 border-blue-300 hover:bg-blue-50"
                          >
                            Retain Prior EHR Record
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(idx, 'escalate')}
                            data-testid={`resolve-escalate-btn-${idx}`}
                            className="text-xs h-8 px-2.5 bg-white text-rose-800 border-rose-300 hover:bg-rose-50 font-bold"
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
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Changed / Superseded Facts ({diffData.changed_facts.length})
                </h3>
              </div>

              {diffData.changed_facts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No historical facts superseded in this encounter.</p>
              ) : (
                <div className="space-y-2">
                  {diffData.changed_facts.map((item, idx) => (
                    <div
                      key={idx}
                      data-testid={`changed-fact-card-${idx}`}
                      className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {item.current.concept}
                        </span>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="line-through text-slate-400 font-mono">
                            {item.historical.value} {item.historical.unit || ''}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold text-amber-950 font-mono text-sm">
                            {item.current.value} {item.current.unit || ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
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
                <PlusCircle className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Newly Introduced Facts ({diffData.new_facts.length})
                </h3>
              </div>

              {diffData.new_facts.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No new clinical facts introduced in this encounter.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {diffData.new_facts.map((fact) => (
                    <div
                      key={fact.id}
                      data-testid={`new-fact-card-${fact.id}`}
                      className="p-3 rounded-xl border border-teal-200 bg-teal-50/20 space-y-1 shadow-subtle"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{fact.concept}</span>
                        <Badge variant="success" className="text-[10px] font-semibold">
                          NEW
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-900 font-semibold">{fact.value}</p>
                      <p className="text-[11px] text-slate-500 pt-0.5">
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
