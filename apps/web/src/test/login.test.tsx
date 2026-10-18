import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../features/authentication/LoginPage';

describe('LoginPage Component', () => {
  it('renders hospital portal title and login form inputs', () => {
    const handleLoginSuccess = vi.fn();
    const handleBackToLanding = vi.fn();

    render(
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );

    expect(screen.getByText('ClinSync')).toBeInTheDocument();
    expect(screen.getByText('Hospital Portal')).toBeInTheDocument();
    expect(screen.getByText('Physician Sign-In')).toBeInTheDocument();
    expect(screen.getByTestId('input-login-userid')).toBeInTheDocument();
    expect(screen.getByTestId('input-login-passcode')).toBeInTheDocument();
    expect(screen.getByTestId('btn-login-submit')).toBeInTheDocument();
  });

  it('switches between Doctor, Kiosk, and Auditor roles', () => {
    const handleLoginSuccess = vi.fn();
    const handleBackToLanding = vi.fn();

    render(
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );

    // Click Kiosk tab
    fireEvent.click(screen.getByTestId('role-tab-kiosk'));
    expect(screen.getByText('Tablet Kiosk Activation')).toBeInTheDocument();

    // Click Auditor tab
    fireEvent.click(screen.getByTestId('role-tab-auditor'));
    expect(screen.getByText('Clinical Auditor Access')).toBeInTheDocument();

    // Click Doctor tab
    fireEvent.click(screen.getByTestId('role-tab-doctor'));
    expect(screen.getByText('Physician Sign-In')).toBeInTheDocument();
  });

  it('populates fields when a 1-click quick-fill preset is selected', () => {
    const handleLoginSuccess = vi.fn();
    const handleBackToLanding = vi.fn();

    render(
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );

    fireEvent.click(screen.getByTestId('preset-dr-marcus'));
    const input = screen.getByTestId('input-login-userid') as HTMLInputElement;
    expect(input.value).toBe('dr_marcus_vance');
  });

  it('submits doctor login successfully and triggers onLoginSuccess callback', async () => {
    const handleLoginSuccess = vi.fn();
    const handleBackToLanding = vi.fn();

    render(
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );

    fireEvent.click(screen.getByTestId('preset-dr-clara'));
    fireEvent.click(screen.getByTestId('btn-login-submit'));

    await waitFor(() => {
      expect(handleLoginSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'doctor',
          userId: 'dr_clara_chen',
          userName: 'Dr. Clara Chen, MD',
        })
      );
    });
  });

  it('triggers onBackToLanding when Landing Page button is clicked', () => {
    const handleLoginSuccess = vi.fn();
    const handleBackToLanding = vi.fn();

    render(
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={handleBackToLanding}
      />
    );

    fireEvent.click(screen.getByTestId('btn-login-back-to-landing'));
    expect(handleBackToLanding).toHaveBeenCalledTimes(1);
  });
});
