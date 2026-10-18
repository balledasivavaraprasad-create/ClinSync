import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import {
  UserCheck,
  UserPlus,
  HelpCircle,
  AlertTriangle,
  Globe,
  Eye,
  ShieldCheck,
  BellRing,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  KIOSK_TRANSLATIONS,
  type SupportedLanguage,
} from './languages';

export interface KioskWelcomeProps {
  onSelectReturning: () => void;
  onSelectNew: () => void;
  onEmergencyEscalation: () => void;
  selectedLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}

export const KioskWelcome: React.FC<KioskWelcomeProps> = ({
  onSelectReturning,
  onSelectNew,
  onEmergencyEscalation,
  selectedLanguage = 'en',
  onLanguageChange,
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(selectedLanguage);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isStaffHelpOpen, setIsStaffHelpOpen] = useState<boolean>(false);
  const [staffNotified, setStaffNotified] = useState<boolean>(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);
  const [langCategoryFilter, setLangCategoryFilter] = useState<'all' | 'global' | 'indian'>('all');

  const t = KIOSK_TRANSLATIONS[language] || KIOSK_TRANSLATIONS.en;
  const currentLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const handleCallStaff = () => {
    setStaffNotified(true);
    setTimeout(() => {
      setStaffNotified(false);
      setIsStaffHelpOpen(false);
    }, 2500);
  };

  // Top quick languages shown directly on the bar
  const quickLanguages: SupportedLanguage[] = ['en', 'es', 'zh', 'hi', 'te', 'ta', 'fr', 'de'];

  // Filtered languages for the modal selector
  const modalLanguages = SUPPORTED_LANGUAGES.filter((l) => {
    if (langCategoryFilter === 'all') return true;
    return l.category === langCategoryFilter;
  });

  return (
    <div
      data-testid="kiosk-welcome-container"
      className={`w-full max-w-4xl mx-auto space-y-6 transition-colors duration-200 ${
        highContrast ? 'contrast-125 text-black' : ''
      }`}
    >
      {/* Red-Flag Urgent Safety Alert Banner */}
      <div
        role="alert"
        data-testid="emergency-banner"
        onClick={onEmergencyEscalation}
        className="bg-rose-50 border-2 border-rose-400 hover:bg-rose-100/90 text-rose-900 px-5 py-3.5 rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-700 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-sm uppercase tracking-wider block text-rose-800">
              Emergency Clinical Alert
            </span>
            <span className="text-sm font-medium">{t.emergency}</span>
          </div>
        </div>
        <Button variant="danger" size="sm" className="hidden sm:inline-flex shrink-0">
          Urgent Help
        </Button>
      </div>

      {/* Top Controls: Comprehensive Multi-Language Selector & Accessibility */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Language & Dropdown Selector */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
              <Globe className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select Language / भाषा चुनें:
                </span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  {currentLangMeta.nativeName} ({currentLangMeta.name})
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls: High Contrast Toggle & Modal Trigger */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsLangModalOpen(true)}
              data-testid="open-language-modal-btn"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-teal-600/30 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer"
              title="Browse all 18 languages"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All 18 Languages</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setHighContrast(!highContrast)}
              data-testid="high-contrast-toggle"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                highContrast
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              aria-label="Toggle High Contrast Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>High Contrast</span>
            </button>
          </div>
        </div>

        {/* Quick Language Pills (Global & Indian) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">
            Quick Select:
          </span>

          {quickLanguages.map((code) => {
            const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code)!;
            const isSelected = language === code;
            return (
              <button
                key={code}
                onClick={() => handleSelectLanguage(code)}
                data-testid={`language-btn-${code}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 border cursor-pointer ${
                  isSelected
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="font-bold text-[11px] uppercase tracking-wider">{meta.code.toUpperCase()}</span>
                <span className="text-[11px]">{meta.nativeName}</span>
              </button>
            );
          })}

          {/* Fallback Native Select for Mobile and Accessibility */}
          <div className="ml-auto inline-flex items-center">
            <select
              aria-label="Select preferred language"
              data-testid="language-select"
              value={language}
              onChange={(e) => handleSelectLanguage(e.target.value as SupportedLanguage)}
              className="text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-md px-2 py-1 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <optgroup label="Major Global Languages (10)">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'global').map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} — {l.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Popular Indian Languages (8)">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'indian').map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} — {l.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Main Welcome Card */}
      <Card className="shadow-md border-slate-200/80 overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </CardTitle>
          <CardDescription className="text-base text-slate-600 max-w-lg mx-auto mt-1">
            {t.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 pb-8 px-6 md:px-12">
          {/* Action Choice 1: Returning Patient */}
          <button
            onClick={onSelectReturning}
            data-testid="returning-patient-btn"
            className="w-full text-left p-5 min-h-[80px] rounded-2xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 bg-white shadow-xs hover:shadow-md transition-all group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 group-hover:text-teal-900">
                  {t.returningBtn}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                  {t.fastCheckInBadge}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{t.returningDesc}</p>
            </div>
          </button>

          {/* Action Choice 2: New Patient */}
          <button
            onClick={onSelectNew}
            data-testid="new-patient-btn"
            className="w-full text-left p-5 min-h-[80px] rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 bg-white shadow-xs hover:shadow-md transition-all group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 group-hover:text-indigo-900">
                  {t.newBtn}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  {t.registrationBadge}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{t.newDesc}</p>
            </div>
          </button>

          {/* Action Choice 3: Request Staff Assistance */}
          <button
            onClick={() => setIsStaffHelpOpen(true)}
            data-testid="staff-help-btn"
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-slate-50/60 transition-all flex items-center space-x-3 cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-800 block">
                {t.staffBtn}
              </span>
              <span className="text-xs text-slate-500">{t.staffDesc}</span>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Privacy Notice Footer */}
      <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5 pb-4">
        <ShieldCheck className="w-4 h-4 text-teal-600" />
        <span>{t.privacyNote}</span>
      </div>

      {/* Full 18-Language Selection Dialog */}
      <Dialog
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        title="Select Language / अपनी भाषा चुनें"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            Choose your preferred language for the intake questionnaire and automated triage assistance:
          </p>

          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setLangCategoryFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                langCategoryFilter === 'all'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Languages (18)
            </button>
            <button
              onClick={() => setLangCategoryFilter('global')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                langCategoryFilter === 'global'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Global Languages (10)
            </button>
            <button
              onClick={() => setLangCategoryFilter('indian')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                langCategoryFilter === 'indian'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Indian Languages (8)
            </button>
          </div>

          {/* Grid of Languages with Touch-First Cards (min 48px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {modalLanguages.map((meta) => {
              const isSelected = language === meta.code;
              return (
                <button
                  key={meta.code}
                  onClick={() => {
                    handleSelectLanguage(meta.code);
                    setIsLangModalOpen(false);
                  }}
                  data-testid={`modal-language-btn-${meta.code}`}
                  className={`p-3 min-h-[48px] rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {meta.code.toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 leading-snug">
                        {meta.nativeName}
                      </div>
                      <div className="text-xs text-slate-500">{meta.name}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsLangModalOpen(false)}>
              Done / ঠিক আছে / ਹੋ ਗਿਆ
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Staff Assistance Dialog */}
      <Dialog
        isOpen={isStaffHelpOpen}
        onClose={() => setIsStaffHelpOpen(false)}
        title="Summon Staff Assistance"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            A triage nurse or front-desk coordinator will be alerted to assist you directly at Kiosk Station #01.
          </p>

          {staffNotified ? (
            <div className="p-4 bg-teal-50 border border-teal-200 text-teal-900 rounded-lg flex items-center space-x-3">
              <BellRing className="w-6 h-6 text-teal-600 animate-bounce" />
              <div>
                <p className="font-bold text-sm">Staff Alerted!</p>
                <p className="text-xs text-teal-700">A coordinator is on their way to your station.</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={() => setIsStaffHelpOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCallStaff}>
                <BellRing className="w-4 h-4 mr-2" />
                Alert Desk Now
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
