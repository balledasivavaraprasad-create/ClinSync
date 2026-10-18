import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpecialtyRoutingBanner } from '../features/appointments/SpecialtyRoutingBanner';
import { SlotSelector } from '../features/appointments/SlotSelector';
import { AppointmentBookingModal } from '../features/appointments/AppointmentBookingModal';
import { BookingConfirmationCard } from '../features/appointments/BookingConfirmationCard';
import { AppointmentSchedulingHub } from '../features/appointments/AppointmentSchedulingHub';
import { PatientKioskFlow } from '../features/patient-kiosk/PatientKioskFlow';
import { mockApi } from '../lib/api/mockAdapter';
import { mockSlots, mockDepartments } from '../lib/api/mockData';
import type { DecisionResultResponse, BookingResponse } from '../lib/api/types';

describe('TASK-P1-401: Appointment and Scheduling UI Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. SpecialtyRoutingBanner Component', () => {
    it('renders loading placeholder while routing evaluation is in-flight', () => {
      render(<SpecialtyRoutingBanner isLoading={true} />);
      expect(screen.getByTestId('routing-banner-loading')).toBeInTheDocument();
    });

    it('renders ROUTINE_SCHEDULING banner with recommended specialty and reason codes', () => {
      const routineData: DecisionResultResponse['data'] = {
        encounter_id: 'enc_demo_001',
        decision: 'ROUTINE_SCHEDULING',
        reason_codes: ['CARDIOLOGY_SYMPTOM_MATCH', 'NO_UNSTABLE_VITALS'],
        recommended_department_id: 'dept_cardiology',
        policy_version: '2026.10-demo-policy-v1',
        evaluated_at: '2026-10-18T10:00:00Z',
      };

      render(<SpecialtyRoutingBanner decisionResult={routineData} />);
      expect(screen.getByTestId('routing-routine-banner')).toBeInTheDocument();
      expect(screen.getByText(/Routine Booking Approved/i)).toBeInTheDocument();
      expect(screen.getByText('CARDIOLOGY_SYMPTOM_MATCH')).toBeInTheDocument();
      expect(screen.getByText('NO_UNSTABLE_VITALS')).toBeInTheDocument();
      expect(screen.getByText(/Recommended: CARDIOLOGY/i)).toBeInTheDocument();
    });

    it('renders HUMAN_REVIEW banner distinctly and notifies triage staff on click', () => {
      const reviewData: DecisionResultResponse['data'] = {
        encounter_id: 'enc_review_001',
        decision: 'HUMAN_REVIEW',
        reason_codes: ['MEDICATION_RECONCILIATION_REQUIRED', 'AMBIGUOUS_ONSET'],
        recommended_department_id: 'dept_internal_med',
        policy_version: '2026.10-demo-policy-v1',
        evaluated_at: '2026-10-18T10:00:00Z',
      };

      const handleNotify = vi.fn();
      const { rerender } = render(
        <SpecialtyRoutingBanner
          decisionResult={reviewData}
          onNotifyStaff={handleNotify}
          staffNotified={false}
        />
      );

      expect(screen.getByTestId('routing-review-banner')).toBeInTheDocument();
      expect(screen.getByText(/Clinical Specialist Review in Progress/i)).toBeInTheDocument();
      expect(screen.getByText('MEDICATION_RECONCILIATION_REQUIRED')).toBeInTheDocument();

      const notifyBtn = screen.getByTestId('btn-notify-triage');
      fireEvent.click(notifyBtn);
      expect(handleNotify).toHaveBeenCalledTimes(1);

      rerender(
        <SpecialtyRoutingBanner
          decisionResult={reviewData}
          onNotifyStaff={handleNotify}
          staffNotified={true}
        />
      );
      expect(screen.getByText(/Clinician Notified/i)).toBeInTheDocument();
    });

    it('renders URGENT_ESCALATION banner with high-priority safety styling and red-flag codes', () => {
      const urgentData: DecisionResultResponse['data'] = {
        encounter_id: 'enc_urgent_001',
        decision: 'URGENT_ESCALATION',
        reason_codes: ['CHEST_PAIN_RED_FLAG', 'HIGH_ACUITY_VITALS'],
        recommended_department_id: null,
        policy_version: '2026.10-demo-policy-v1',
        evaluated_at: '2026-10-18T10:00:00Z',
      };

      render(<SpecialtyRoutingBanner decisionResult={urgentData} />);
      expect(screen.getByTestId('routing-escalation-banner')).toBeInTheDocument();
      expect(screen.getByText(/High Acuity Alert/i)).toBeInTheDocument();
      expect(screen.getByText(/Immediate Clinical Evaluation Recommended/i)).toBeInTheDocument();
      expect(screen.getByText('CHEST_PAIN_RED_FLAG')).toBeInTheDocument();
    });

    it('renders UNABLE_TO_DETERMINE banner guiding to reception', () => {
      const undeterminedData: DecisionResultResponse['data'] = {
        encounter_id: 'enc_undetermined_001',
        decision: 'UNABLE_TO_DETERMINE',
        reason_codes: ['UNMAPPED_SYMPTOMS'],
        recommended_department_id: null,
        policy_version: '2026.10-demo-policy-v1',
        evaluated_at: '2026-10-18T10:00:00Z',
      };

      render(<SpecialtyRoutingBanner decisionResult={undeterminedData} />);
      expect(screen.getByTestId('routing-undetermined-banner')).toBeInTheDocument();
      expect(screen.getByText(/Reception Assistance Recommended/i)).toBeInTheDocument();
    });
  });

  describe('2. SlotSelector Component', () => {
    it('renders available slots and marks unavailable slots as non-interactive', () => {
      const handleSelectSlot = vi.fn();
      render(
        <SlotSelector
          slots={mockSlots}
          selectedSlotId={null}
          onSelectSlot={handleSelectSlot}
          selectedDepartmentId="dept_cardiology"
          onSelectDepartment={vi.fn()}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
        />
      );

      // Available slots are rendered with radio role and clickable
      const slotCard = screen.getByTestId('slot-card-slot_cardio_101');
      expect(slotCard).toBeInTheDocument();
      expect(slotCard).toHaveAttribute('role', 'radio');
      expect(slotCard).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(slotCard);
      expect(handleSelectSlot).toHaveBeenCalledWith(
        expect.objectContaining({ slot_id: 'slot_cardio_101' })
      );

      // Seeded unavailable slot is disabled
      const unavailableCard = screen.getByTestId('slot-card-unavailable-slot_internal_201');
      expect(unavailableCard).toBeInTheDocument();
      expect(unavailableCard).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports keyboard navigation via Enter and Space keys', () => {
      const handleSelectSlot = vi.fn();
      render(
        <SlotSelector
          slots={mockSlots}
          selectedSlotId={null}
          onSelectSlot={handleSelectSlot}
          selectedDepartmentId="dept_cardiology"
          onSelectDepartment={vi.fn()}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
        />
      );

      const slotCard = screen.getByTestId('slot-card-slot_cardio_101');
      fireEvent.keyDown(slotCard, { key: 'Enter' });
      expect(handleSelectSlot).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(slotCard, { key: ' ' });
      expect(handleSelectSlot).toHaveBeenCalledTimes(2);
    });

    it('handles specialty department switching', () => {
      const handleSelectDept = vi.fn();
      render(
        <SlotSelector
          slots={mockSlots}
          selectedSlotId={null}
          onSelectSlot={vi.fn()}
          selectedDepartmentId="dept_cardiology"
          onSelectDepartment={handleSelectDept}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
          departments={mockDepartments}
        />
      );

      const internalMedTab = screen.getByTestId('dept-tab-dept_internal_med');
      fireEvent.click(internalMedTab);
      expect(handleSelectDept).toHaveBeenCalledWith('dept_internal_med');
    });

    it('renders empty state when no available slots are found', () => {
      render(
        <SlotSelector
          slots={[]}
          selectedSlotId={null}
          onSelectSlot={vi.fn()}
          selectedDepartmentId="dept_empty"
          onSelectDepartment={vi.fn()}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
        />
      );

      expect(screen.getByTestId('no-slots-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/No Available Slots Found/i)).toBeInTheDocument();
    });

    it('displays slot conflict alert when conflictMessage is provided', () => {
      const handleRefresh = vi.fn();
      render(
        <SlotSelector
          slots={mockSlots}
          selectedSlotId={null}
          onSelectSlot={vi.fn()}
          selectedDepartmentId="dept_cardiology"
          onSelectDepartment={vi.fn()}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
          conflictMessage="This slot was just claimed by another patient."
          onRefreshSlots={handleRefresh}
        />
      );

      expect(screen.getByTestId('slot-conflict-alert')).toBeInTheDocument();
      expect(screen.getByText(/This slot was just claimed by another patient./i)).toBeInTheDocument();

      const resolveBtn = screen.getByTestId('btn-resolve-conflict-refresh');
      fireEvent.click(resolveBtn);
      expect(handleRefresh).toHaveBeenCalled();
    });
  });

  describe('3. AppointmentBookingModal Component', () => {
    it('renders modal with physician, department, date and formatted time', () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={vi.fn()}
          slot={mockSlots[0]}
          patientName="Eleanor Johnson"
          encounterId="enc_demo_001"
          onConfirmBooking={vi.fn()}
          isBooking={false}
          bookingError={null}
        />
      );

      expect(screen.getByTestId('booking-confirmation-modal')).toBeInTheDocument();
      expect(screen.getByText('Dr. Clara Chen, MD (Cardiology)')).toBeInTheDocument();
      expect(screen.getByText('Cardiology & Chest Pain Center')).toBeInTheDocument();
      expect(screen.getByText('Eleanor Johnson')).toBeInTheDocument();
      expect(screen.getByText('enc_demo_001')).toBeInTheDocument();
    });

    it('disables action buttons and shows spinner when isBooking is true', () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={vi.fn()}
          slot={mockSlots[0]}
          patientName="Eleanor Johnson"
          encounterId="enc_demo_001"
          onConfirmBooking={vi.fn()}
          isBooking={true}
          bookingError={null}
        />
      );

      expect(screen.getByText(/Securing Slot.../i)).toBeInTheDocument();
      expect(screen.getByTestId('btn-confirm-booking-modal')).toBeDisabled();
      expect(screen.getByTestId('btn-cancel-booking-modal')).toBeDisabled();
    });

    it('displays booking transaction failure alert when bookingError is present', () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={vi.fn()}
          slot={mockSlots[0]}
          patientName="Eleanor Johnson"
          encounterId="enc_demo_001"
          onConfirmBooking={vi.fn()}
          isBooking={false}
          bookingError="SLOT_UNAVAILABLE: Slot has been booked concurrently."
        />
      );

      expect(screen.getByTestId('booking-modal-error')).toBeInTheDocument();
      expect(
        screen.getByText(/SLOT_UNAVAILABLE: Slot has been booked concurrently./i)
      ).toBeInTheDocument();
    });
  });

  describe('4. BookingConfirmationCard Component', () => {
    it('renders persisted booking success details with booking ID and QR pass', () => {
      const confirmedBooking: BookingResponse['data'] = {
        booking_id: 'bkg_persist_9981',
        slot: mockSlots[0],
        confirmed_at: '2026-10-18T10:05:00Z',
        status: 'CONFIRMED',
      };

      const handleReset = vi.fn();
      const handlePrint = vi.fn();

      render(
        <BookingConfirmationCard
          booking={confirmedBooking}
          patientName="Eleanor Johnson"
          encounterId="enc_demo_001"
          onResetSession={handleReset}
          onPrint={handlePrint}
        />
      );

      expect(screen.getByTestId('booking-confirmation-container')).toBeInTheDocument();
      expect(screen.getByTestId('confirmed-booking-id')).toHaveTextContent('bkg_persist_9981');
      expect(screen.getByText(/Appointment Confirmed!/i)).toBeInTheDocument();
      expect(screen.getByText(/Persisted in Hospital Registry/i)).toBeInTheDocument();
      expect(screen.getByText('Dr. Clara Chen, MD (Cardiology)')).toBeInTheDocument();

      const printBtn = screen.getByTestId('btn-print-confirmation');
      fireEvent.click(printBtn);
      expect(handlePrint).toHaveBeenCalled();

      const finishBtn = screen.getByTestId('btn-finish-kiosk');
      fireEvent.click(finishBtn);
      expect(handleReset).toHaveBeenCalled();
    });
  });

  describe('5. AppointmentSchedulingHub Full Integration', () => {
    it('orchestrates routing fetch, slot selection, and atomic booking persistence', async () => {
      const handleBookingConfirmed = vi.fn();

      render(
        <AppointmentSchedulingHub
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          onBookingConfirmed={handleBookingConfirmed}
        />
      );

      // Wait for routing review to resolve
      await waitFor(() => {
        expect(screen.getByTestId('routing-routine-banner')).toBeInTheDocument();
      });

      // Wait for slots to load
      await waitFor(() => {
        expect(screen.getByTestId('slot-card-slot_cardio_101')).toBeInTheDocument();
      });

      // Select available slot
      const slotCard = screen.getByTestId('slot-card-slot_cardio_101');
      fireEvent.click(slotCard);

      // Proceed to book button should now be enabled
      const proceedBtn = screen.getByTestId('btn-proceed-to-book');
      expect(proceedBtn).not.toBeDisabled();
      fireEvent.click(proceedBtn);

      // Confirmation modal opens
      expect(screen.getByTestId('booking-confirmation-modal')).toBeInTheDocument();

      // Click Confirm & Book Slot
      const confirmBtn = screen.getByTestId('btn-confirm-booking-modal');
      fireEvent.click(confirmBtn);

      // Persisted Booking Confirmation Card appears with booking ID
      await waitFor(() => {
        expect(screen.getByTestId('booking-confirmation-container')).toBeInTheDocument();
        expect(screen.getByTestId('confirmed-booking-id')).toBeInTheDocument();
      });

      expect(handleBookingConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' })
      );
    });

    it('strictly guards and blocks routine slot booking when routing is URGENT_ESCALATION', async () => {
      render(
        <AppointmentSchedulingHub
          encounterId="enc_urgent_escalate_01"
          patientName="Eleanor Johnson"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('routing-escalation-banner')).toBeInTheDocument();
      });

      // Direct booking is blocked by safety policy
      expect(screen.getByTestId('booking-blocked-notice')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-proceed-to-book')).not.toBeInTheDocument();
    });

    it('strictly guards and blocks routine slot booking when routing is HUMAN_REVIEW', async () => {
      render(
        <AppointmentSchedulingHub
          encounterId="enc_conflict_review_01"
          patientName="Eleanor Johnson"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('routing-review-banner')).toBeInTheDocument();
      });

      // Direct booking is blocked by safety policy
      expect(screen.getByTestId('booking-blocked-notice')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-proceed-to-book')).not.toBeInTheDocument();
    });

    it('handles simulated slot conflict (409) with recovery alert and refreshed slots', async () => {
      // Spy on bookAppointment to simulate SLOT_UNAVAILABLE conflict
      vi.spyOn(mockApi, 'bookAppointment').mockRejectedValueOnce(
        new Error('SLOT_UNAVAILABLE')
      );

      render(
        <AppointmentSchedulingHub
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('slot-card-slot_cardio_101')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('slot-card-slot_cardio_101'));
      fireEvent.click(screen.getByTestId('btn-proceed-to-book'));

      // Confirm in modal
      fireEvent.click(screen.getByTestId('btn-confirm-booking-modal'));

      // Conflict error alert should be shown in modal
      await waitFor(() => {
        expect(screen.getByTestId('booking-modal-error')).toBeInTheDocument();
      });

      expect(
        screen.getAllByText(
          /This appointment slot was just claimed by another patient/i
        ).length
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('6. PatientKioskFlow Integration', () => {
    it('progresses from intake summary to appointment scheduling step', async () => {
      render(<PatientKioskFlow initialStep="summary" />);

      expect(screen.getByTestId('intake-summary-container')).toBeInTheDocument();
      const bookApptBtn = screen.getByTestId('proceed-to-scheduling-btn');
      fireEvent.click(bookApptBtn);

      await waitFor(() => {
        expect(screen.getByTestId('kiosk-scheduling-step')).toBeInTheDocument();
        expect(screen.getByTestId('appointment-scheduling-hub')).toBeInTheDocument();
      });
    });

    it('progresses from document upload to appointment scheduling step', async () => {
      render(<PatientKioskFlow initialStep="documents" />);

      expect(screen.getByTestId('kiosk-documents-step')).toBeInTheDocument();
      const proceedBtn = screen.getByTestId('proceed-to-scheduling-from-docs-btn');
      fireEvent.click(proceedBtn);

      await waitFor(() => {
        expect(screen.getByTestId('kiosk-scheduling-step')).toBeInTheDocument();
        expect(screen.getByTestId('appointment-scheduling-hub')).toBeInTheDocument();
      });
    });
  });
});
