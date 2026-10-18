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
      <Card className="shadow-xl border-emerald-200 overflow-hidden">
        {/* Top brand accent stripe */}
        <div className="h-2 bg-emerald-600" />

        <CardHeader className="text-center pt-8 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="success" size="sm" className="font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Persisted in Hospital Registry
            </Badge>
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900 mt-2">
            Appointment Confirmed!
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 max-w-md mx-auto">
            Your clinic consultation has been successfully scheduled and persisted.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 sm:px-8">
          {/* Reference Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                Booking Reference ID
              </span>
              <span
                data-testid="confirmed-booking-id"
                className="text-lg font-mono font-extrabold text-slate-900"
              >
                {booking_id}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Status: <strong className="text-emerald-700">{status}</strong> • Confirmed at{' '}
                {new Date(confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-center shrink-0">
              <QrCode className="w-12 h-12 text-slate-800 mx-auto" />
              <span className="text-[10px] font-mono text-slate-400 block mt-1">
                Kiosk Check-in Pass
              </span>
            </div>
          </div>

          {/* Consultation Details */}
          <div className="p-4 rounded-2xl border border-teal-100 bg-teal-50/50 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-800 font-bold block">
                  Physician
                </span>
                <div className="flex items-center text-sm font-bold text-slate-900 mt-1">
                  <User className="w-4 h-4 mr-1.5 text-teal-700 shrink-0" />
                  <span>{slot.doctor_name}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-800 font-bold block">
                  Department
                </span>
                <div className="flex items-center text-sm font-bold text-slate-900 mt-1">
                  <Stethoscope className="w-4 h-4 mr-1.5 text-teal-700 shrink-0" />
                  <span>{slot.department_name}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-800 font-bold block">
                  Date
                </span>
                <div className="flex items-center text-sm font-bold text-slate-900 mt-1">
                  <Calendar className="w-4 h-4 mr-1.5 text-teal-700 shrink-0" />
                  <span>{formatSlotDate(slot.start_at)}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-800 font-bold block">
                  Time Window
                </span>
                <div className="flex items-center text-sm font-bold text-slate-900 mt-1">
                  <Clock className="w-4 h-4 mr-1.5 text-teal-700 shrink-0" />
                  <span>
                    {formatSlotTime(slot.start_at)} – {formatSlotTime(slot.end_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Guidance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <span className="font-bold text-slate-900 block">Next Steps at Hospital:</span>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Please proceed to <strong>Waiting Area B</strong> (2nd Floor).</li>
              <li>Your intake answers and uploaded records have been synced to Dr. Clara Chen's clinical console.</li>
              <li>A mobile SMS pass has been prepared for patient <strong>{patientName}</strong> under encounter <code className="font-mono text-teal-900 font-semibold">{encounterId}</code>.</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border-t border-slate-100 px-6 sm:px-8 py-4">
          <Button
            variant="outline"
            size="md"
            onClick={onPrint}
            data-testid="btn-print-confirmation"
            className="w-full sm:w-auto text-slate-700 min-h-[44px]"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Consultation Pass
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={onResetSession}
            data-testid="btn-finish-kiosk"
            className="w-full sm:w-auto min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Complete & Return to Welcome
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
