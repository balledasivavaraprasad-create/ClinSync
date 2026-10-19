import React, { useState, useRef, useEffect, useId } from 'react';
import { Globe, ChevronDown, Check, Search, X } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { useTheme } from '../../lib/theme';
import type { SupportedLanguage } from '../../lib/i18n/languages';

export interface LanguageSelectorDropdownProps {
  variant?: 'compact' | 'full' | 'pill';
  showCategoryTabs?: boolean;
  align?: 'left' | 'right';
  className?: string;
  testId?: string;
}

export const LanguageSelectorDropdown: React.FC<LanguageSelectorDropdownProps> = ({
  variant = 'compact',
  showCategoryTabs = true,
  align = 'right',
  className = '',
  testId = 'language-selector-dropdown',
}) => {
  const { language, setLanguage, currentLanguageMeta, supportedLanguages, isRTL } = useLanguage();
  const { isLight } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'global' | 'indian'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter languages based on search query and category
  const filteredLanguages = supportedLanguages.filter((lang) => {
    const matchesCategory =
      activeCategory === 'all' ? true : lang.category === activeCategory;

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase().trim();
    return (
      lang.name.toLowerCase().includes(query) ||
      lang.nativeName.toLowerCase().includes(query) ||
      lang.code.toLowerCase().includes(query) ||
      lang.localeCode.toLowerCase().includes(query)
    );
  });

  const handleSelect = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      data-testid={testId}
    >
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Select language. Currently selected: ${currentLanguageMeta.name}`}
        data-testid="language-selector-button"
        className={`group flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50 active:scale-98 ${
          variant === 'full' ? 'w-full justify-between' : variant === 'pill' ? 'px-2.5 py-1 text-xs' : ''
        } ${
          isOpen
            ? isLight
              ? 'bg-cyan-50/90 border-cyan-400 text-cyan-950 shadow-sm'
              : 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            : isLight
            ? 'bg-white/80 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] hover:border-white/20 text-slate-200'
        }`}
      >
        <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
          <Globe className="w-3 h-3" />
        </span>

        <span className="text-xs font-semibold tracking-wide flex items-center space-x-1">
          <span className="font-mono text-[11px] uppercase text-cyan-400 font-bold">
            {currentLanguageMeta.code.toUpperCase()}
          </span>
          <span className="hidden sm:inline text-slate-300 font-normal">•</span>
          <span className="hidden sm:inline truncate max-w-[100px]">
            {currentLanguageMeta.nativeName}
          </span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-slate-200'
          }`}
        />
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Supported Languages"
          data-testid="language-dropdown-menu"
          className={`absolute z-50 mt-2 w-72 sm:w-80 rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-200 overflow-hidden ${
            align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          } ${
            isLight
              ? 'bg-white/95 border-slate-200 shadow-slate-900/15 text-slate-900'
              : 'bg-[#090e1a]/95 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-slate-100'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Language (18)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/20">
                {currentLanguageMeta.name}
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages / भाषा खोजें..."
                data-testid="language-search-input"
                className={`w-full text-xs pl-8 pr-7 py-1.5 rounded-xl border focus:outline-none focus:ring-1 transition-all ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500'
                    : 'bg-white/[0.04] border-white/[0.1] text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {showCategoryTabs && (
              <div className="flex items-center space-x-1 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeCategory === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                  }`}
                >
                  All (18)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('global')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeCategory === 'global'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                  }`}
                >
                  Global (10)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('indian')}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeCategory === 'indian'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                  }`}
                >
                  Indian (8)
                </button>
              </div>
            )}
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-white/[0.03]">
            {filteredLanguages.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No languages match &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const isSelected = item.code === language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`language-option-${item.code}`}
                    onClick={() => handleSelect(item.code)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                      isSelected
                        ? isLight
                          ? 'bg-cyan-100/70 text-cyan-950 font-semibold'
                          : 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-400/30'
                        : isLight
                        ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-950'
                        : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-7 h-6 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center font-mono font-bold text-[10px] text-cyan-400 uppercase">
                        {item.code}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs flex items-center space-x-1.5">
                          <span>{item.nativeName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({item.name})
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.localeCode} • {item.category === 'global' ? 'Global' : 'Indian'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 bg-white/[0.02] border-t border-white/[0.06] text-center text-[10px] text-slate-500 font-mono">
            {isRTL ? 'يدعم قراءة الاتجاه من اليمين لليسار' : 'Instant live translation • Persists across sessions'}
          </div>
        </div>
      )}
    </div>
  );
};
