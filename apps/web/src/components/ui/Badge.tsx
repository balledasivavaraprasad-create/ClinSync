import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClinicalFactStatus } from '../../lib/api/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ClinicalFactStatus;
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  status,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center font-medium rounded-full border px-2.5 py-0.5 select-none transition-colors';

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const variants = {
    neutral: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  };

  const statusStyles: Record<ClinicalFactStatus, string> = {
    reported: 'bg-sky-50 text-sky-800 border-sky-200',
    extracted_unverified: 'bg-amber-50 text-amber-900 border-amber-300',
    historical_recorded: 'bg-slate-100 text-slate-700 border-slate-300',
    doctor_confirmed: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold',
    uncertain: 'bg-purple-50 text-purple-800 border-purple-200',
    conflicting: 'bg-red-50 text-red-800 border-red-300 font-semibold',
    rejected: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  };

  const appliedStyle = status ? statusStyles[status] : variants[variant];

  return (
    <span
      className={twMerge(clsx(base, sizes[size], appliedStyle, className))}
      {...props}
    >
      {status === 'conflicting' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
      )}
      {children}
    </span>
  );
};
