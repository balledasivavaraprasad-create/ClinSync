import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Processing clinical record...',
  variant = 'spinner',
  className,
}) => {
  if (variant === 'skeleton') {
    return (
      <div
        className={twMerge(clsx('w-full space-y-4 animate-pulse p-4', className))}
        aria-busy="true"
        aria-label="Loading content"
      >
        <div className="h-6 bg-slate-200 rounded-md w-3/4" />
        <div className="h-4 bg-slate-200 rounded-md w-1/2" />
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-slate-100 rounded-md w-full" />
          <div className="h-4 bg-slate-100 rounded-md w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-8 space-y-4 text-center',
          className
        )
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-brand-100 border-t-brand-600 animate-spin" />
      </div>
      <p className="text-base font-medium text-ink-secondary">{message}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
};
