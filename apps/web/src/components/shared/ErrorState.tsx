import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  code,
  onRetry,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col items-center justify-center p-6 rounded-xl border border-red-200 bg-red-50/70 text-center',
          className
        )
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="p-3 bg-red-100 rounded-full text-red-600 mb-3">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h4 className="text-lg font-semibold text-red-900 mb-1">{title}</h4>
      <p className="text-sm text-red-700 max-w-md mb-2">{message}</p>
      {code && (
        <span className="text-xs font-mono text-red-500 bg-red-100/50 px-2 py-0.5 rounded border border-red-200 mb-4">
          Error code: {code}
        </span>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
