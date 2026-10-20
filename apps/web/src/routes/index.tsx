import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';
import { StaffLayout } from '../layouts/StaffLayout';
import { PatientKioskFlow } from '../features/patient-kiosk/PatientKioskFlow';
import { LedgerDiffHub } from '../features/patient-context/LedgerDiffHub';
import { AppointmentSchedulingHub } from '../features/appointments/AppointmentSchedulingHub';
import { DoctorDashboardHub } from '../features/doctor-dashboard/DoctorDashboardHub';
import { StaffOperationsHub } from '../features/staff-operations/StaffOperationsHub';
import { PatientProfileHub, type ProfileSubTab } from '../features/patient-profile';
import { mockDoctorQueue } from '../lib/api/mockData';
import { LuxuryMasterDashboard, type DashboardTabType } from '../features/luxury-dashboard';

export interface MainViewProps {
  initialTab?: DashboardTabType;
  onBackToLanding?: () => void;
  onOpenLogin?: () => void;
  currentUser?: {
    role: string;
    userId: string;
    userName: string;
    department?: string;
  } | null;
}

export const MainView: React.FC<MainViewProps> = ({
  initialTab = 'dashboard',
  onBackToLanding,
  onOpenLogin,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTabType>(initialTab);
  const [doctorSubTab, setDoctorSubTab] = useState<'console' | 'ledger'>('console');
  const [staffSubTab, setStaffSubTab] = useState<'operations' | 'ledger'>('operations');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const getProfileSubTab = (): ProfileSubTab => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('profile/')) {
      const match = hash.split('profile/')[1]?.split('?')[0]?.split('/')[0] as ProfileSubTab;
      if (['personal', 'overview', 'timeline', 'documents', 'medications', 'appointments', 'consent', 'settings'].includes(match)) {
        return match;
      }
    }
    return 'personal';
  };

  // 1. PATIENT KIOSK (STRICT ROLE SEPARATION)
  // Walk-up tablet interface with NO doctor sidebar, NO staff controls, NO auditor ledger
  if (activeTab === 'kiosk') {
    return (
      <div data-testid="role-kiosk-view" className="w-full min-h-screen">
        <PatientKioskFlow onBackToLanding={onBackToLanding} />
      </div>
    );
  }

  // 2. DOCTOR CONSOLE (STRICT ROLE SEPARATION)
  // Clinician workspace with prioritized queue, 60s brief, diff/ledger, doctor sign-off
  // Includes direct tab toggle to QA & Clinical Ledger for attending physicians
  if (activeTab === 'doctor') {
    return (
      <div data-testid="role-doctor-view" className="w-full min-h-screen">
        <DoctorConsoleLayout
          doctorName={currentUser?.userName || 'Dr. Clara Chen, MD'}
          department={currentUser?.department || 'Cardiology & Outpatient Triage'}
          activePatientCount={mockDoctorQueue.length}
          activeSubTab={doctorSubTab}
          onSubTabChange={setDoctorSubTab}
          onLogout={onBackToLanding || onOpenLogin}
          onBackToLanding={onBackToLanding}
        >
          {doctorSubTab === 'console' ? (
            <DoctorDashboardHub />
          ) : (
            <div className="space-y-4">
              <LedgerDiffHub />
            </div>
          )}
        </DoctorConsoleLayout>
      </div>
    );
  }

  // 3. HOSPITAL STAFF OPERATIONS (STRICT ROLE SEPARATION)
  // Front-desk triage operations: queue monitoring, walk-in registration, kiosk fleet monitoring
  // Includes direct tab toggle to QA & Clinical Ledger for desk coordinators
  if (activeTab === 'staff') {
    return (
      <div data-testid="role-staff-view" className="w-full min-h-screen">
        <StaffLayout
          terminalName="Front Desk Terminal 01"
          shiftName="Morning Shift"
          activeQueueCount={7}
          activeSubTab={staffSubTab}
          onSubTabChange={setStaffSubTab}
          onLogout={onBackToLanding || onOpenLogin}
          onBackToLanding={onBackToLanding}
        >
          {staffSubTab === 'operations' ? (
            <StaffOperationsHub />
          ) : (
            <div className="space-y-4">
              <LedgerDiffHub />
            </div>
          )}
        </StaffLayout>
      </div>
    );
  }

  // 4. COMMAND CENTER / EXECUTIVE OVERVIEW & MULTI-TAB INSPECTION
  // Used for administrative overview, multi-department telemetry, or direct inspection of ledger/appointments/profile
  return (
    <div data-testid="role-dashboard-view" className="w-full min-h-screen">
      <LuxuryMasterDashboard
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBackToLanding={onBackToLanding}
        onOpenLogin={onOpenLogin}
        currentUser={currentUser}
        onLaunchKiosk={() => setActiveTab('kiosk')}
        onOpenDoctorConsole={() => setActiveTab('doctor')}
        onOpenStaffOperations={() => setActiveTab('staff')}
        onOpenLedger={() => setActiveTab('ledger')}
        onOpenAppointments={() => setActiveTab('appointments')}
        onOpenProfile={() => setActiveTab('profile')}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.995 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full"
          >
            {/* LEDGER & DIFF SUB-VIEW */}
            {activeTab === 'ledger' && (
              <div className="p-2 sm:p-4 max-w-7xl mx-auto">
                <LedgerDiffHub />
              </div>
            )}

            {/* APPOINTMENTS SUB-VIEW (G4) */}
            {activeTab === 'appointments' && (
              <div className="p-2 sm:p-4 max-w-7xl mx-auto">
                <AppointmentSchedulingHub />
              </div>
            )}

            {/* PATIENT PROFILE & HOSPITAL RECORDS SUB-VIEW */}
            {activeTab === 'profile' && (
              <div className="p-2 sm:p-4 max-w-7xl mx-auto">
                <PatientProfileHub
                  patientId={currentUser?.userId && currentUser.role === 'patient' ? currentUser.userId : 'pat_synth_001'}
                  initialSubTab={getProfileSubTab()}
                  isClinicianView={currentUser?.role === 'doctor' || currentUser?.role === 'auditor'}
                  onBookAppointment={() => setActiveTab('appointments')}
                  onNavigateToTab={(t) => setActiveTab(t as DashboardTabType)}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </LuxuryMasterDashboard>
    </div>
  );
};
