import type { Variants } from 'motion/react';

/**
 * Standard animation variants for ClinSync
 * Strict adherence to calm clinical tone, avoiding jarring or excessive motion.
 */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const stepTransition: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 24 : -24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 24 : -24,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  }),
};

export const listeningPulse: Variants = {
  idle: { scale: 1, opacity: 0.8 },
  listening: {
    scale: [1, 1.08, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
