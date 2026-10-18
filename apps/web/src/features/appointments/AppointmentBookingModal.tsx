import React from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { AppointmentSlot } from '../../lib/api/types';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: AppointmentSlot | null;
  patientName: string;
  encounterId: string;
  onConfirmBooking: () => Promise<void>;
  isBooking: boolean;
  bookingError: string | null;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  slot,
  patientName,
  encounterId,
  onConfirmBooking,
  isBooking,
  bookingError,
}) => {
  if (!slot) return null;

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatSlotDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={isBooking ? () => {} : onClose}
      title="Confirm Appointment Booking"
      description="Review your consultation details before finalizing your clinic reservation."
      className="max-w-lg"
    >
      <div className="space-y-4 pt-2" data-testid="booking-confirmation-modal">
        {/* Error notification if booking failed / conflict */}
        {bookingError && (
          <div
            role="alert"
            data-testid="booking-modal-error"
            className="p-3.5 rounded-xl border border-red-300 bg-red-50 text-red-950 flex items-start space-x-2.5 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Booking Transaction Failed</span>
              <span className="text-red-800">{bookingError}</span>
            </div>
          </div>
        )}

        {/* Slot details card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Consultation Window
            </span>
            <Badge variant="success" size="sm">
              Ready to Reserve
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Date
              </span>
              <div className="flex items-center text-xs font-semibold text-slate-900 mt-0.5">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>{formatSlotDate(slot.start_at)}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Time
              </span>
              <div className="flex items-center text-xs font-semibold text-slate-900 mt-0.5">
                <Clock className="w-3.5 h-3.5 mr-1 text-teal-600" />
                <span>
                  {formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 space-y-2">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Physician
              </span>
              <div className="flex items-center text-xs font-semibold text-slate-900 mt-0.5">
                <User className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>{slot.doctor_name}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-medium">
                Department
              </span>
              <div className="flex items-center text-xs font-semibold text-slate-900 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>{slot.department_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient and Encounter Context */}
        <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center justify-between text-xs text-teal-950">
          <div>
            <span className="text-teal-700 block text-[11px] font-medium">Patient</span>
            <span className="font-bold">{patientName}</span>
          </div>
          <div className="text-right">
            <span className="text-teal-700 block text-[11px] font-medium">Encounter ID</span>
            <span className="font-mono text-teal-900 font-semibold">{encounterId}</span>
          </div>
        </div>

        {/* EHR Persisted Commitment Policy Notice */}
        <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-xs flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            By confirming, this slot will be committed atomically to the hospital registry.
            No fake or simulated booking confirmations are generated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isBooking}
            data-testid="btn-cancel-booking-modal"
            className="text-slate-600 min-h-[44px]"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onConfirmBooking}
            disabled={isBooking}
            data-testid="btn-confirm-booking-modal"
            className="min-h-[44px]"
          >
            {isBooking ? (
              <span className="flex items-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Securing Slot...
              </span>
            ) : (
              'Confirm & Book Appointment'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
