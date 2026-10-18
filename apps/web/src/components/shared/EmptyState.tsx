import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FileText } from 'lucide-react';
import { Button } from '../ui/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-borderSubtle bg-surfaceMuted text-center',
          className
        )
      )}
    >
      <div className="p-3 bg-surface rounded-full shadow-subtle mb-3 text-brand-600">
        {icon || <FileText className="h-8 w-8" />}
      </div>
      <h4 className="text-lg font-semibold text-ink-primary mb-1">{title}</h4>
      <p className="text-sm text-ink-muted max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
