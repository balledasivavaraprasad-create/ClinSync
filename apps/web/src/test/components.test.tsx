import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Slider } from '../components/ui/Slider';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState } from '../components/shared/LoadingState';
import { EmptyState } from '../components/shared/EmptyState';
import { ErrorState } from '../components/shared/ErrorState';
import { SuccessState } from '../components/shared/SuccessState';

describe('UI Primitives and Design System Components', () => {
  describe('Button Component', () => {
    it('renders with default primary styles and handles clicks', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Confirm Check-in</Button>);

      const btn = screen.getByRole('button', { name: /confirm check-in/i });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain('min-h-[48px]');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('displays loading spinner and disables clicks when isLoading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Submitting
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports all variants without runtime error', () => {
      const { rerender } = render(<Button variant="primary">Test</Button>);
      expect(screen.getByRole('button').className).toContain('bg-brand-600');

      rerender(<Button variant="secondary">Test</Button>);
      expect(screen.getByRole('button').className).toContain('bg-surfaceMuted');

      rerender(<Button variant="danger">Test</Button>);
      expect(screen.getByRole('button').className).toContain('bg-red-600');
    });
  });

  describe('Card Component', () => {
    it('renders card with title and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Encounter Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Vitals normal.</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Encounter Details')).toBeInTheDocument();
      expect(screen.getByText('Vitals normal.')).toBeInTheDocument();
    });
  });

  describe('Badge Component & Clinical Status Taxonomy', () => {
    it('renders distinct styles for clinical fact statuses', () => {
      const { rerender } = render(<Badge status="reported">Reported</Badge>);
      expect(screen.getByText('Reported').className).toContain('text-sky-800');

      rerender(<Badge status="conflicting">Conflict</Badge>);
      expect(screen.getByText('Conflict').className).toContain('text-red-800');

      rerender(<Badge status="doctor_confirmed">Confirmed</Badge>);
      expect(screen.getByText('Confirmed').className).toContain('text-emerald-900');
    });
  });

  describe('Input Component', () => {
    it('renders with label and helper text', () => {
      render(
        <Input
          label="Patient Name"
          helperText="Legal name from ID card"
          placeholder="e.g. Jane Doe"
        />
      );

      expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument();
      expect(screen.getByText('Legal name from ID card')).toBeInTheDocument();
    });

    it('renders accessible error message when error prop is provided', () => {
      render(
        <Input
          label="Passcode"
          error="Passcode must be 4 digits"
        />
      );

      const input = screen.getByLabelText(/passcode/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Passcode must be 4 digits')).toBeInTheDocument();
    });
  });

  describe('Slider Component', () => {
    it('renders touch slider and triggers onChange', () => {
      const handleChange = vi.fn();
      render(
        <Slider
          label="Pain Score"
          value={5}
          min={0}
          max={10}
          unit="/ 10"
          onChange={handleChange}
        />
      );

      expect(screen.getByText('Pain Score')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '8' } });
      expect(handleChange).toHaveBeenCalledWith(8);
    });
  });

  describe('Dialog Component', () => {
    it('renders modal dialog when open and calls onClose on Escape key', () => {
      const handleClose = vi.fn();
      render(
        <Dialog isOpen={true} onClose={handleClose} title="Patient Consent">
          <p>Consent body text</p>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Patient Consent')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when isOpen is false', () => {
      render(
        <Dialog isOpen={false} onClose={vi.fn()} title="Hidden Dialog">
          <p>Hidden body</p>
        </Dialog>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Feedback States', () => {
    it('renders LoadingState with spinner and skeleton variants', () => {
      const { rerender } = render(<LoadingState message="Connecting to queue..." />);
      expect(screen.getByText('Connecting to queue...')).toBeInTheDocument();

      rerender(<LoadingState variant="skeleton" />);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    it('renders EmptyState with action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No records"
          description="Empty description"
          actionLabel="Add Record"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No records')).toBeInTheDocument();
      const actionBtn = screen.getByRole('button', { name: /add record/i });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders ErrorState with retry trigger', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Sync Failed"
          message="Could not reach database."
          code="ERR_DB_TIMEOUT"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/could not reach database/i)).toBeInTheDocument();
      expect(screen.getByText(/ERR_DB_TIMEOUT/i)).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('renders SuccessState with confirmation message', () => {
      render(
        <SuccessState
          title="Appointment Booked"
          message="Your slot has been reserved."
        />
      );

      expect(screen.getByText('Appointment Booked')).toBeInTheDocument();
      expect(screen.getByText('Your slot has been reserved.')).toBeInTheDocument();
    });
  });
});
