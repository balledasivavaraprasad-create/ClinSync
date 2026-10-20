import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { DoctorQueueItem } from '../../lib/api/types';
import { useTheme } from '../../lib/theme';
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
  const { isLight } = useTheme();
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
          <Badge variant="neutral" size="sm" className="text-slate-300 bg-white/5 border border-white/10">
            Routine
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: DoctorQueueItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Signed Off
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-2 py-0.5 rounded-full">
            Active Now
          </span>
        );
      case 'PENDING_REVIEW':
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Pending Review
          </span>
        );
    }
  };

  return (
    <Card className="shadow-xl border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl" data-testid="doctor-queue-list">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center space-x-2">
                <span>Patients</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {queue.length}
                </span>
              </CardTitle>
              <p className="text-xs text-slate-400">
                <span>Patient Triage Queue</span> • Assigned Cases
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
              className="text-xs h-8 px-2 text-slate-300 border-white/10 hover:bg-white/5"
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
              className="pl-8 text-xs h-9 w-full border-white/10 bg-[#050811] text-white placeholder-slate-500 focus:border-cyan-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1" />
            {(['all', 'URGENT', 'ELEVATED', 'ROUTINE'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                data-testid={`filter-priority-${p}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  priorityFilter === p
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
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
              <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : filteredQueue.length === 0 ? (
          <div
            data-testid="queue-empty-state"
            className="p-6 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02] text-slate-400 text-xs"
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
                      ? isLight
                        ? 'border-cyan-600 bg-gradient-to-b from-cyan-50 via-cyan-100/50 to-white shadow-md shadow-cyan-600/15 ring-2 ring-cyan-500/30 text-slate-900'
                        : 'border-cyan-400/80 bg-gradient-to-b from-cyan-950/60 via-cyan-900/40 to-slate-950/60 shadow-[0_0_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400/40 text-white'
                      : isLight
                        ? 'border-[#d4e0ed] bg-gradient-to-b from-white/98 via-[#f4f8fc]/92 to-[#edf3fa]/88 text-slate-900 hover:border-cyan-400 hover:from-white hover:to-[#f0f6fd] shadow-sm'
                        : 'border-white/[0.08] bg-gradient-to-b from-[#0e162a]/80 via-[#0a1020]/75 to-[#060a14]/80 text-slate-200 hover:border-cyan-500/40 hover:from-[#121c35] hover:to-[#0a1020]'
                  }`}
                >
                  {/* Top line: Name & Priority */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className={`font-extrabold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {item.patient_name}
                      </h4>
                      <p className={`text-[11px] flex items-center space-x-1.5 mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <Clock className={`w-3 h-3 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                        <span>{item.appointment_time}</span>
                        <span>•</span>
                        <span className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
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
                  <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                    {item.triage_note}
                  </p>

                  {/* Active selection arrow */}
                  {isSelected && (
                    <div className={`mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold ${
                      isLight ? 'border-cyan-200 text-cyan-800' : 'border-cyan-500/30 text-cyan-300'
                    }`}>
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
