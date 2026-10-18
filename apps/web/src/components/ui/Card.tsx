import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const base = 'bg-surface rounded-xl p-6 transition-shadow';
    const variants = {
      default: 'border border-borderSubtle shadow-subtle',
      elevated: 'border border-borderSubtle shadow-card hover:shadow-elevated',
      bordered: 'border-2 border-borderSubtle',
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
  <div className={twMerge(clsx('mb-4 pb-3 border-b border-borderSubtle', className))} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={twMerge(clsx('text-xl font-semibold text-ink-primary', className))} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={twMerge(clsx('text-sm text-ink-muted mt-1', className))} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => <div className={twMerge(clsx('space-y-4', className))} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={twMerge(clsx('mt-6 pt-4 border-t border-borderSubtle flex items-center justify-between', className))}
    {...props}
  >
    {children}
  </div>
);
