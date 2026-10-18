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
            className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/50 text-rose-200 flex items-start space-x-2.5 text-xs shadow-md"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-white">Booking Transaction Failed</span>
              <span className="text-rose-200/90">{bookingError}</span>
            </div>
          </div>
        )}

        {/* Slot details card */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <span className="text-xs uppercase font-mono tracking-wider text-cyan-400">
              Consultation Window
            </span>
            <Badge variant="success" size="sm">
              Ready to Reserve
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-mono">
                Date
              </span>
              <div className="flex items-center text-xs font-semibold text-white mt-0.5">
                <Calendar className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                <span>{formatSlotDate(slot.start_at)}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-mono">
                Time
              </span>
              <div className="flex items-center text-xs font-semibold text-white mt-0.5">
                <Clock className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                <span>
                  {formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08] space-y-2">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-mono">
                Physician
              </span>
              <div className="flex items-center text-xs font-semibold text-white mt-0.5">
                <User className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                <span>{slot.doctor_name}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block uppercase font-mono">
                Department
              </span>
              <div className="flex items-center text-xs font-semibold text-white mt-0.5">
                <Stethoscope className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                <span>{slot.department_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient and Encounter Context */}
        <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200">
          <div>
            <span className="text-cyan-400 block text-[11px] font-mono">Patient</span>
            <span className="font-bold text-white">{patientName}</span>
          </div>
          <div className="text-right">
            <span className="text-cyan-400 block text-[11px] font-mono">Encounter ID</span>
            <span className="font-mono text-cyan-300 font-semibold">{encounterId}</span>
          </div>
        </div>

        {/* EHR Persisted Commitment Policy Notice */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 text-xs flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            By confirming, this slot will be committed atomically to the hospital registry.
            No fake or simulated booking confirmations are generated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/[0.08]">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isBooking}
            data-testid="btn-cancel-booking-modal"
            className="text-slate-300 border-white/10 hover:bg-white/5 min-h-[44px]"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onConfirmBooking}
            disabled={isBooking}
            data-testid="btn-confirm-booking-modal"
            className="min-h-[44px] cursor-pointer"
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
