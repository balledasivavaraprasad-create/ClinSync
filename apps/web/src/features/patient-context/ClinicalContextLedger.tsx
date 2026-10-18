import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { ClinicalFact, ClinicalFactStatus } from '../../lib/api/types';
import { mockClinicalFacts, mockCitations } from '../../lib/api/mockData';
import {
  FileSpreadsheet,
  Search,
  AlertTriangle,
  FileText,
  Mic,
  Activity,
  History,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Clock,
  UserCheck,
} from 'lucide-react';

interface ClinicalContextLedgerProps {
  facts?: ClinicalFact[];
  encounterId?: string;
  onSelectCitation?: (factId: string) => void;
  onSelectSourceDocument?: (sourceId: string) => void;
  isLoading?: boolean;
}

export const ClinicalContextLedger: React.FC<ClinicalContextLedgerProps> = ({
  facts = mockClinicalFacts,
  encounterId = 'enc_demo_001',
  onSelectCitation,
  onSelectSourceDocument,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'symptom', label: 'Symptoms' },
    { key: 'medication', label: 'Medications' },
    { key: 'allergy', label: 'Allergies' },
    { key: 'condition', label: 'Conditions' },
    { key: 'investigation', label: 'Investigations & Vitals' },
  ];

  const statuses: { key: string; label: string }[] = [
    { key: 'all', label: 'All Statuses' },
    { key: 'reported', label: 'Patient Reported' },
    { key: 'extracted_unverified', label: 'Extracted (Unverified)' },
    { key: 'historical_recorded', label: 'Historical Recorded' },
    { key: 'doctor_confirmed', label: 'Doctor Confirmed' },
    { key: 'conflicting', label: 'Conflicting / Disputed' },
  ];

  const filteredFacts = useMemo(() => {
    return facts.filter((fact) => {
      // Category filter
      if (selectedCategory !== 'all' && fact.fact_type !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && fact.status !== selectedStatus) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          fact.concept.toLowerCase().includes(query) ||
          fact.value.toLowerCase().includes(query) ||
          (fact.source_location && fact.source_location.toLowerCase().includes(query)) ||
          fact.source_type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [facts, selectedCategory, selectedStatus, searchQuery]);

  const getStatusBadge = (status: ClinicalFactStatus) => {
    switch (status) {
      case 'doctor_confirmed':
        return (
          <Badge variant="success" className="text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Doctor Confirmed
          </Badge>
        );
      case 'extracted_unverified':
        return (
          <Badge
            variant="info"
            className="text-xs font-semibold bg-blue-50 text-blue-800 border-blue-300"
          >
            <FileText className="w-3 h-3 mr-1" />
            Extracted (Unverified Draft)
          </Badge>
        );
      case 'reported':
        return (
          <Badge
            variant="warning"
            className="text-xs font-semibold bg-amber-50 text-amber-800 border-amber-300"
          >
            <Mic className="w-3 h-3 mr-1" />
            Patient Reported
          </Badge>
        );
      case 'historical_recorded':
        return (
          <Badge
            variant="neutral"
            className="text-xs font-semibold bg-slate-100 text-slate-700 border-slate-300"
          >
            <History className="w-3 h-3 mr-1" />
            Historical EHR Record
          </Badge>
        );
      case 'conflicting':
        return (
          <Badge variant="error" className="text-xs font-semibold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Contradiction Detected
          </Badge>
        );
      case 'uncertain':
        return (
          <Badge
            variant="warning"
            className="text-xs font-semibold bg-purple-50 text-purple-800 border-purple-300"
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            Uncertain Evidence
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="neutral"
            className="text-xs font-semibold line-through text-slate-400 border-slate-200"
          >
            Refuted / Inactive
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getSourceIcon = (sourceType: string) => {
    if (sourceType.includes('utterance') || sourceType.includes('voice')) {
      return <Mic className="w-3.5 h-3.5 text-teal-600" />;
    }
    if (sourceType.includes('document') || sourceType.includes('scan')) {
      return <FileText className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (sourceType.includes('ehr') || sourceType.includes('hospital')) {
      return <History className="w-3.5 h-3.5 text-slate-600" />;
    }
    if (sourceType.includes('cuff') || sourceType.includes('device')) {
      return <Activity className="w-3.5 h-3.5 text-rose-600" />;
    }
    return <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />;
  };

  const getCitationForFact = (factId: string) => {
    return mockCitations.find((c) => c.fact_id === factId);
  };

  return (
    <Card className="shadow-sm border-slate-200" data-testid="clinical-context-ledger">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>Clinical Context Ledger</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({filteredFacts.length} {filteredFacts.length === 1 ? 'fact' : 'facts'})
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Immutable, provenance-tracked patient claims with source anchors and verification states
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="neutral" className="text-xs bg-slate-50 border-slate-200 text-slate-700">
              Encounter: <span className="font-mono text-slate-900 font-bold ml-1">{encounterId}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Input
              data-testid="ledger-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, values, or sources..."
              className="pl-9 h-10 text-xs w-full"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-4">
            <select
              data-testid="ledger-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 font-medium"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <select
              data-testid="ledger-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 font-medium"
            >
              {statuses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fact Cards / Table */}
        {isLoading ? (
          <div
            data-testid="ledger-loading-state"
            className="p-12 text-center text-slate-400 space-y-2"
          >
            <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold">Retrieving Clinical Context Ledger facts...</p>
          </div>
        ) : filteredFacts.length === 0 ? (
          <div
            data-testid="ledger-empty-state"
            className="p-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 space-y-2"
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No matching clinical facts found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your category, verification status, or search keywords.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="ledger-facts-list">
            {filteredFacts.map((fact) => {
              const citation = getCitationForFact(fact.id);
              const isUnverified = fact.status === 'extracted_unverified';
              const isConflicting = fact.status === 'conflicting';

              return (
                <div
                  key={fact.id}
                  data-testid={`ledger-fact-card-${fact.id}`}
                  className={`p-4 rounded-xl border bg-white shadow-subtle transition-all hover:shadow-sm ${
                    isConflicting
                      ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                      : isUnverified
                      ? 'border-blue-200 bg-blue-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar: Concept & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                        {fact.concept}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {fact.id}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusBadge(fact.status)}
                    </div>
                  </div>

                  {/* Fact Value */}
                  <div className="py-2.5">
                    <p className="text-base font-bold text-slate-900 leading-snug">
                      {fact.value}
                      {fact.unit && (
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          ({fact.unit})
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Provenance & Citation Metadata Footer */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    {/* Source Origin */}
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center font-medium text-slate-700">
                        {getSourceIcon(fact.source_type)}
                        <span className="ml-1 font-semibold">{fact.source_type}</span>
                      </span>

                      {fact.source_location && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{fact.source_location}</span>
                        </>
                      )}

                      {/* Clickable Source Document link */}
                      {fact.source_id.startsWith('doc_') && onSelectSourceDocument && (
                        <button
                          type="button"
                          onClick={() => onSelectSourceDocument(fact.source_id)}
                          data-testid={`view-source-doc-btn-${fact.id}`}
                          className="text-xs text-brand-600 hover:text-brand-800 underline font-semibold flex items-center ml-1"
                        >
                          <ExternalLink className="w-3 h-3 mr-0.5" />
                          View Document
                        </button>
                      )}
                    </div>

                    {/* Extraction & Confidence Metric */}
                    <div className="flex items-center space-x-3">
                      {fact.confidence !== null && (
                        <span
                          className={`font-semibold flex items-center ${
                            fact.confidence < 0.85
                              ? 'text-amber-700 font-bold'
                              : 'text-teal-700'
                          }`}
                        >
                          {fact.confidence < 0.85 && (
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                          )}
                          Confidence: {Math.round(fact.confidence * 100)}%
                        </span>
                      )}

                      {fact.reviewed_by && (
                        <span className="text-[11px] text-slate-500 flex items-center">
                          <UserCheck className="w-3 h-3 mr-1 text-teal-600" />
                          Reviewed by {fact.reviewed_by}
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(fact.recorded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Inline Citation Snippet if Available */}
                  {citation && (
                    <div
                      data-testid={`citation-callout-${fact.id}`}
                      className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start justify-between space-x-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-600 block text-[11px]">
                          Evidence Quote ({citation.source_title}):
                        </span>
                        <p className="italic text-slate-800 font-serif">
                          {citation.text_snippet}
                        </p>
                      </div>

                      {onSelectCitation && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCitation(fact.id)}
                          data-testid={`jump-citation-btn-${fact.id}`}
                          className="h-7 text-xs text-brand-600 hover:text-brand-800 shrink-0"
                        >
                          Inspect Quote
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
