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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div
        className={twMerge(
          clsx(
            'relative w-full max-w-lg rounded-2xl bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl border border-white/10 text-slate-100 transition-all shadow-black/80',
            className
          )
        )}
      >
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <h2 id="dialog-title" className="text-xl font-bold text-white tracking-tight">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="text-sm text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 min-h-[36px] min-w-[36px] text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
