import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { DoctorQueueItem } from '../../lib/api/types';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface DoctorQueueListProps {
  queue: DoctorQueueItem[];
  selectedEncounterId: string;
  onSelectPatient: (item: DoctorQueueItem) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const DoctorQueueList: React.FC<DoctorQueueListProps> = ({
  queue,
  selectedEncounterId,
  onSelectPatient,
  isLoading = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.patient_name.toLowerCase().includes(q) ||
          item.encounter_id.toLowerCase().includes(q) ||
          item.triage_note.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [queue, priorityFilter, searchQuery]);

  const getPriorityBadge = (priority: DoctorQueueItem['priority']) => {
    switch (priority) {
      case 'URGENT':
        return (
          <Badge variant="error" size="sm" className="font-extrabold uppercase animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Urgent
          </Badge>
        );
      case 'ELEVATED':
        return (
          <Badge variant="warning" size="sm" className="font-bold uppercase">
            Elevated
          </Badge>
        );
      case 'ROUTINE':
      default:
        return (
          <Badge variant="neutral" size="sm" className="text-slate-600">
            Routine
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: DoctorQueueItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Signed Off
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
            Active Now
          </span>
        );
      case 'PENDING_REVIEW':
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Pending Review
          </span>
        );
    }
  };

  return (
    <Card className="shadow-sm border-slate-200" data-testid="doctor-queue-list">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Patient Triage Queue
              </CardTitle>
              <p className="text-xs text-slate-500">
                {queue.length} scheduled consultations today
              </p>
            </div>
          </div>

          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              data-testid="refresh-queue-btn"
              className="text-xs h-8 px-2 text-slate-600"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Search & Filter Bar */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              data-testid="queue-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient or triage note..."
              className="pl-8 text-xs h-9 w-full"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            {(['all', 'URGENT', 'ELEVATED', 'ROUTINE'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                data-testid={`filter-priority-${p}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  priorityFilter === p
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'All Priorities' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Queue Cards */}
        {isLoading ? (
          <div className="space-y-2.5 py-4" data-testid="queue-loading-state">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredQueue.length === 0 ? (
          <div
            data-testid="queue-empty-state"
            className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs"
          >
            No patients match the search or priority filter.
          </div>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-0.5" role="list">
            {filteredQueue.map((item) => {
              const isSelected = item.encounter_id === selectedEncounterId;

              return (
                <div
                  key={item.encounter_id}
                  role="listitem"
                  data-testid={`queue-item-${item.encounter_id}`}
                  onClick={() => onSelectPatient(item)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-brand-600 bg-teal-50/80 shadow-sm ring-2 ring-brand-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-subtle'
                  }`}
                >
                  {/* Top line: Name & Priority */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                        {item.patient_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.appointment_time}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.encounter_id}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      {getPriorityBadge(item.priority)}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Triage Note Snippet */}
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {item.triage_note}
                  </p>

                  {/* Active selection arrow */}
                  {isSelected && (
                    <div className="mt-2 pt-1.5 border-t border-teal-200/80 flex items-center justify-between text-[11px] font-bold text-teal-800">
                      <span>Currently Active in Console</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
