/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#05070d',
        surface: 'rgba(255, 255, 255, 0.035)',
        surfaceMuted: 'rgba(255, 255, 255, 0.02)',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        ink: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#64748b',
          inverted: '#05070d',
        },
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        clinical: {
          reported: '#38bdf8',
          extracted: '#f59e0b',
          historical: '#94a3b8',
          confirmed: '#10b981',
          uncertain: '#a855f7',
          conflicting: '#ef4444',
          rejected: '#64748b',
        },
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Outfit',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
        serif: [
          'Outfit',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
        card: '0 10px 30px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        elevated: '0 20px 50px -15px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        glow: '0 0 25px -5px rgba(20, 184, 166, 0.4)',
      },
    },
  },
  plugins: [],
};
