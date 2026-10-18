/**
 * ClinSync Design Tokens
 * Source of truth: docs/UI_UX_DIRECTION.md
 */

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  ink: {
    primary: '#0F172A',
    secondary: '#334155',
    muted: '#64748B',
    inverted: '#FFFFFF',
  },

  brand: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
  },

  semantic: {
    success: '#059669',
    successBg: '#ECFDF5',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    info: '#0284C7',
    infoBg: '#F0F9FF',
  },

  clinicalStatus: {
    reported: {
      label: 'Reported by Patient',
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
    },
    extracted_unverified: {
      label: 'Extracted (Unverified)',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
    },
    historical_recorded: {
      label: 'Historical Record',
      color: '#475569',
      bg: '#F8FAFC',
      border: '#CBD5E1',
    },
    doctor_confirmed: {
      label: 'Doctor Confirmed',
      color: '#059669',
      bg: '#ECFDF5',
      border: '#A7F3D0',
    },
    uncertain: {
      label: 'Uncertain / Ambiguous',
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
    },
    conflicting: {
      label: 'Contradiction / Conflict',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
    },
    rejected: {
      label: 'Clinician Rejected',
      color: '#94A3B8',
      bg: '#F1F5F9',
      border: '#CBD5E1',
    },
  },
} as const;

export const touchTargets = {
  minSizePx: 48,
  minSizeClass: 'min-h-[48px] min-w-[48px]',
} as const;

export const typography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  scale: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-2xl font-semibold tracking-tight',
    h3: 'text-xl font-semibold',
    bodyLarge: 'text-lg font-normal leading-relaxed',
    body: 'text-base font-normal leading-normal',
    bodySmall: 'text-sm font-normal leading-snug',
    caption: 'text-xs font-medium uppercase tracking-wider',
  },
} as const;

export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-out',
} as const;
