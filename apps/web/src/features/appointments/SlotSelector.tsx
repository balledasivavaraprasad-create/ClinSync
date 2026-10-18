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
      {/* 1. Specialty / Department Selection */}
      <div className="space-y-2">
        <label
          htmlFor="specialty-tabs"
          className="text-xs font-bold uppercase tracking-wider text-slate-500 block"
        >
          Select Medical Specialty
        </label>
        <div
          id="specialty-tabs"
          role="tablist"
          aria-label="Medical specialties"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
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
                className={`p-3.5 rounded-xl border text-left transition-all min-h-[56px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/80 text-teal-950 shadow-sm ring-1 ring-teal-500'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm leading-tight">{dept.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {dept.description}
                </p>
                <div className="flex items-center text-[11px] text-slate-400 mt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Est. wait: {dept.wait_time_minutes}m</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Date Filter Selection */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[44px] ${
                selectedDate === dateStr
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
              className="text-xs text-slate-600 min-h-[44px]"
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
          className="p-4 rounded-xl border-2 border-amber-400 bg-amber-50 text-amber-950 flex items-start space-x-3 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-950">Slot Availability Conflict</h3>
            <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-teal-600" />
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
                className="h-28 rounded-xl border border-slate-200 bg-slate-50 animate-pulse p-4"
              />
            ))}
          </div>
        ) : availableSlots.length === 0 ? (
          /* Empty State: No available slots returned by backend */
          <Card
            data-testid="no-slots-empty-state"
            className="border-dashed border-slate-300 bg-slate-50/60 p-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <CardHeader className="p-0 pb-1">
              <CardTitle className="text-base font-bold text-slate-800">
                No Available Slots Found
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-xs text-slate-500 max-w-sm mx-auto">
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
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none min-h-[96px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/90 shadow-md ring-2 ring-teal-500'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-extrabold text-slate-900 tracking-tight">
                          {startTime} – {endTime}
                        </span>
                        <Badge variant="success" size="sm">
                          Available
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-slate-600 mt-2 space-x-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{slot.doctor_name}</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 mt-1 space-x-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{slot.department_name}</span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white'
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
                  className="p-4 rounded-xl border border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed select-none min-h-[96px]"
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
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{slot.doctor_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
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
