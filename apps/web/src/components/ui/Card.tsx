import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const base = 'bg-white dark:bg-surface backdrop-blur-xl rounded-2xl p-6 transition-all duration-300 text-slate-900 dark:text-slate-100';
    const variants = {
      default: 'border border-slate-200 dark:border-borderSubtle shadow-sm dark:shadow-card hover:border-slate-300 dark:hover:border-white/15',
      elevated: 'border border-slate-200 dark:border-borderSubtle shadow-md dark:shadow-elevated hover:border-teal-500/40 dark:hover:border-teal-400/30 hover:shadow-lg dark:hover:shadow-glow',
      bordered: 'border-2 border-slate-300 dark:border-borderSubtle hover:border-teal-500/50 dark:hover:border-teal-400/40',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx(base, variants[variant], className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('mb-4 pb-3 border-b border-slate-200 dark:border-borderSubtle', className))} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={twMerge(clsx('text-xl font-bold text-slate-900 dark:text-white tracking-tight', className))} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={twMerge(clsx('text-sm text-slate-500 dark:text-slate-400 mt-1', className))} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('space-y-4', className))} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge(clsx('mt-6 pt-4 border-t border-borderSubtle flex items-center justify-between', className))} {...props}>
    {children}
  </div>
);
