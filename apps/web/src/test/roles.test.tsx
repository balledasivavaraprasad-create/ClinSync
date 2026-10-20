import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MainView } from '../routes';
import { App } from '../app/App';
import { StaffOperationsHub } from '../features/staff-operations/StaffOperationsHub';

describe('ClinSync Role Separation & Navigation Architecture (TELEMEDICON 2026)', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  describe('1. Patient Kiosk Role Isolation (/kiosk)', () => {
    it('renders dedicated tablet KioskLayout with zero doctor, staff, or auditor controls', () => {
      render(<MainView initialTab="kiosk" />);

      // 1. Must render dedicated role container
      expect(screen.getByTestId('role-kiosk-view')).toBeInTheDocument();
      expect(screen.getByTestId('patient-kiosk-layout')).toBeInTheDocument();

      // 2. Kiosk UI elements present
      expect(screen.getByText('ClinSync Patient Kiosk')).toBeInTheDocument();
      expect(screen.getByText('Staff Assistance')).toBeInTheDocument();
      expect(screen.getByText('Welcome to ClinSync Intake')).toBeInTheDocument();
      expect(screen.getByText('Returning Patient')).toBeInTheDocument();

      // 3. ZERO cross-role leakage: Monolithic dashboard and other role interfaces must NOT exist
      expect(screen.queryByTestId('luxury-master-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('doctor-console-layout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('staff-operations-layout')).not.toBeInTheDocument();
      expect(screen.queryByText(/Active Clinic Queue/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Pre-Consultation Clinical Brief/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Attending Physician/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Front Desk Terminal/i)).not.toBeInTheDocument();
    });
  });

  describe('2. Doctor Console Role Isolation (/doctor)', () => {
    it('renders dedicated clinician workstation with queue, brief, and sign-off', async () => {
      render(
        <MainView
          initialTab="doctor"
          currentUser={{
            role: 'doctor',
            userId: 'dr_clara_chen',
            userName: 'Dr. Clara Chen, MD',
            department: 'Cardiology & Outpatient Triage',
          }}
        />
      );

      // 1. Must render dedicated doctor console container
      expect(screen.getByTestId('role-doctor-view')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-console-layout')).toBeInTheDocument();

      // 2. Clinician header and doctor identity
      expect(screen.getByText('Doctor Console')).toBeInTheDocument();
      expect(screen.getByText('Dr. Clara Chen, MD')).toBeInTheDocument();
      expect(screen.getByText('Cardiology & Outpatient Triage')).toBeInTheDocument();
      expect(screen.getAllByText(/Pending/i).length).toBeGreaterThanOrEqual(1);

      // 3. Doctor Consultation elements (loaded asynchronously)
      await waitFor(() => {
        expect(screen.getByText('Patient Triage Queue')).toBeInTheDocument();
        expect(screen.getByText(/Clinical Brief/i)).toBeInTheDocument();
        expect(screen.getByText('Review & Sign Off')).toBeInTheDocument();
      });

      // 4. ZERO kiosk or front-desk leakage
      expect(screen.queryByTestId('luxury-master-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('patient-kiosk-layout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('staff-operations-layout')).not.toBeInTheDocument();
      expect(screen.queryByText('ClinSync Patient Kiosk')).not.toBeInTheDocument();
      expect(screen.queryByText('Staff Assistance')).not.toBeInTheDocument();
      expect(screen.queryByText('Front Desk Terminal 01')).not.toBeInTheDocument();
    });
  });

  describe('3. Hospital Staff Operations Role Isolation (/staff)', () => {
    it('renders front-desk triage and queue operations without doctor sign-off', () => {
      render(
        <MainView
          initialTab="staff"
          currentUser={{
            role: 'staff',
            userId: 'nurse_sarah_lin',
            userName: 'Sarah Lin, RN',
            department: 'Front Desk & Triage Operations',
          }}
        />
      );

      // 1. Must render dedicated staff operations container
      expect(screen.getByTestId('role-staff-view')).toBeInTheDocument();
      expect(screen.getByTestId('staff-operations-layout')).toBeInTheDocument();

      // 2. Staff operations header and terminal identity
      expect(screen.getByText('Staff Operations')).toBeInTheDocument();
      expect(screen.getByText(/Front Desk Terminal 01/i)).toBeInTheDocument();
      expect(screen.getByText('Sarah Lin, RN')).toBeInTheDocument();

      // 3. Operational summary metrics
      expect(screen.getByText('Front-Desk Patient Triage Queue')).toBeInTheDocument();
      expect(screen.getByTestId('btn-staff-register-walkin')).toBeInTheDocument();
      expect(screen.getByText('Kiosk Station Fleet')).toBeInTheDocument();
      expect(screen.getByText('Operational Audit Log')).toBeInTheDocument();

      // 4. ZERO clinician diagnostic sign-off controls
      expect(screen.queryByTestId('luxury-master-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('doctor-console-layout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('patient-kiosk-layout')).not.toBeInTheDocument();
      expect(screen.queryByText('Doctor Console')).not.toBeInTheDocument();
      expect(screen.queryByText('Pre-Consultation Clinical Brief')).not.toBeInTheDocument();
    });

    it('allows front desk staff to monitor kiosk fleet and perform remote resets', async () => {
      render(<StaffOperationsHub />);

      expect(screen.getByText('Kiosk Station 01')).toBeInTheDocument();
      expect(screen.getByText('Kiosk Station 02')).toBeInTheDocument();
      expect(screen.getByText('Kiosk Station 04')).toBeInTheDocument();

      // Remote reset button for Kiosk 04 (Needs Reset)
      const resetBtn = screen.getByTestId('btn-reset-k-04');
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);

      // Verify notification banner is displayed
      await waitFor(() => {
        expect(screen.getByTestId('staff-notification-banner')).toBeInTheDocument();
        expect(screen.getByText(/Kiosk Station 04 reset successfully/i)).toBeInTheDocument();
      });
    });

    it('opens walk-in patient registration modal when clicking Register Walk-In Patient', async () => {
      render(<StaffOperationsHub />);

      const registerBtn = screen.getByTestId('btn-staff-register-walkin');
      expect(registerBtn).toBeInTheDocument();

      fireEvent.click(registerBtn);

      // NewPatientForm modal opens
      await waitFor(() => {
        expect(screen.getByText('New Patient Registration')).toBeInTheDocument();
      });
    });
  });

  describe('4. Direct Role URL and Landing Page Launchers', () => {
    it('launches respective role views when clicking hero role workspace buttons on LandingPage', () => {
      render(<App />);

      // On landing page initially
      expect(screen.getByTestId('hero-role-launchers')).toBeInTheDocument();

      // 1. Launch Doctor Console
      const doctorRoleBtn = screen.getByTestId('hero-role-doctor');
      fireEvent.click(doctorRoleBtn);
      expect(screen.getByTestId('role-doctor-view')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-console-layout')).toBeInTheDocument();

      // Return to portal
      const portalBtn = screen.getByRole('button', { name: /portal/i });
      fireEvent.click(portalBtn);
      expect(screen.getByTestId('hero-role-launchers')).toBeInTheDocument();

      // 2. Launch Hospital Staff Desk
      const staffRoleBtn = screen.getByTestId('hero-role-staff');
      fireEvent.click(staffRoleBtn);
      expect(screen.getByTestId('role-staff-view')).toBeInTheDocument();
      expect(screen.getByTestId('staff-operations-layout')).toBeInTheDocument();

      // Return to portal
      const staffPortalBtn = screen.getByRole('button', { name: /portal/i });
      fireEvent.click(staffPortalBtn);
      expect(screen.getByTestId('hero-role-launchers')).toBeInTheDocument();

      // 3. Launch Patient Kiosk
      const kioskRoleBtn = screen.getByTestId('hero-role-kiosk');
      fireEvent.click(kioskRoleBtn);
      expect(screen.getByTestId('role-kiosk-view')).toBeInTheDocument();
      expect(screen.getByTestId('patient-kiosk-layout')).toBeInTheDocument();
    });
  });
});
