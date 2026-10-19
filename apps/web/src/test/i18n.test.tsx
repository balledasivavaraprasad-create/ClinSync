import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  LanguageProvider,
  useLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
} from '../lib/i18n';
import { LanguageSelectorDropdown } from '../components/shared/LanguageSelectorDropdown';
import { LoginPage } from '../features/authentication/LoginPage';

describe('ClinSync Multi-Language & Global i18n Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    vi.clearAllMocks();
  });

  describe('1. Supported Languages Metadata & Configuration', () => {
    it('supports all 18 required languages (10 global + 8 Indian)', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(18);

      const globalLangs = SUPPORTED_LANGUAGES.filter((l) => l.category === 'global');
      const indianLangs = SUPPORTED_LANGUAGES.filter((l) => l.category === 'indian');

      expect(globalLangs).toHaveLength(10);
      expect(indianLangs).toHaveLength(8);

      // Verify key required global languages
      const globalCodes = globalLangs.map((l) => l.code);
      expect(globalCodes).toContain('en'); // English
      expect(globalCodes).toContain('es'); // Spanish
      expect(globalCodes).toContain('zh'); // Chinese
      expect(globalCodes).toContain('fr'); // French
      expect(globalCodes).toContain('de'); // German
      expect(globalCodes).toContain('ar'); // Arabic
      expect(globalCodes).toContain('ru'); // Russian
      expect(globalCodes).toContain('ja'); // Japanese
      expect(globalCodes).toContain('pt'); // Portuguese
      expect(globalCodes).toContain('ko'); // Korean

      // Verify key required Indian languages
      const indianCodes = indianLangs.map((l) => l.code);
      expect(indianCodes).toContain('hi'); // Hindi
      expect(indianCodes).toContain('te'); // Telugu
      expect(indianCodes).toContain('ta'); // Tamil
      expect(indianCodes).toContain('kn'); // Kannada
      expect(indianCodes).toContain('bn'); // Bengali
      expect(indianCodes).toContain('mr'); // Marathi
      expect(indianCodes).toContain('gu'); // Gujarati
      expect(indianCodes).toContain('ml'); // Malayalam
    });

    it('identifies Arabic as RTL language with ar-SA locale', () => {
      const arabic = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar');
      expect(arabic).toBeDefined();
      expect(arabic?.isRTL).toBe(true);
      expect(arabic?.localeCode).toBe('ar-SA');
    });
  });

  describe('2. LanguageSelectorDropdown Component', () => {
    it('renders a compact trigger button with current language code and chevron', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      const button = screen.getByTestId('language-selector-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      // Shows default language EN
      expect(button).toHaveTextContent('EN');
    });

    it('opens dropdown popover when clicked and displays options', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      const button = screen.getByTestId('language-selector-button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      const menu = screen.getByTestId('language-dropdown-menu');
      expect(menu).toBeInTheDocument();

      // Check all 18 options are available
      expect(screen.getByTestId('language-option-en')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-es')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-hi')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-te')).toBeInTheDocument();
    });

    it('filters languages by category tab (All, Global, Indian)', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));

      // Click "Indian (8)" filter tab
      const indianTab = screen.getByRole('button', { name: /Indian \(8\)/i });
      fireEvent.click(indianTab);

      // Indian languages should be visible
      expect(screen.getByTestId('language-option-hi')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-te')).toBeInTheDocument();
      expect(screen.getByTestId('language-option-ta')).toBeInTheDocument();

      // Global languages should NOT be in the filtered list
      expect(screen.queryByTestId('language-option-es')).not.toBeInTheDocument();
      expect(screen.queryByTestId('language-option-fr')).not.toBeInTheDocument();

      // Switch to "Global (10)" tab
      const globalTab = screen.getByRole('button', { name: /Global \(10\)/i });
      fireEvent.click(globalTab);

      expect(screen.getByTestId('language-option-es')).toBeInTheDocument();
      expect(screen.queryByTestId('language-option-hi')).not.toBeInTheDocument();
    });

    it('filters languages using the quick search input', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));

      const searchInput = screen.getByTestId('language-search-input');
      fireEvent.change(searchInput, { target: { value: 'Telugu' } });

      expect(screen.getByTestId('language-option-te')).toBeInTheDocument();
      expect(screen.queryByTestId('language-option-en')).not.toBeInTheDocument();
      expect(screen.queryByTestId('language-option-es')).not.toBeInTheDocument();
    });

    it('selects a new language, updates context, saves to localStorage, and closes dropdown', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));
      fireEvent.click(screen.getByTestId('language-option-es'));

      // Dropdown should close
      expect(screen.queryByTestId('language-dropdown-menu')).not.toBeInTheDocument();

      // Trigger button should now show ES
      const button = screen.getByTestId('language-selector-button');
      expect(button).toHaveTextContent('ES');

      // localStorage should be persisted
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
      expect(document.documentElement.lang).toBe('es-ES');
    });

    it('closes dropdown when Escape key is pressed', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));
      expect(screen.getByTestId('language-dropdown-menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('language-dropdown-menu')).not.toBeInTheDocument();
    });
  });

  describe('3. Application-Wide Reactivity & Persistence', () => {
    it('restores language from localStorage on initial load', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'hi');

      const ConsumerComponent = () => {
        const { language, currentLanguageMeta } = useLanguage();
        return (
          <div data-testid="consumer">
            <span>Lang: {language}</span>
            <span>Name: {currentLanguageMeta.name}</span>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <ConsumerComponent />
        </LanguageProvider>
      );

      const consumer = screen.getByTestId('consumer');
      expect(consumer).toHaveTextContent('Lang: hi');
      expect(consumer).toHaveTextContent('Name: Hindi');
    });

    it('sets RTL document orientation when Arabic is selected', () => {
      render(
        <LanguageProvider>
          <LanguageSelectorDropdown />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));
      fireEvent.click(screen.getByTestId('language-option-ar'));

      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar-SA');
    });

    it('translates Login Page immediately upon language change', () => {
      render(
        <LanguageProvider>
          <LoginPage onLoginSuccess={vi.fn()} onBackToLanding={vi.fn()} />
        </LanguageProvider>
      );

      // Initially in English
      expect(screen.getByText('Physician Sign-In')).toBeInTheDocument();
      expect(screen.getByText('Staff Physician ID')).toBeInTheDocument();

      // Open language selector on login page and pick Spanish
      fireEvent.click(screen.getByTestId('language-selector-button'));
      fireEvent.click(screen.getByTestId('language-option-es'));

      // Verify immediate translation
      expect(screen.getByText('Acceso para Médicos')).toBeInTheDocument();
      expect(screen.getByText('ID de Médico del Personal')).toBeInTheDocument();
    });

    it('translates Login Page to Hindi immediately upon language change', () => {
      render(
        <LanguageProvider>
          <LoginPage onLoginSuccess={vi.fn()} onBackToLanding={vi.fn()} />
        </LanguageProvider>
      );

      fireEvent.click(screen.getByTestId('language-selector-button'));
      fireEvent.click(screen.getByTestId('language-option-hi'));

      // Hindi translation on login page
      expect(screen.getByText('चिकित्सक लॉगिन')).toBeInTheDocument();
      expect(screen.getByText('चिकित्सक आईडी')).toBeInTheDocument();
    });
  });
});
