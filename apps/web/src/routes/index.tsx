import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';
import { PatientKioskFlow } from '../features/patient-kiosk/PatientKioskFlow';
import { LedgerDiffHub } from '../features/patient-context/LedgerDiffHub';
import { AppointmentSchedulingHub } from '../features/appointments/AppointmentSchedulingHub';
import { DoctorDashboardHub } from '../features/doctor-dashboard/DoctorDashboardHub';
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

  return (
    <LuxuryMasterDashboard
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onBackToLanding={onBackToLanding}
      onOpenLogin={onOpenLogin}
      currentUser={currentUser}
      onLaunchKiosk={() => setActiveTab('kiosk')}
      onOpenDoctorConsole={() => setActiveTab('doctor')}
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
          {/* 1. KIOSK TAB */}
          {activeTab === 'kiosk' && <PatientKioskFlow />}

          {/* 2. LEDGER & DIFF TAB */}
          {activeTab === 'ledger' && (
            <div className="p-2 sm:p-4 max-w-7xl mx-auto">
              <LedgerDiffHub />
            </div>
          )}

          {/* 3. APPOINTMENTS TAB (G4) */}
          {activeTab === 'appointments' && (
            <div className="p-2 sm:p-4 max-w-7xl mx-auto">
              <AppointmentSchedulingHub />
            </div>
          )}

          {/* 4. DOCTOR CONSOLE TAB */}
          {activeTab === 'doctor' && (
            <DoctorConsoleLayout activePatientCount={mockDoctorQueue.length}>
              <DoctorDashboardHub />
            </DoctorConsoleLayout>
          )}

          {/* 5. PATIENT PROFILE & HOSPITAL RECORDS TAB */}
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
  );
};
