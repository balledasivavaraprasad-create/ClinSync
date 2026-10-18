import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

export interface SuccessStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-8 rounded-xl border border-emerald-200 bg-emerald-50/70 text-center',
          className
        )
      )}
    >
      <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 mb-3">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h4 className="text-lg font-semibold text-emerald-950 mb-1">{title}</h4>
      <p className="text-sm text-emerald-800 max-w-md mb-5">{message}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
