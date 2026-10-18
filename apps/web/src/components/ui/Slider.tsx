import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  className,
  label,
  value,
  min = 0,
  max = 10,
  step = 1,
  unit,
  onChange,
  id,
  ...props
}) => {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'slider-input');

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        {label && (
          <label htmlFor={sliderId} className="text-sm font-medium text-ink-primary">
            {label}
          </label>
        )}
        <span className="text-base font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
          {value} {unit}
        </span>
      </div>

      <div className="relative flex items-center min-h-[48px]">
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={twMerge(
            clsx(
              'w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
              className
            )
          )}
          {...props}
        />
      </div>

      <div className="flex justify-between text-xs text-ink-muted">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};
