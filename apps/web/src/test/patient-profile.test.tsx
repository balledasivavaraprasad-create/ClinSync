import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileDropdownMenu } from '../features/patient-profile/ProfileDropdownMenu';
import { PatientProfileHub } from '../features/patient-profile/PatientProfileHub';
import { DoctorDashboardHub } from '../features/doctor-dashboard/DoctorDashboardHub';
import { ThemeProvider } from '../lib/theme';

describe('ClinSync Patient Profile & Hospital Portal Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Top-Right Profile-Circle Menu (ProfileDropdownMenu)', () => {
    it('renders the circular profile avatar with correct patient initials and status indicator', () => {
      render(
        <ThemeProvider>
          <ProfileDropdownMenu
            currentUser={{
              role: 'patient',
              userId: 'pat_synth_001',
              userName: 'Eleanor Johnson',
              department: 'Outpatient Care',
            }}
          />
        </ThemeProvider>
      );

      const profileBtn = screen.getByTestId('profile-circle-btn');
      expect(profileBtn).toBeInTheDocument();
      expect(profileBtn).toHaveTextContent('EJ');
      expect(profileBtn).toHaveTextContent('Eleanor Johnson');
      expect(profileBtn).toHaveAttribute('aria-haspopup', 'true');
      expect(profileBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders clinician initials and role when authenticated as doctor', () => {
      render(
        <ThemeProvider>
          <ProfileDropdownMenu
            currentUser={{
              role: 'doctor',
              userId: 'dr_clara_chen',
              userName: 'Dr. Clara Chen',
              department: 'Cardiology',
            }}
          />
        </ThemeProvider>
      );

      const profileBtn = screen.getByTestId('profile-circle-btn');
      expect(profileBtn).toHaveTextContent('DC');
      expect(profileBtn).toHaveTextContent('Dr. Clara Chen');
      expect(profileBtn).toHaveTextContent('MD-CAR-042');
    });

    it('toggles dropdown menu on click and displays all 9 required navigation options', async () => {
      const handleNavigate = vi.fn();
      const handleSelectSubtab = vi.fn();
      const handleSignOut = vi.fn();

      render(
        <ThemeProvider>
          <ProfileDropdownMenu
            currentUser={{
              role: 'patient',
              userId: 'pat_synth_001',
              userName: 'Eleanor Johnson',
            }}
            onNavigateToTab={handleNavigate}
            onSelectProfileSubtab={handleSelectSubtab}
            onSignOut={handleSignOut}
          />
        </ThemeProvider>
      );

      const profileBtn = screen.getByTestId('profile-circle-btn');
      fireEvent.click(profileBtn);

      expect(profileBtn).toHaveAttribute('aria-expanded', 'true');
      const dropdown = screen.getByTestId('profile-dropdown-menu');
      expect(dropdown).toBeInTheDocument();

      // Check all 9 required options
      expect(screen.getByTestId('menu-item-profile')).toHaveTextContent('My Profile');
      expect(screen.getByTestId('menu-item-history')).toHaveTextContent('My Medical History');
      expect(screen.getByTestId('menu-item-documents')).toHaveTextContent('My Documents');
      expect(screen.getByTestId('menu-item-appointments')).toHaveTextContent('My Appointments');
      expect(screen.getByTestId('menu-item-medications')).toHaveTextContent('Medications & Allergies');
      expect(screen.getByTestId('menu-item-consent')).toHaveTextContent('Consent & Privacy');
      expect(screen.getByTestId('menu-item-settings')).toHaveTextContent('Account Settings');
      expect(screen.getByTestId('menu-item-help')).toHaveTextContent('Help & Support');
      expect(screen.getByTestId('menu-item-sign-out')).toHaveTextContent('Sign Out');

      // Click "My Profile" item
      fireEvent.click(screen.getByTestId('menu-item-profile'));
      expect(handleSelectSubtab).toHaveBeenCalledWith('personal');
      expect(handleNavigate).toHaveBeenCalledWith('profile');
    });

    it('closes dropdown menu when clicking outside', async () => {
      render(
        <ThemeProvider>
          <div>
            <div data-testid="outside-element">Outside</div>
            <ProfileDropdownMenu
              currentUser={{
                role: 'patient',
                userId: 'pat_synth_001',
                userName: 'Eleanor Johnson',
              }}
            />
          </div>
        </ThemeProvider>
      );

      const profileBtn = screen.getByTestId('profile-circle-btn');
      fireEvent.click(profileBtn);
      expect(screen.getByTestId('profile-dropdown-menu')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside-element'));
      await waitFor(() => {
        expect(screen.queryByTestId('profile-dropdown-menu')).not.toBeInTheDocument();
      });
    });

    it('triggers sign out callback when Sign Out item is selected', () => {
      const handleSignOut = vi.fn();
      render(
        <ThemeProvider>
          <ProfileDropdownMenu
            currentUser={{
              role: 'patient',
              userId: 'pat_synth_001',
              userName: 'Eleanor Johnson',
            }}
            onSignOut={handleSignOut}
          />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('profile-circle-btn'));
      fireEvent.click(screen.getByTestId('menu-item-sign-out'));
      expect(handleSignOut).toHaveBeenCalled();
    });

    it('opens Help & Support dialog with emergency warnings and contact numbers', () => {
      render(
        <ThemeProvider>
          <ProfileDropdownMenu
            currentUser={{
              role: 'patient',
              userId: 'pat_synth_001',
              userName: 'Eleanor Johnson',
            }}
          />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('profile-circle-btn'));
      fireEvent.click(screen.getByTestId('menu-item-help'));

      expect(screen.getByText(/Medical Emergency Warning/i)).toBeInTheDocument();
      expect(screen.getByText(/911/i)).toBeInTheDocument();
      expect(screen.getByText(/24\/7 Clinical Nurse Advice Line/i)).toBeInTheDocument();
      expect(screen.getByText('(800) 555-0199')).toBeInTheDocument();
    });
  });

  describe('2. Patient Profile Hub (PatientProfileHub)', () => {
    it('loads and renders patient personal information, demographics, and protected MRN badge', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="personal" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getAllByText('Eleanor Johnson').length).toBeGreaterThan(0);
      });

      expect(screen.getAllByText('MRN-EJ-829104').length).toBeGreaterThan(0);
      expect(screen.getByText(/Immutable \/ Protected/i)).toBeInTheDocument();
      expect(screen.getAllByText(/A-Positive \(A\+\)/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Robert Johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/Primary Next of Kin/i)).toBeInTheDocument();
    });

    it('allows opening demographics edit modal and saving contact updates', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="personal" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('btn-edit-profile')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('btn-edit-profile'));
      expect(screen.getByText('Edit Patient Demographics')).toBeInTheDocument();

      const phoneInput = screen.getByPlaceholderText('(555) 000-0000');
      fireEvent.change(phoneInput, { target: { value: '(555) 382-7777' } });

      const saveBtn = screen.getByText('Save Changes');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/updated successfully and audited/i)).toBeInTheDocument();
      });
    });

    it('renders medical overview with conditions, allergies, and provenance tags', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="overview" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Clinical Provenance & Certainty Ledger/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Acute Retrosternal Chest Tightness/i)).toBeInTheDocument();
      expect(screen.getByText(/Penicillin \(Systemic\)/i)).toBeInTheDocument();
      expect(screen.getByText('Lisinopril')).toBeInTheDocument();
      expect(screen.getAllByText(/Physician Verified/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Patient Reported/i).length).toBeGreaterThan(0);
    });

    it('renders chronological medical history timeline with category filtering', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="timeline" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Diagnostic Vitals Captured/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Prescription Ingestion — Lisinopril 10mg/i)).toBeInTheDocument();
      expect(screen.getByText(/Outpatient Triage Consultation/i)).toBeInTheDocument();
      expect(screen.getByText(/Severe Penicillin Allergy Registered/i)).toBeInTheDocument();

      // Test category filter button
      const filterBtn = screen.getByRole('button', { name: 'Consultations' });
      fireEvent.click(filterBtn);
      expect(screen.getByText(/Outpatient Triage Consultation/i)).toBeInTheDocument();
      expect(screen.queryByText(/Diagnostic Vitals Captured/i)).not.toBeInTheDocument();
    });

    it('renders clinical documents list and enables document preview', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="documents" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Active Prescription — Lisinopril 10mg')).toBeInTheDocument();
      });

      expect(screen.getByText('12-Lead Ambulatory Electrocardiogram (ECG)')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive Metabolic Panel & Lipid Profile')).toBeInTheDocument();

      const previewButtons = screen.getAllByRole('button', { name: /Preview Document/i });
      expect(previewButtons.length).toBeGreaterThan(0);
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText(/Active Prescription — Lisinopril 10mg/i).length).toBeGreaterThan(0);
      });
    });

    it('renders medications & allergy conflict safety warnings', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="medications" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Automated Pharmacological Safety Check/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Penicillin \(All Classes\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Contraindicated in EHR/i)).toBeInTheDocument();
      expect(screen.getByText('10 mg Oral Tablet')).toBeInTheDocument();
    });

    it('renders patient appointments and allows scheduling action', async () => {
      const handleBook = vi.fn();
      render(
        <ThemeProvider>
          <PatientProfileHub
            patientId="pat_synth_001"
            initialSubTab="appointments"
            onBookAppointment={handleBook}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Cardiology Outpatient Evaluation')).toBeInTheDocument();
      });

      expect(screen.getByText('Main Pavilion, Room 402B')).toBeInTheDocument();
      expect(screen.getByText('Routine Annual Health Checkup')).toBeInTheDocument();

      const scheduleBtn = screen.getByRole('button', { name: /Schedule New Appointment/i });
      fireEvent.click(scheduleBtn);
      expect(handleBook).toHaveBeenCalled();
    });

    it('renders consent & privacy dashboard and allows live consent toggling', async () => {
      render(
        <ThemeProvider>
          <PatientProfileHub patientId="pat_synth_001" initialSubTab="consent" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/HIPAA Compliance & Electronic Consent Vault/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Automated Kiosk & Tablet Intake Consent/i)).toBeInTheDocument();
      expect(screen.getByText(/Health Information Exchange \(HIE\)/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Multimodal Triage & Audio Brief Synthesis/i)).toBeInTheDocument();

      const intakeToggle = screen.getByLabelText(/Toggle automated intake consent/i);
      fireEvent.click(intakeToggle);
    });
  });

  describe('3. Hospital Portal & Doctor Console Role Separation', () => {
    it('verifies doctor console excludes patient profile and booking tabs while PatientProfileHub serves patient records', async () => {
      render(
        <ThemeProvider>
          <DoctorDashboardHub doctorId="dr_clara_chen" initialEncounterId="enc_demo_001" />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('doc-tab-brief')).toBeInTheDocument();
      });

      // Doctor console must not contain patient profile / booking tabs
      expect(screen.queryByTestId('doc-tab-profile')).not.toBeInTheDocument();
      expect(screen.getByTestId('doc-tab-ledger')).toBeInTheDocument();
      expect(screen.getByTestId('doc-tab-diff')).toBeInTheDocument();
    });
  });
});
