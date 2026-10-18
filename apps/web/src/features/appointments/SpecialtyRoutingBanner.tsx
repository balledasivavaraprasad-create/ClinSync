import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Bell,
  Clock,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import type { DecisionResultResponse } from '../../lib/api/types';

interface SpecialtyRoutingBannerProps {
  decisionResult?: DecisionResultResponse['data'] | null;
  isLoading?: boolean;
  onNotifyStaff?: () => void;
  staffNotified?: boolean;
}

export const SpecialtyRoutingBanner: React.FC<SpecialtyRoutingBannerProps> = ({
  decisionResult,
  isLoading = false,
  onNotifyStaff,
  staffNotified = false,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="routing-banner-loading"
        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 animate-pulse flex items-center space-x-3"
      >
        <div className="w-8 h-8 rounded-full bg-slate-200" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!decisionResult) {
    return null;
  }

  const { decision, reason_codes, recommended_department_id, policy_version } =
    decisionResult;

  // 1. URGENT ESCALATION (Strict safety rule - overrides routine booking)
  if (decision === 'URGENT_ESCALATION') {
    return (
      <aside
        data-testid="routing-escalation-banner"
        role="alert"
        aria-label="Urgent Clinical Escalation"
        className="w-full p-5 rounded-2xl border-2 border-red-500 bg-red-50/90 text-red-950 shadow-md space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block px-2 py-0.5 text-xs font-black uppercase tracking-wider rounded bg-red-700 text-white">
                  High Acuity Alert
                </span>
                <span className="text-xs font-mono text-red-700">
                  Policy: {policy_version}
                </span>
              </div>
              <h2 className="text-lg font-bold text-red-950 mt-1">
                Immediate Clinical Evaluation Recommended
              </h2>
              <p className="text-sm text-red-900 mt-1 leading-relaxed">
                Based on validated hospital safety protocols, reported symptoms require immediate
                in-person clinical triage rather than a routine outpatient appointment. Routine booking has been safely held.
              </p>
            </div>
          </div>

          {onNotifyStaff && (
            <button
              type="button"
              onClick={onNotifyStaff}
              disabled={staffNotified}
              data-testid="btn-notify-triage"
              className={`shrink-0 inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                staffNotified
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-red-700 text-white hover:bg-red-800'
              }`}
            >
              <Bell className="w-4 h-4 mr-2" />
              {staffNotified ? 'Triage Nurse Dispatched' : 'Alert Station Nurse'}
            </button>
          )}
        </div>

        {/* Reason Codes */}
        <div className="pt-2 border-t border-red-200/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
            Safety Trigger Codes:
          </span>
          {reason_codes.map((code) => (
            <span
              key={code}
              className="text-xs font-mono bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded font-medium"
            >
              {code}
            </span>
          ))}
        </div>
      </aside>
    );
  }

  // 2. HUMAN REVIEW (Triage nurse / doctor verification required)
  if (decision === 'HUMAN_REVIEW') {
    return (
      <aside
        data-testid="routing-review-banner"
        role="alert"
        aria-label="Clinical Triage Review Required"
        className="w-full p-5 rounded-2xl border-2 border-amber-400 bg-amber-50/90 text-amber-950 shadow-sm space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 text-white">
                  Clinical Triage Review
                </span>
                <span className="text-xs font-mono text-amber-800">
                  Policy: {policy_version}
                </span>
              </div>
              <h2 className="text-lg font-bold text-amber-950 mt-1">
                Clinical Specialist Review in Progress
              </h2>
              <p className="text-sm text-amber-900 mt-1 leading-relaxed">
                Hospital protocol requires a clinical provider to review your intake records and medication history before finalizing routine appointment slots. Please remain at this kiosk station.
              </p>
            </div>
          </div>

          {onNotifyStaff && (
            <button
              type="button"
              onClick={onNotifyStaff}
              disabled={staffNotified}
              data-testid="btn-notify-triage"
              className={`shrink-0 inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                staffNotified
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-amber-700 text-white hover:bg-amber-800'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              {staffNotified ? 'Clinician Notified' : 'Request Staff Assistance'}
            </button>
          )}
        </div>

        {/* Reason Codes */}
        <div className="pt-2 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Review Protocol Factors:
          </span>
          {reason_codes.map((code) => (
            <span
              key={code}
              className="text-xs font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-medium"
            >
              {code}
            </span>
          ))}
        </div>
      </aside>
    );
  }

  // 3. UNABLE TO DETERMINE
  if (decision === 'UNABLE_TO_DETERMINE') {
    return (
      <aside
        data-testid="routing-undetermined-banner"
        role="alert"
        aria-label="Staff Assistance Required"
        className="w-full p-4 rounded-xl border border-slate-300 bg-slate-100 text-slate-800 space-y-2"
      >
        <div className="flex items-center space-x-3">
          <HelpCircle className="w-5 h-5 text-slate-600 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Reception Assistance Recommended
            </h2>
            <p className="text-xs text-slate-600">
              The intake system was unable to map a routine specialty match. Please consult reception desk A for manual scheduling.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // 4. ROUTINE SCHEDULING (Routine booking permitted)
  return (
    <aside
      data-testid="routing-routine-banner"
      aria-label="Routine Clinic Scheduling Approved"
      className="w-full p-4 sm:p-5 rounded-2xl border border-teal-200 bg-teal-50/70 text-teal-950 space-y-3"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0 mt-0.5">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-600 text-white">
                Routine Booking Approved
              </span>
              <span className="text-xs font-mono text-teal-800">
                Rule Engine {policy_version}
              </span>
            </div>
            {recommended_department_id && (
              <Badge variant="success" size="sm" className="font-medium">
                <Stethoscope className="w-3.5 h-3.5 mr-1" />
                Recommended: {recommended_department_id.replace('dept_', '').toUpperCase()}
              </Badge>
            )}
          </div>
          <h2 className="text-base font-bold text-teal-950 mt-1">
            Outpatient Specialty Scheduling Available
          </h2>
          <p className="text-xs sm:text-sm text-teal-800/90 mt-0.5">
            Your intake facts satisfy non-acute triage criteria. You may select an available consultation slot below.
          </p>
        </div>
      </div>

      {reason_codes.length > 0 && (
        <div className="pt-2 border-t border-teal-200/70 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-teal-800">Clinical Protocol Matches:</span>
          {reason_codes.map((code) => (
            <span
              key={code}
              className="font-mono bg-white text-teal-900 border border-teal-200 px-2 py-0.5 rounded text-[11px]"
            >
              {code}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
};
