import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KioskLayout } from '../layouts/KioskLayout';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';

describe('Layout Shells for Kiosk and Doctor Workstation', () => {
  describe('KioskLayout', () => {
    it('renders tablet-first kiosk shell with accessibility features and progress indicators', () => {
      const handleReset = vi.fn();
      const handleHelp = vi.fn();

      render(
        <KioskLayout
          title="St. Jude Tablet Kiosk"
          subtitle="Emergency Department Intake"
          currentStep={2}
          totalSteps={4}
          onResetSession={handleReset}
          onHelp={handleHelp}
        >
          <div data-testid="kiosk-content">Welcome Screen Content</div>
        </KioskLayout>
      );

      expect(screen.getByText('St. Jude Tablet Kiosk')).toBeInTheDocument();
      expect(screen.getByText('Emergency Department Intake')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByTestId('kiosk-content')).toBeInTheDocument();

      const helpBtn = screen.getByRole('button', { name: /staff assistance/i });
      fireEvent.click(helpBtn);
      expect(handleHelp).toHaveBeenCalledTimes(1);

      const resetBtn = screen.getByRole('button', { name: /start over/i });
      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('DoctorConsoleLayout', () => {
    it('renders workstation console with doctor info and queue alert badges', () => {
      const handleLogout = vi.fn();

      render(
        <DoctorConsoleLayout
          doctorName="Dr. Marcus Vance, MD"
          department="Outpatient Cardiology"
          activePatientCount={5}
          onLogout={handleLogout}
        >
          <div data-testid="doctor-content">Queue Chart Review Area</div>
        </DoctorConsoleLayout>
      );

      expect(screen.getByText('Dr. Marcus Vance, MD')).toBeInTheDocument();
      expect(screen.getByText('Outpatient Cardiology')).toBeInTheDocument();
      expect(screen.getByText('5 Pending')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-content')).toBeInTheDocument();

      const logoutBtn = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(logoutBtn);
      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });
});
