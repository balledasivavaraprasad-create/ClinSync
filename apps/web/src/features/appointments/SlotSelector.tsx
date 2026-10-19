import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AppointmentSlot } from '../../lib/api/types';
import { mockDepartments, type SpecialtyDepartment } from '../../lib/api/mockData';
import { useTheme } from '../../lib/theme';

interface SlotSelectorProps {
  slots: AppointmentSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: AppointmentSlot) => void;
  selectedDepartmentId: string;
  onSelectDepartment: (deptId: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
  conflictMessage?: string | null;
  onRefreshSlots?: () => void;
  departments?: SpecialtyDepartment[];
}

export const SlotSelector: React.FC<SlotSelectorProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  selectedDepartmentId,
  onSelectDepartment,
  selectedDate,
  onSelectDate,
  isLoading = false,
  conflictMessage = null,
  onRefreshSlots,
  departments = mockDepartments,
}) => {
  const { isLight } = useTheme();
  // Available slots returned strictly by backend availability (supports available boolean or status enum)
  const isSlotAvailable = (slot: AppointmentSlot) => {
    if (slot.status) {
      return slot.status === 'AVAILABLE';
    }
    return Boolean(slot.available);
  };

  const availableSlots = slots.filter(isSlotAvailable);
  const unavailableSlots = slots.filter((slot) => !isSlotAvailable(slot));

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full space-y-6" data-testid="slot-selector-container">
      {/* 1. Automated Assigned Medical Specialty Direction (No patient selection required) */}
      {(() => {
        const assignedDept =
          departments.find((d) => d.id === selectedDepartmentId) ||
          departments[0] || {
            id: 'dept_cardiology',
            name: 'Cardiology & Chest Pain Center',
            description: 'Specialized heart, rhythm, and cardiovascular evaluation',
            wait_time_minutes: 15,
          };

        return (
          <div
            data-testid="assigned-specialty-card"
            className={`p-5 rounded-2xl border transition-all ${
              isLight
                ? 'bg-gradient-to-r from-teal-50 via-cyan-50 to-indigo-50 border-cyan-300 text-slate-900 shadow-sm'
                : 'bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border-cyan-500/30 text-white shadow-xl'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 font-bold">
                    Assigned Medical Destination
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Direct Triage Redirection
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
                  <span>{assignedDept.name}</span>
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'} max-w-xl leading-relaxed`}>
                  Based on your reported clinical symptoms, our intelligent triage engine has automatically directed your care to{' '}
                  <strong className="text-cyan-300">{assignedDept.name}</strong>. No complex specialty selection required—simply choose your preferred appointment time below.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className={`p-3 rounded-xl border text-center ${isLight ? 'bg-white border-slate-200' : 'bg-black/40 border-white/10'}`}>
                  <div className="flex items-center justify-center space-x-1 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Est. Wait</span>
                  </div>
                  <span className="text-base font-bold font-mono text-cyan-300">
                    {assignedDept.wait_time_minutes} min
                  </span>
                </div>
              </div>
            </div>

            {/* Clinician / Staff Override Accordion (For staff triage override & contract compatibility) */}
            <details className="mt-3 pt-3 border-t border-white/5 group">
              <summary className="text-[11px] text-slate-400 hover:text-cyan-300 cursor-pointer font-mono select-none transition-colors">
                Staff / Clinician Override: Reassign Department
              </summary>
              <div
                id="specialty-tabs"
                role="tablist"
                aria-label="Medical specialties"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2.5"
              >
                {departments.map((dept) => {
                  const isSelected = dept.id === selectedDepartmentId;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      data-testid={`dept-tab-${dept.id}`}
                      onClick={() => onSelectDepartment(dept.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all min-h-[48px] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 cursor-pointer text-xs ${
                        isSelected
                          ? isLight
                            ? 'border-cyan-600 bg-cyan-50/95 text-slate-900 shadow-sm'
                            : 'border-cyan-400/80 bg-cyan-500/20 text-white shadow-sm ring-1 ring-cyan-400/40'
                          : isLight
                            ? 'border-slate-200 bg-white/95 text-slate-900 hover:border-cyan-400'
                            : 'border-white/[0.08] bg-[#0a0f1d]/80 text-slate-200 hover:border-cyan-500/40 hover:bg-[#0e1629]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold leading-tight">{dept.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-cyan-400" />}
                      </div>
                      <p className="text-[11px] mt-0.5 line-clamp-1 text-slate-400">
                        {dept.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
        );
      })()}

      {/* 2. Date Filter Selection */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Appointment Date
          </span>
        </div>
        <div className="flex items-center space-x-2" role="group" aria-label="Appointment date selector">
          {['2026-10-18', '2026-10-19'].map((dateStr) => (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              data-testid={`date-filter-${dateStr}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px] cursor-pointer ${
                selectedDate === dateStr
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {dateStr === '2026-10-18' ? 'Today (Oct 18)' : 'Tomorrow (Oct 19)'}
            </button>
          ))}

          {onRefreshSlots && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshSlots}
              disabled={isLoading}
              title="Refresh slot availability from server"
              data-testid="btn-refresh-slots"
              className="text-xs text-slate-300 border-white/10 hover:bg-white/5 min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* 3. Conflict / Stale Slot Banner */}
      {conflictMessage && (
        <div
          role="alert"
          data-testid="slot-conflict-alert"
          className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start space-x-3 shadow-sm backdrop-blur-md"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-300">Slot Availability Conflict</h3>
            <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
              {conflictMessage}
            </p>
          </div>
          {onRefreshSlots && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshSlots}
              data-testid="btn-resolve-conflict-refresh"
              className="text-xs shrink-0 min-h-[44px]"
            >
              Update Availability
            </Button>
          )}
        </div>
      )}

      {/* 4. Slot Selection Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-cyan-400" />
            Available Consultation Slots
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {availableSlots.length} available • {unavailableSlots.length} booked/held
          </span>
        </div>

        {isLoading ? (
          <div
            data-testid="slots-loading-indicator"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse p-4"
              />
            ))}
          </div>
        ) : availableSlots.length === 0 ? (
          /* Empty State: No available slots returned by backend */
          <Card
            data-testid="no-slots-empty-state"
            className="border-dashed border-white/10 bg-[#0a0f1d]/60 p-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <CardHeader className="p-0 pb-1 border-none">
              <CardTitle className="text-base font-bold text-white">
                No Available Slots Found
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs text-slate-400 max-w-sm mx-auto">
              There are no available appointment slots returned for this specialty on the selected date. Please check another specialty or speak with the reception desk.
            </CardContent>
          </Card>
        ) : (
          <div
            role="radiogroup"
            aria-label="Available appointment time slots"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {/* Render Available Slots first */}
            {availableSlots.map((slot) => {
              const isSelected = slot.slot_id === selectedSlotId;
              const startTime = formatSlotTime(slot.start_at);
              const endTime = formatSlotTime(slot.end_at);

              return (
                <div
                  key={slot.slot_id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  data-testid={`slot-card-${slot.slot_id}`}
                  onClick={() => onSelectSlot(slot)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onSelectSlot(slot);
                    }
                  }}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none min-h-[96px] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 ${
                    isSelected
                      ? isLight
                        ? 'border-cyan-600 bg-gradient-to-b from-cyan-50 via-cyan-100/50 to-white shadow-md shadow-cyan-600/15 ring-2 ring-cyan-500/30 text-slate-900'
                        : 'border-cyan-400 bg-gradient-to-b from-cyan-950/60 via-cyan-900/40 to-slate-950/60 shadow-[0_0_25px_rgba(6,182,212,0.22)] ring-1 ring-cyan-400 text-white'
                      : isLight
                        ? 'border-[#d4e0ed] bg-gradient-to-b from-white/98 via-[#f4f8fc]/92 to-[#edf3fa]/88 hover:border-cyan-400 hover:from-white hover:to-[#f0f6fd] text-slate-900 shadow-sm hover:shadow-md'
                        : 'border-white/[0.08] bg-gradient-to-b from-[#0e162a]/80 via-[#0a1020]/75 to-[#060a14]/80 hover:border-cyan-500/50 hover:from-[#121c35] hover:to-[#0a1020] text-slate-200 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-base font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {startTime} – {endTime}
                        </span>
                        <Badge variant="success" size="sm">
                          Available
                        </Badge>
                      </div>
                      <div className={`flex items-center text-xs mt-2 space-x-1.5 font-medium ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        <User className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`} />
                        <span>{slot.doctor_name}</span>
                      </div>
                      <div className={`flex items-center text-xs mt-1 space-x-1.5 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        <Stethoscope className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{slot.department_name}</span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold'
                          : 'border-white/20 bg-white/5 text-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Render Seeded Unavailable / Booked Slots as strictly non-interactive with clear label */}
            {unavailableSlots.map((slot) => {
              const startTime = formatSlotTime(slot.start_at);
              const endTime = formatSlotTime(slot.end_at);

              return (
                <div
                  key={slot.slot_id}
                  aria-disabled="true"
                  data-testid={`slot-card-unavailable-${slot.slot_id}`}
                  className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] opacity-40 cursor-not-allowed select-none min-h-[96px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-500 line-through">
                          {startTime} – {endTime}
                        </span>
                        <Badge variant="neutral" size="sm">
                          Booked / Unavailable
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mt-2 space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{slot.doctor_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Slot reserved by concurrent patient intake
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
