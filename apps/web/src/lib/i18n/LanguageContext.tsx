import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import {
  type SupportedLanguage,
  type LanguageMeta,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageMeta,
} from './languages';
import { getTranslation, type TranslationKey } from './translations';

export const LANGUAGE_STORAGE_KEY = 'clinsync_language_preference';

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentLanguageMeta: LanguageMeta;
  supportedLanguages: readonly LanguageMeta[];
  t: (key: TranslationKey, fallback?: string) => string;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
        if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
          return saved;
        }
      } catch (err) {
        console.warn('Could not read language preference from localStorage:', err);
      }
    }
    return DEFAULT_LANGUAGE;
  });

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      } catch (err) {
        console.warn('Could not write language preference to localStorage:', err);
      }
    }
  };

  const currentLanguageMeta = useMemo(() => {
    return getLanguageMeta(language);
  }, [language]);

  const isRTL = Boolean(currentLanguageMeta.isRTL);
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  // Synchronize HTML attributes for accessibility and screen readers
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguageMeta.localeCode || language;
      document.documentElement.dir = dir;
      // Optional RTL class for CSS targeting
      if (isRTL) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    }
  }, [language, currentLanguageMeta, dir, isRTL]);

  const t = useMemo(() => {
    return (key: TranslationKey, fallback?: string) => {
      return getTranslation(language, key, fallback);
    };
  }, [language]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage,
      currentLanguageMeta,
      supportedLanguages: SUPPORTED_LANGUAGES,
      t,
      isRTL,
      dir,
    }),
    [language, currentLanguageMeta, isRTL, dir, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback for components rendered outside LanguageProvider (e.g. isolated test environments)
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      currentLanguageMeta: getLanguageMeta(DEFAULT_LANGUAGE),
      supportedLanguages: SUPPORTED_LANGUAGES,
      t: (key: TranslationKey, fallback?: string) => getTranslation(DEFAULT_LANGUAGE, key, fallback),
      isRTL: false,
      dir: 'ltr',
    };
  }
  return context;
};
