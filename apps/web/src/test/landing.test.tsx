import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingPage } from '../features/landing/LandingPage';
import { App } from '../app/App';

describe('ClinSync Landing Page & Prototype Integration Suite', () => {
  it('renders landing page with headline, editorial copy, and core sections', () => {
    const handleLaunch = vi.fn();
    const { container } = render(<LandingPage onLaunchApp={handleLaunch} />);

    // Editorial headline lines
    expect(screen.getAllByText(/Know the patient/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/before you meet/i).length).toBeGreaterThan(0);

    // Supporting copy
    expect(
      screen.getByText(/turns a patient's voice, documents and years of fragmented records into a concise/i)
    ).toBeInTheDocument();

    // Main section titles (split into spans by typography engine)
    expect(container.textContent).toContain("A doctor's most valuable resource is");
    expect(container.textContent).toContain("From a patient's voice to a doctor's");
    expect(container.textContent).toContain("The patient simply");
    expect(container.textContent).toContain("Not a questionnaire. A");
    expect(container.textContent).toContain("The heart of ClinSync. An");
    expect(container.textContent).toContain("The 60-second");
    expect(container.textContent).toContain("Clinical data is not ordinary application data");
    expect(container.textContent).toContain("Built for the demo. Architected for the future");
  });

  it('renders interactive visual containers for voice wave, chat, evidence, and doctor brief', () => {
    const handleLaunch = vi.fn();
    const { container } = render(<LandingPage onLaunchApp={handleLaunch} />);

    expect(container.querySelector('#preloader')).toBeInTheDocument();
    expect(container.querySelector('#voiceWave')).toBeInTheDocument();
    expect(container.querySelector('#chat')).toBeInTheDocument();
    expect(container.querySelector('#timeline')).toBeInTheDocument();
    expect(container.querySelector('#claims')).toBeInTheDocument();
    expect(container.querySelector('#briefDoc')).toBeInTheDocument();
    expect(container.querySelector('#scrolly')).toBeInTheDocument();
  });

  it('calls onLaunchApp when clicking hero "Launch Web App" button', () => {
    const handleLaunch = vi.fn();
    render(<LandingPage onLaunchApp={handleLaunch} />);

    // Hero launch button
    const heroLaunchBtns = screen.getAllByRole('button', { name: /Launch Web App/i });
    expect(heroLaunchBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(heroLaunchBtns[0]);
    expect(handleLaunch).toHaveBeenCalledWith('kiosk');
  });

  it('calls onLaunchApp with doctor tab when clicking "Start consultation" in brief section', () => {
    const handleLaunch = vi.fn();
    render(<LandingPage onLaunchApp={handleLaunch} />);

    const startConsultBtn = screen.getByRole('button', { name: /Start consultation/i });
    fireEvent.click(startConsultBtn);
    expect(handleLaunch).toHaveBeenCalledWith('doctor');
  });

  it('navigates seamlessly between Landing Page and Prototype in App root', () => {
    // Reset window hash
    window.location.hash = '';

    render(<App />);

    // Initially on landing page
    expect(screen.getByText(/Pre-consultation intelligence/i)).toBeInTheDocument();
    expect(screen.queryByTestId('btn-back-to-landing')).not.toBeInTheDocument();

    // Click launch button to enter prototype
    const heroLaunchBtn = screen.getAllByRole('button', { name: /Launch Web App/i })[0];
    fireEvent.click(heroLaunchBtn);

    // Now inside the prototype
    expect(screen.getByTestId('btn-back-to-landing')).toBeInTheDocument();
    expect(screen.getByText(/Phase 1–6 Prototype/i)).toBeInTheDocument();

    // Click back to landing page
    fireEvent.click(screen.getByTestId('btn-back-to-landing'));

    // Returns to landing page
    expect(screen.getByText(/Pre-consultation intelligence/i)).toBeInTheDocument();
  });

  it('toggles between dark and light modes on the landing page', () => {
    const handleLaunch = vi.fn();
    render(
      <App />
    );

    const themeToggleBtn = screen.getByTestId('landing-theme-toggle');
    expect(themeToggleBtn).toBeInTheDocument();

    const initialTheme = document.documentElement.getAttribute('data-theme');
    fireEvent.click(themeToggleBtn);

    const toggledTheme = document.documentElement.getAttribute('data-theme');
    expect(toggledTheme).not.toBe(initialTheme);

    // Toggle back
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe(initialTheme);
  });
});
