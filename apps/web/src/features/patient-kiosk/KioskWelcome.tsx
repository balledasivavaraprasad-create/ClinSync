import React, { useState } from 'react';
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
import { useTheme } from '../../lib/theme';

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
  const { isLight } = useTheme();
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
      className={`w-full max-w-4xl mx-auto space-y-6 transition-colors duration-300 ${
        highContrast ? 'contrast-125' : ''
      }`}
    >
      {/* Red-Flag Urgent Safety Alert Banner */}
      <div
        role="alert"
        data-testid="emergency-banner"
        onClick={onEmergencyEscalation}
        className="bg-rose-950/60 border border-rose-500/50 hover:bg-rose-900/60 text-rose-100 px-5 py-4 rounded-2xl flex items-center justify-between cursor-pointer shadow-[0_0_30px_rgba(244,63,94,0.2)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-widest block text-rose-400 font-mono">
              Emergency Clinical Alert
            </span>
            <span className="text-sm font-medium text-rose-100">{t.emergency}</span>
          </div>
        </div>
        <Button variant="danger" size="sm" className="hidden sm:inline-flex shrink-0 font-bold tracking-wide">
          Urgent Help
        </Button>
      </div>

      {/* Top Controls: Comprehensive Multi-Language Selector & Accessibility */}
      <div className="bg-[#080d19]/80 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-white/[0.08] shadow-2xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Language & Dropdown Selector */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0 shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Select Language / भाषा चुनें:
                </span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
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
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Browse all 18 languages"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All 18 Languages</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              onClick={() => setHighContrast(!highContrast)}
              data-testid="high-contrast-toggle"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer active:scale-95 ${
                highContrast
                  ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-400/30'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/10'
              }`}
              aria-label="Toggle High Contrast Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>High Contrast</span>
            </button>
          </div>
        </div>

        {/* Quick Language Pills (Global & Indian) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-white/[0.06]">
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 border cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/25'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 border-white/[0.08] hover:text-white'
                }`}
              >
                <span className="font-bold text-[10px] uppercase tracking-wider font-mono">{meta.code.toUpperCase()}</span>
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
              className="text-xs font-medium bg-[#0b101e] border border-white/15 text-slate-200 rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none cursor-pointer"
            >
              <optgroup label="Major Global Languages (10)" className="bg-[#0b101e] text-slate-200">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'global').map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#0b101e] text-slate-200">
                    {l.nativeName} — {l.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Popular Indian Languages (8)" className="bg-[#0b101e] text-slate-200">
                {SUPPORTED_LANGUAGES.filter((l) => l.category === 'indian').map((l) => (
                  <option key={l.code} value={l.code} className="bg-[#0b101e] text-slate-200">
                    {l.nativeName} — {l.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Main Welcome Card */}
      <div className="bg-[#080d19]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="text-center pt-9 pb-5 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/25 shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-white">
            {t.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="space-y-4 pt-2 pb-9 px-6 md:px-12">
          {/* Action Choice 1: Returning Patient */}
          <button
            onClick={onSelectReturning}
            data-testid="returning-patient-btn"
            className={`w-full text-left p-6 min-h-[80px] rounded-2xl border transition-all duration-300 group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              isLight
                ? 'bg-gradient-to-b from-teal-50/90 via-cyan-50/50 to-[#edf4fc] hover:from-teal-100/90 hover:to-[#e5effa] border-teal-300 shadow-md shadow-teal-500/10 hover:shadow-xl hover:shadow-teal-500/20 hover:border-teal-400 ring-1 ring-teal-200/60'
                : 'bg-gradient-to-b from-[#0e1c2e]/70 via-[#0a1524]/60 to-[#070e18]/70 border-cyan-500/30 hover:border-cyan-400/60 shadow-lg hover:shadow-[0_0_35px_rgba(56,189,248,0.2)]'
            }`}
          >
            <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner ${
              isLight
                ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30'
                : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
            }`}>
              <UserCheck className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-lg font-bold transition-colors ${
                  isLight ? 'text-slate-900 group-hover:text-teal-700' : 'text-white group-hover:text-cyan-300'
                }`}>
                  {t.returningBtn}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${
                  isLight
                    ? 'bg-teal-100 text-teal-900 border border-teal-300 shadow-sm'
                    : 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
                }`}>
                  {t.fastCheckInBadge}
                </span>
              </div>
              <p className={`text-sm mt-1.5 leading-relaxed ${isLight ? 'text-teal-950 font-medium' : 'text-slate-400'}`}>
                {t.returningDesc}
              </p>
            </div>
          </button>

          {/* Action Choice 2: New Patient */}
          <button
            onClick={onSelectNew}
            data-testid="new-patient-btn"
            className={`w-full text-left p-6 min-h-[80px] rounded-2xl border transition-all duration-300 group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isLight
                ? 'bg-gradient-to-b from-indigo-50/90 via-sky-50/50 to-[#edf4fc] hover:from-indigo-100/90 hover:to-[#e5effa] border-indigo-300 shadow-md shadow-indigo-500/10 hover:shadow-xl hover:shadow-indigo-500/20 hover:border-indigo-400 ring-1 ring-indigo-200/60'
                : 'bg-gradient-to-b from-[#161434]/70 via-[#100e26]/60 to-[#0b0a1a]/70 border-indigo-500/30 hover:border-indigo-400/60 shadow-lg hover:shadow-[0_0_35px_rgba(99,102,241,0.2)]'
            }`}
          >
            <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner ${
              isLight
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
            }`}>
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-lg font-bold transition-colors ${
                  isLight ? 'text-slate-900 group-hover:text-indigo-700' : 'text-white group-hover:text-indigo-300'
                }`}>
                  {t.newBtn}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${
                  isLight
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-sm'
                    : 'text-indigo-300 bg-indigo-500/15 border border-indigo-500/30'
                }`}>
                  {t.registrationBadge}
                </span>
              </div>
              <p className={`text-sm mt-1.5 leading-relaxed ${isLight ? 'text-indigo-950 font-medium' : 'text-slate-400'}`}>
                {t.newDesc}
              </p>
            </div>
          </button>

          {/* Action Choice 3: Request Staff Assistance */}
          <button
            onClick={() => setIsStaffHelpOpen(true)}
            data-testid="staff-help-btn"
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer group ${
              isLight
                ? 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/90 text-slate-800'
                : 'border-white/[0.06] hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <HelpCircle className={`w-5 h-5 transition-colors ${isLight ? 'text-cyan-600' : 'text-slate-400 group-hover:text-white'}`} />
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-semibold block transition-colors ${
                isLight ? 'text-slate-900 group-hover:text-cyan-800' : 'text-slate-200 group-hover:text-white'
              }`}>
                {t.staffBtn}
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {t.staffDesc}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Privacy Notice Footer */}
      <div className="text-center text-xs text-slate-400 flex items-center justify-center space-x-2 pb-4">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>{t.privacyNote}</span>
      </div>

      {/* Full 18-Language Selection Dialog */}
      <Dialog
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        title="Select Language / अपनी भाषा चुनें"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            Choose your preferred language for the intake questionnaire and automated triage assistance:
          </p>

          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-2 border-b border-white/10 pb-2.5">
            <button
              onClick={() => setLangCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                langCategoryFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              All Languages (18)
            </button>
            <button
              onClick={() => setLangCategoryFilter('global')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                langCategoryFilter === 'global'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
              }`}
            >
              Global Languages (10)
            </button>
            <button
              onClick={() => setLangCategoryFilter('indian')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                langCategoryFilter === 'indian'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/[0.05] text-slate-400 hover:text-white'
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
                      ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-md shadow-cyan-500/10'
                      : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-white/[0.06] text-cyan-300 border border-white/10">
                      {meta.code.toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-white leading-snug">
                        {meta.nativeName}
                      </div>
                      <div className="text-xs text-slate-400">{meta.name}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-white/10">
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
          <p className="text-sm text-slate-300">
            A triage nurse or front-desk coordinator will be alerted to assist you directly at Kiosk Station #01.
          </p>

          {staffNotified ? (
            <div className="p-4 bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 rounded-xl flex items-center space-x-3">
              <BellRing className="w-6 h-6 text-cyan-400 animate-bounce shrink-0" />
              <div>
                <p className="font-bold text-sm text-white">Staff Alerted!</p>
                <p className="text-xs text-cyan-300">A coordinator is on their way to your station.</p>
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
