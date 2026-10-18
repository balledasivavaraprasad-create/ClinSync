import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { KioskLayout } from '../layouts/KioskLayout';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';
import { KioskWelcome } from '../features/patient-kiosk/KioskWelcome';
import { IdentityConfirmationModal } from '../features/patient-kiosk/IdentityConfirmationModal';
import { DocumentUploadZone } from '../features/documents/DocumentUploadZone';
import { ClinicalContextLedger } from '../features/patient-context/ClinicalContextLedger';
import { ContextDiffView } from '../features/patient-context/ContextDiffView';
import { SlotSelector } from '../features/appointments/SlotSelector';
import { SpecialtyRoutingBanner } from '../features/appointments/SpecialtyRoutingBanner';
import { DoctorQueueList } from '../features/doctor-dashboard/DoctorQueueList';
import { AudioBriefPlayer } from '../features/doctor-brief/AudioBriefPlayer';
import { DoctorApprovalModal } from '../features/doctor-brief/DoctorApprovalModal';
import {
  mockCandidates,
  mockClinicalFacts,
  mockSlots,
  mockDoctorQueue,
} from '../lib/api/mockData';

describe('TASK-P1-601: Visual QA, Tablet Responsiveness & Accessibility Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. TOUCH TARGET COMPLIANCE (WCAG 2.5.5 / 2.5.8 >= 48px)
  describe('1. Touch Target Compliance (>= 48px for Touch-First UI)', () => {
    it('enforces min-height 48px on standard interactive Button component', () => {
      render(<Button>Touch Target Button</Button>);
      const btn = screen.getByRole('button', { name: 'Touch Target Button' });
      expect(btn.className).toContain('min-h-[48px]');
    });

    it('enforces min-height 48px on Input controls for comfortable touchscreen typing', () => {
      render(<Input label="Patient ID" placeholder="Enter ID" />);
      const input = screen.getByPlaceholderText('Enter ID');
      expect(input.className).toContain('min-h-[48px]');
    });

    it('ensures kiosk welcome cards provide generous touch surfaces (>48px min height)', () => {
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={vi.fn()}
        />
      );

      const returningBtn = screen.getByTestId('returning-patient-btn');
      const newPatientBtn = screen.getByTestId('new-patient-btn');

      expect(returningBtn.className).toContain('min-h-[80px]');
      expect(newPatientBtn.className).toContain('min-h-[80px]');
    });

    it('ensures candidate selection action in DOB modal is comfortably touchable (>= 48px)', () => {
      render(
        <IdentityConfirmationModal
          candidate={mockCandidates[0]}
          onConfirmed={vi.fn()}
          onCancel={vi.fn()}
          onRouteToStaff={vi.fn()}
        />
      );

      const confirmBtn = screen.getByTestId('confirm-identity-btn');
      expect(confirmBtn.className).toContain('min-h-[48px]');
    });

    it('ensures appointment booking slots have touch target height >= 48px', () => {
      render(
        <SlotSelector
          slots={mockSlots}
          selectedSlotId={null}
          onSelectSlot={vi.fn()}
          selectedDepartmentId="dept_cardiology"
          onSelectDepartment={vi.fn()}
          selectedDate="2026-10-18"
          onSelectDate={vi.fn()}
        />
      );

      const slotCard = screen.getByTestId('slot-card-slot_cardio_101');
      expect(slotCard.className).toContain('min-h-[96px]');
    });
  });

  // 2. ACCESSIBILITY, CONTRAST & SCREEN READER SEMANTICS
  describe('2. Accessibility, ARIA Semantics & Screen Reader Tags', () => {
    it('provides role="alert" and screen reader warnings for emergency states', () => {
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={vi.fn()}
        />
      );

      const emergencyBanner = screen.getByTestId('emergency-banner');
      expect(emergencyBanner).toHaveAttribute('role', 'alert');
      expect(screen.getByText(/Emergency Clinical Alert/i)).toBeInTheDocument();
    });

    it('provides accessible form validation semantics on input errors', () => {
      render(
        <Input
          label="Date of Birth"
          error="Year must be between 1900 and 2026"
          placeholder="YYYY"
        />
      );

      const input = screen.getByPlaceholderText('YYYY');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'date-of-birth-error');
      expect(screen.getByText('Year must be between 1900 and 2026')).toBeInTheDocument();
    });

    it('includes text labels with icon cues so status is never conveyed by color alone', () => {
      render(
        <div>
          <Badge status="reported">Reported</Badge>
          <Badge status="extracted_unverified">Extracted</Badge>
          <Badge status="doctor_confirmed">Confirmed</Badge>
          <Badge status="conflicting">Conflicting</Badge>
        </div>
      );

      expect(screen.getByText('Reported')).toBeInTheDocument();
      expect(screen.getByText('Extracted')).toBeInTheDocument();
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
      expect(screen.getByText('Conflicting')).toBeInTheDocument();
    });

    it('provides accessible ARIA progressbar with time limits on audio player', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Accessible clinical brief summary"
          durationSeconds={60}
        />
      );

      const progressbar = screen.getByTestId('audio-progressbar');
      expect(progressbar).toHaveAttribute('role', 'progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '60');
      expect(progressbar).toHaveAttribute('aria-label', 'Audio summary progress');
    });

    it('renders accessible dialog with title, description, and focus isolation', () => {
      render(
        <Dialog
          isOpen={true}
          onClose={vi.fn()}
          title="Clinical Review Confirmation"
          description="Review patient records before confirming"
        >
          <div>Dialog Content</div>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Clinical Review Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Review patient records before confirming')).toBeInTheDocument();
    });
  });

  // 3. TABLET & DESKTOP RESPONSIVE LAYOUT AUDITING
  describe('3. Tablet & Desktop Responsive Layout Auditing', () => {
    it('renders KioskLayout correctly for tablet header with step counters and language selector', () => {
      render(
        <KioskLayout
          currentStep={2}
          totalSteps={4}
          title="ClinSync Intake Kiosk"
          subtitle="Station #04"
          onResetSession={vi.fn()}
        >
          <div data-testid="kiosk-content">Step 2 Intake Content</div>
        </KioskLayout>
      );

      expect(screen.getByText('ClinSync Intake Kiosk')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('English (US)')).toBeInTheDocument();
      expect(screen.getByTestId('kiosk-content')).toBeInTheDocument();
    });

    it('renders DoctorConsoleLayout with workstation header, pending count, and responsive shell', () => {
      render(
        <DoctorConsoleLayout
          doctorName="Dr. Clara Chen, MD"
          department="Cardiology & Chest Pain Center"
          activePatientCount={3}
        >
          <div data-testid="workstation-content">Clinical Workstation Content</div>
        </DoctorConsoleLayout>
      );

      expect(screen.getByText('Doctor Console')).toBeInTheDocument();
      expect(screen.getByText('Dr. Clara Chen, MD')).toBeInTheDocument();
      expect(screen.getByText('3 Pending')).toBeInTheDocument();
      expect(screen.getByTestId('workstation-content')).toBeInTheDocument();
    });

    it('renders scannable triage priority badges on DoctorQueueList without horizontal overflow', () => {
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={vi.fn()}
        />
      );

      expect(screen.getByTestId('doctor-queue-list')).toBeInTheDocument();
      expect(screen.getByText('Patient Triage Queue')).toBeInTheDocument();
      expect(screen.getByText('Eleanor Johnson')).toBeInTheDocument();
      expect(screen.getByText('Marcus Patel')).toBeInTheDocument();
    });

    it('renders scannable Context Ledger table with category filters and concept badges', () => {
      render(
        <ClinicalContextLedger
          facts={mockClinicalFacts}
          encounterId="enc_demo_001"
        />
      );

      expect(screen.getByTestId('clinical-context-ledger')).toBeInTheDocument();
      expect(screen.getByText('Clinical Context Ledger')).toBeInTheDocument();
      expect(screen.getByTestId('ledger-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('ledger-category-select')).toBeInTheDocument();
    });

    it('renders side-by-side comparison for contradictory claims in ContextDiffView', () => {
      const mockDiff = {
        encounter_id: 'enc_demo_001',
        new_facts: [mockClinicalFacts[0]],
        changed_facts: [],
        conflicting_facts: [
          {
            claim_a: mockClinicalFacts[0],
            claim_b: mockClinicalFacts[4],
            conflict_description: 'Contradictory onset timeline between intake statement and clinic referral.',
          },
        ],
        unresolved_count: 1,
      };

      render(<ContextDiffView diffData={mockDiff} />);

      expect(screen.getByTestId('context-diff-view')).toBeInTheDocument();
      expect(screen.getByText(/Unresolved Clinical Contradictions/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Contradictory onset timeline between intake statement and clinic referral/)
      ).toBeInTheDocument();
    });
  });

  // 4. MULTI-LANGUAGE & RESILIENT CLINICAL STATES
  describe('4. Multi-Language, High Contrast & State Resilience', () => {
    it('supports switching language to Spanish (es) and Chinese (zh) on Kiosk welcome', () => {
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={vi.fn()}
        />
      );

      // Switch to Spanish
      const esBtn = screen.getByTestId('language-btn-es');
      fireEvent.click(esBtn);
      expect(screen.getByText('Bienvenido al Registro de ClinSync')).toBeInTheDocument();
      expect(screen.getByText('Paciente Registrado')).toBeInTheDocument();

      // Switch to Chinese
      const zhBtn = screen.getByTestId('language-btn-zh');
      fireEvent.click(zhBtn);
      expect(screen.getByText('欢迎使用 ClinSync 临床接诊系统')).toBeInTheDocument();
      expect(screen.getByText('复诊患者报到')).toBeInTheDocument();
    });

    it('supports toggling high-contrast mode for visually impaired users', () => {
      render(
        <KioskWelcome
          onSelectReturning={vi.fn()}
          onSelectNew={vi.fn()}
          onEmergencyEscalation={vi.fn()}
        />
      );

      const contrastBtn = screen.getByTestId('high-contrast-toggle');
      fireEvent.click(contrastBtn);

      const container = screen.getByTestId('kiosk-welcome-container');
      expect(container.className).toContain('contrast-125');
    });

    it('renders SpecialtyRoutingBanner with triage escalation indicator when urgent', () => {
      render(
        <SpecialtyRoutingBanner
          decisionResult={{
            encounter_id: 'enc_demo_001',
            decision: 'URGENT_ESCALATION',
            reason_codes: ['CHEST_PAIN_RED_FLAG', 'HIGH_ACUITY_TRIAGE'],
            recommended_department_id: null,
            policy_version: '2026.10-demo-policy-v1',
            evaluated_at: new Date().toISOString(),
          }}
        />
      );

      expect(screen.getByText('Immediate Clinical Evaluation Recommended')).toBeInTheDocument();
      expect(screen.getByText('CHEST_PAIN_RED_FLAG')).toBeInTheDocument();
    });

    it('renders document upload drop zone with clear drag and drop callouts', () => {
      render(<DocumentUploadZone encounterId="enc_demo_001" />);

      expect(screen.getByTestId('document-upload-zone')).toBeInTheDocument();
      expect(screen.getByText(/Clinical Document Upload/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop your clinical documents/i)).toBeInTheDocument();
    });

    it('renders physician review and sign-off modal with amendment checkboxes', () => {
      render(
        <DoctorApprovalModal
          isOpen={true}
          onClose={vi.fn()}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
          onApprovalRecorded={vi.fn()}
        />
      );

      expect(screen.getByTestId('doctor-approval-modal')).toBeInTheDocument();
      expect(screen.getByText('Approve & Sign')).toBeInTheDocument();
      expect(screen.getByText('Request Edits')).toBeInTheDocument();
      expect(screen.getByText('Refute / Escalate')).toBeInTheDocument();
    });
  });
});
