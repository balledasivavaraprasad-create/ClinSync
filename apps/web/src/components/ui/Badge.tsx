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
    'inline-flex items-center font-medium rounded-full border px-2.5 py-0.5 select-none transition-all duration-200 tracking-wide';

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variants = {
    neutral: 'bg-slate-800/80 text-slate-200 border-white/10 shadow-sm',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10',
    error: 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm shadow-rose-500/10',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-sm shadow-sky-500/10',
  };

  const statusStyles: Record<ClinicalFactStatus, string> = {
    reported: 'bg-sky-500/15 border-sky-500/30 font-mono text-[11px] text-sky-800',
    extracted_unverified: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-mono text-[11px]',
    historical_recorded: 'bg-slate-800/80 text-slate-300 border-white/10 font-mono text-[11px]',
    doctor_confirmed: 'bg-emerald-500/15 border-emerald-500/30 font-mono text-[11px] font-semibold text-emerald-900',
    uncertain: 'bg-purple-500/15 text-purple-300 border-purple-500/30 font-mono text-[11px]',
    conflicting: 'bg-red-500/20 border-red-500/40 font-mono text-[11px] font-semibold text-red-800',
    rejected: 'bg-slate-900/60 text-slate-500 border-slate-700/60 line-through',
  };

  const appliedStyle = status ? statusStyles[status] : variants[variant];

  return (
    <span
      className={twMerge(clsx(base, sizes[size], appliedStyle, className))}
      {...props}
    >
      {status === 'conflicting' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
      {status === 'doctor_confirmed' && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
      {children}
    </span>
  );
};
