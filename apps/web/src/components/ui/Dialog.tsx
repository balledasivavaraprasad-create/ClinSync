import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div
        className={twMerge(
          clsx(
            'relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-elevated border border-borderSubtle transition-all',
            className
          )
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-borderSubtle">
          <div>
            <h2 id="dialog-title" className="text-xl font-semibold text-ink-primary">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-ink-muted mt-1">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 min-h-[44px] min-w-[44px] text-ink-muted hover:text-ink-primary -mr-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
