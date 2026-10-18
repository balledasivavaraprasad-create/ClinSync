import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Printer,
  RotateCcw,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type { BookingResponse } from '../../lib/api/types';

interface BookingConfirmationCardProps {
  booking: BookingResponse['data'];
  patientName: string;
  encounterId: string;
  onResetSession: () => void;
  onPrint?: () => void;
}

export const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({
  booking,
  patientName,
  encounterId,
  onResetSession,
  onPrint = () => window.print(),
}) => {
  const { booking_id, slot, confirmed_at, status } = booking;
  const doctorName =
    slot?.doctor_name ||
    (booking.doctor_id ? `Physician (${booking.doctor_id})` : 'Assigned Physician');
  const departmentName = slot?.department_name || 'Specialty Outpatient Clinic';
  const startAt = slot?.start_at || booking.start_at;
  const endAt = slot?.end_at;

  const formatSlotTime = (isoString?: string) => {
    if (!isoString) return '10:00 AM';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatSlotDate = (isoString?: string) => {
    if (!isoString) return 'Oct 18, 2026';
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
    <div
      data-testid="booking-confirmation-container"
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      <Card className="shadow-2xl border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl overflow-hidden">
        {/* Top brand accent stripe */}
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500" />

        <CardHeader className="text-center pt-8 pb-4 border-none">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="success" size="sm" className="font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Persisted in Hospital Registry
            </Badge>
          </div>
          <CardTitle className="text-2xl font-extrabold text-white mt-2">
            Appointment Confirmed!
          </CardTitle>
          <CardDescription className="text-sm text-slate-400 max-w-md mx-auto">
            Your clinic consultation has been successfully scheduled and persisted.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 sm:px-8">
          {/* Reference Banner */}
          <div className="p-4 bg-[#0a0f1d]/80 border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-cyan-400 block">
                Booking Reference ID
              </span>
              <span
                data-testid="confirmed-booking-id"
                className="text-lg font-mono font-extrabold text-white"
              >
                {booking_id}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                Status: <strong className="text-emerald-400">{status}</strong> • Confirmed at{' '}
                {new Date(confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="p-3 bg-[#050811] border border-white/10 rounded-xl shadow-xs text-center shrink-0">
              <QrCode className="w-12 h-12 text-cyan-300 mx-auto" />
              <span className="text-[10px] font-mono text-slate-400 block mt-1">
                Kiosk Check-in Pass
              </span>
            </div>
          </div>

          {/* Consultation Details */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-mono font-bold block">
                  Physician
                </span>
                <div className="flex items-center text-sm font-bold text-white mt-1">
                  <User className="w-4 h-4 mr-1.5 text-cyan-400 shrink-0" />
                  <span>{doctorName}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-mono font-bold block">
                  Department
                </span>
                <div className="flex items-center text-sm font-bold text-white mt-1">
                  <Stethoscope className="w-4 h-4 mr-1.5 text-cyan-400 shrink-0" />
                  <span>{departmentName}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-mono font-bold block">
                  Date
                </span>
                <div className="flex items-center text-sm font-bold text-white mt-1">
                  <Calendar className="w-4 h-4 mr-1.5 text-cyan-400 shrink-0" />
                  <span>{formatSlotDate(startAt)}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-mono font-bold block">
                  Time Window
                </span>
                <div className="flex items-center text-sm font-bold text-white mt-1">
                  <Clock className="w-4 h-4 mr-1.5 text-cyan-400 shrink-0" />
                  <span>
                    {formatSlotTime(startAt)} {endAt ? `– ${formatSlotTime(endAt)}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Guidance */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-1.5">
            <span className="font-bold text-white block">Next Steps at Hospital:</span>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Please proceed to <strong>Waiting Area B</strong> (2nd Floor).</li>
              <li>Your intake answers and uploaded records have been synced to {doctorName}'s clinical console.</li>
              <li>A mobile SMS pass has been prepared for patient <strong>{patientName}</strong> under encounter <code className="font-mono text-cyan-300 font-semibold">{encounterId}</code>.</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#050811]/60 border-t border-white/[0.08] px-6 sm:px-8 py-4">
          <Button
            variant="outline"
            size="md"
            onClick={onPrint}
            data-testid="btn-print-confirmation"
            className="w-full sm:w-auto text-slate-300 border-white/10 hover:bg-white/5 min-h-[44px]"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Consultation Pass
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onResetSession}
            data-testid="btn-finish-kiosk"
            className="w-full sm:w-auto min-h-[44px] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Complete & Return to Welcome
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
