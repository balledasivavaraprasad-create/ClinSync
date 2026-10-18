import React, { useState, useEffect, useCallback } from 'react';
import { SpecialtyRoutingBanner } from './SpecialtyRoutingBanner';
import { SlotSelector } from './SlotSelector';
import { AppointmentBookingModal } from './AppointmentBookingModal';
import { BookingConfirmationCard } from './BookingConfirmationCard';
import { mockApi } from '../../lib/api/mockAdapter';
import type {
  DecisionResultResponse,
  AppointmentSlot,
  BookingResponse,
} from '../../lib/api/types';
import { Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface AppointmentSchedulingHubProps {
  encounterId?: string;
  patientName?: string;
  onBookingConfirmed?: (booking: BookingResponse['data']) => void;
  onReturnHome?: () => void;
}

export const AppointmentSchedulingHub: React.FC<AppointmentSchedulingHubProps> = ({
  encounterId = 'enc_demo_001',
  patientName = 'Eleanor Johnson',
  onBookingConfirmed,
  onReturnHome,
}) => {
  // Routing Decision state
  const [decisionResult, setDecisionResult] = useState<
    DecisionResultResponse['data'] | null
  >(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(true);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [staffNotified, setStaffNotified] = useState<boolean>(false);

  // Department & Slot state
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('dept_cardiology');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-18');
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [isSlotsLoading, setIsSlotsLoading] = useState<boolean>(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  // Booking Modal & Transaction state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [slotConflictMessage, setSlotConflictMessage] = useState<string | null>(null);

  // Persisted Confirmed Booking state (only set when backend confirms!)
  const [confirmedBooking, setConfirmedBooking] = useState<
    BookingResponse['data'] | null
  >(null);

  // 1. Fetch Routing Decision
  const fetchRoutingDecision = useCallback(async () => {
    setIsRoutingLoading(true);
    setRoutingError(null);
    try {
      const res = await mockApi.reviewRouting(encounterId);
      setDecisionResult(res.data);
      if (res.data.recommended_department_id) {
        setSelectedDepartmentId(res.data.recommended_department_id);
      }
    } catch (err) {
      setRoutingError(
        err instanceof Error ? err.message : 'Failed to evaluate clinical routing'
      );
    } finally {
      setIsRoutingLoading(false);
    }
  }, [encounterId]);

  // 2. Fetch Available Slots for Department
  const fetchSlots = useCallback(
    async (deptId: string, preserveSelection = false) => {
      setIsSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await mockApi.getSlots(deptId);
        setSlots(res.data.slots);
        if (!preserveSelection) {
          setSelectedSlot(null);
          setSlotConflictMessage(null);
        }
      } catch (err) {
        setSlotsError(
          err instanceof Error ? err.message : 'Failed to retrieve available slots'
        );
      } finally {
        setIsSlotsLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchRoutingDecision();
  }, [fetchRoutingDecision]);

  useEffect(() => {
    fetchSlots(selectedDepartmentId);
  }, [selectedDepartmentId, fetchSlots]);

  // Handle department change
  const handleSelectDepartment = (deptId: string) => {
    setSelectedDepartmentId(deptId);
  };

  // Handle slot selection
  const handleSelectSlot = (slot: AppointmentSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setBookingError(null);
  };

  // Open booking modal
  const handleOpenBookingModal = () => {
    if (!selectedSlot) return;
    setBookingError(null);
    setIsModalOpen(true);
  };

  // Perform Atomic Booking transaction
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);
    setBookingError(null);

    // Generate unique idempotency key
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `idem_${crypto.randomUUID()}`
        : `idem_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const bookingRes = await mockApi.bookAppointment({
        slot_id: selectedSlot.slot_id,
        encounter_id: encounterId,
        idempotency_key: idempotencyKey,
      });

      // Strictly verify persisted confirmation
      if (bookingRes.data.status === 'CONFIRMED' && bookingRes.data.booking_id) {
        setConfirmedBooking(bookingRes.data);
        setIsModalOpen(false);
        if (onBookingConfirmed) {
          onBookingConfirmed(bookingRes.data);
        }
      } else {
        throw new Error('Server returned unconfirmed booking status.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Handle Stale Slot / 409 Conflict
      if (
        errorMsg.includes('SLOT_UNAVAILABLE') ||
        errorMsg.includes('IDEMPOTENCY_CONFLICT') ||
        errorMsg.includes('409')
      ) {
        const conflictAlert =
          'This appointment slot was just claimed by another patient or is no longer available. Please select another slot.';
        setBookingError(conflictAlert);
        setSlotConflictMessage(conflictAlert);
        // Refresh slot list without clearing conflict alert
        fetchSlots(selectedDepartmentId, true);
      } else {
        setBookingError(`Booking failed: ${errorMsg}`);
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Return to welcome / reset
  const handleReset = () => {
    setConfirmedBooking(null);
    setSelectedSlot(null);
    if (onReturnHome) {
      onReturnHome();
    }
  };

  // 1. If Booking is Confirmed and Persisted, render confirmation card
  if (confirmedBooking) {
    return (
      <div className="w-full py-6">
        <BookingConfirmationCard
          booking={confirmedBooking}
          patientName={patientName}
          encounterId={encounterId}
          onResetSession={handleReset}
        />
      </div>
    );
  }

  // Safety gate: Check if routine booking is blocked by triage policy
  const isRoutineBookingBlocked =
    decisionResult?.decision === 'URGENT_ESCALATION' ||
    decisionResult?.decision === 'HUMAN_REVIEW' ||
    decisionResult?.decision === 'UNABLE_TO_DETERMINE';

  return (
    <div
      data-testid="appointment-scheduling-hub"
      className="w-full max-w-4xl mx-auto space-y-6 py-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-teal-600" />
            Clinic Appointment Scheduling
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Synchronized with clinical intake for <strong>{patientName}</strong> (Encounter{' '}
            <code className="text-xs font-mono text-teal-800 bg-slate-100 px-1 py-0.5 rounded">
              {encounterId}
            </code>
            )
          </p>
        </div>
      </div>

      {/* 1. Clinical Routing & Policy Decision Banner */}
      <SpecialtyRoutingBanner
        decisionResult={decisionResult}
        isLoading={isRoutingLoading}
        onNotifyStaff={() => setStaffNotified(true)}
        staffNotified={staffNotified}
      />

      {routingError && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-center justify-between"
        >
          <div className="flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{routingError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoutingDecision}
            className="text-xs min-h-[44px]"
          >
            Retry Review
          </Button>
        </div>
      )}

      {/* 2. Slot Selection Section - Strictly guarded if routing is blocked */}
      {isRoutineBookingBlocked ? (
        <div
          data-testid="booking-blocked-notice"
          className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Direct Slot Scheduling Currently Held
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Per clinical safety requirements, direct self-service slot booking is restricted while
            clinical review or high-acuity evaluation is in progress. Please review the notice above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {slotsError ? (
            <div
              role="alert"
              className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-900 text-center space-y-3"
            >
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h3 className="text-sm font-bold">Failed to Load Available Slots</h3>
              <p className="text-xs text-red-700">{slotsError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSlots(selectedDepartmentId)}
                className="min-h-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry Fetching Slots
              </Button>
            </div>
          ) : (
            <SlotSelector
              slots={slots}
              selectedSlotId={selectedSlot?.slot_id || null}
              onSelectSlot={handleSelectSlot}
              selectedDepartmentId={selectedDepartmentId}
              onSelectDepartment={handleSelectDepartment}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              isLoading={isSlotsLoading}
              conflictMessage={slotConflictMessage}
              onRefreshSlots={() => fetchSlots(selectedDepartmentId)}
            />
          )}

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-2xl border">
            <div>
              <span className="text-xs text-slate-500 block">Selected Consultation:</span>
              <span className="text-sm font-bold text-slate-900">
                {selectedSlot
                  ? `${selectedSlot.doctor_name} (${new Date(selectedSlot.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  : 'No slot selected'}
              </span>
            </div>

            <Button
              variant="primary"
              size="lg"
              disabled={!selectedSlot || !selectedSlot.available || isSlotsLoading}
              onClick={handleOpenBookingModal}
              data-testid="btn-proceed-to-book"
              className="w-full sm:w-auto min-h-[48px] px-8 text-sm font-bold"
            >
              Proceed to Confirm Booking
            </Button>
          </div>
        </div>
      )}

      {/* 3. Confirmation Dialog */}
      <AppointmentBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        slot={selectedSlot}
        patientName={patientName}
        encounterId={encounterId}
        onConfirmBooking={handleConfirmBooking}
        isBooking={isBooking}
        bookingError={bookingError}
      />
    </div>
  );
};
