import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'clinsync_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode; defaultTheme?: Theme }> = ({
  children,
  defaultTheme = 'dark',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      // Fallback
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider (e.g. isolated unit tests)
    const currentTheme =
      typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
        ? 'light'
        : 'dark';
    return {
      theme: currentTheme,
      toggleTheme: () => {},
      setTheme: () => {},
      isDark: currentTheme === 'dark',
      isLight: currentTheme === 'light',
    };
  }
  return context;
};

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = true }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      onClick={toggleTheme}
      className={`relative inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none ${
        isDark
          ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.12] shadow-sm hover:border-cyan-400/40'
          : 'bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-sm hover:border-cyan-500/50'
      } ${className}`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
      title={`Switch to ${isDark ? 'Light (Ceramic Luxe)' : 'Dark (Obsidian)'} Mode`}
      data-testid="btn-theme-toggle"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="text-amber-400"
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="text-cyan-600"
            >
              <Moon className="w-3.5 h-3.5 text-cyan-600" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <span className="font-mono text-[11px] font-semibold tracking-wide">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </motion.button>
  );
};
