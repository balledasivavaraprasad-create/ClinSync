import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KioskLayout } from '../layouts/KioskLayout';
import { DoctorConsoleLayout } from '../layouts/DoctorConsoleLayout';
import { LuxuryMasterDashboard } from '../features/luxury-dashboard';

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

  describe('LuxuryMasterDashboard Mobile & Portrait Navigation Dropdown', () => {
    it('renders dropdown menu selector on mobile and portrait views and switches tabs', () => {
      const handleOpenDoctor = vi.fn();
      const handleSelectTab = vi.fn();

      render(
        <LuxuryMasterDashboard
          activeTab="dashboard"
          onOpenDoctorConsole={handleOpenDoctor}
          onSelectTab={handleSelectTab}
        >
          <div>Dashboard Child Content</div>
        </LuxuryMasterDashboard>
      );

      // Verify mobile / portrait nav container is rendered
      const navContainer = screen.getByTestId('mobile-portrait-nav-container');
      expect(navContainer).toBeInTheDocument();
      expect(navContainer).toHaveClass('clinsync-mobile-nav');

      // Test the Navigation Menu button requested by user
      const menuButton = screen.getByTestId('mobile-nav-menu-button');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Clicking Navigation Menu button drops down the menu
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      // Check that mobile navigation menu is visible
      const dropdownMenu = screen.getByTestId('mobile-nav-dropdown-menu');
      expect(dropdownMenu).toBeInTheDocument();

      // All 5 user-facing navigation options should be available
      expect(screen.getByTestId('mobile-tab-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-kiosk')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-ledger-diff')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-appointments')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-doctor-console')).toBeInTheDocument();

      // Developer-only internal tabs should be removed
      expect(screen.queryByTestId('mobile-tab-visual-qa')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-tab-showroom')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-tab-mock-api')).not.toBeInTheDocument();

      // Select Doctor Console
      const doctorOption = screen.getByTestId('mobile-tab-doctor-console');
      fireEvent.click(doctorOption);

      expect(handleOpenDoctor).toHaveBeenCalledTimes(1);
    });

    it('toggles dropdown closed when clicking Navigation Menu button again or clicking dropdown trigger', async () => {
      render(
        <LuxuryMasterDashboard activeTab="kiosk">
          <div>Kiosk Content</div>
        </LuxuryMasterDashboard>
      );

      const menuButton = screen.getByTestId('mobile-nav-menu-button');
      const dropdownTrigger = screen.getByTestId('mobile-nav-dropdown-trigger');

      // Initially closed
      expect(screen.queryByTestId('mobile-nav-dropdown-menu')).not.toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Open via dropdown trigger
      fireEvent.click(dropdownTrigger);
      expect(screen.getByTestId('mobile-nav-dropdown-menu')).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');

      // Close via menu button
      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-nav-dropdown-menu')).not.toBeInTheDocument();
      });
    });
  });
});
