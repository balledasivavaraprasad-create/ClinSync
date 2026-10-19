import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Clock,
  FileText,
  Calendar,
  Pill,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

export interface ProfileDropdownMenuProps {
  currentUser?: {
    role: string;
    userId: string;
    userName: string;
    department?: string;
  } | null;
  onNavigateToTab?: (tab: string) => void;
  onSelectProfileSubtab?: (subtab: string) => void;
  onOpenLogin?: () => void;
  onSignOut?: () => void;
}

export const ProfileDropdownMenu: React.FC<ProfileDropdownMenuProps> = ({
  currentUser,
  onNavigateToTab,
  onSelectProfileSubtab,
  onOpenLogin,
  onSignOut,
}) => {
  const { isLight } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Derived user display info
  const isDoctor = currentUser?.role === 'doctor';
  const isAuditor = currentUser?.role === 'auditor';
  const displayName = currentUser?.userName || 'Eleanor Johnson';
  const roleLabel = isDoctor
    ? 'Attending Physician'
    : isAuditor
    ? 'Clinical Auditor'
    : 'Registered Patient';
  
  const idBadge = isDoctor
    ? 'MD-CAR-042'
    : isAuditor
    ? 'AUD-8821'
    : 'MRN-EJ-829104';

  // Compute initials (e.g. "Eleanor Johnson" -> "EJ")
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'EJ';

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const navigateToProfileSection = (subtab: string) => {
    if (onSelectProfileSubtab) {
      onSelectProfileSubtab(subtab);
    }
    if (onNavigateToTab) {
      onNavigateToTab('profile');
    } else {
      window.location.hash = `#/app/profile/${subtab}`;
    }
  };

  const menuOptions = [
    {
      id: 'profile',
      label: 'My Profile',
      icon: User,
      action: () => navigateToProfileSection('personal'),
      description: 'Personal info, emergency contacts & demographics',
    },
    {
      id: 'history',
      label: 'My Medical History',
      icon: Clock,
      action: () => navigateToProfileSection('timeline'),
      description: 'Chronological clinical events & encounter timeline',
    },
    {
      id: 'documents',
      label: 'My Documents',
      icon: FileText,
      action: () => navigateToProfileSection('documents'),
      description: 'Prescriptions, lab panels & imaging reports',
    },
    {
      id: 'appointments',
      label: 'My Appointments',
      icon: Calendar,
      action: () => {
        if (onNavigateToTab) {
          onNavigateToTab('appointments');
        } else {
          window.location.hash = '#/app/appointments';
        }
      },
      description: 'Upcoming consultations & booking slots',
    },
    {
      id: 'medications',
      label: 'Medications & Allergies',
      icon: Pill,
      action: () => navigateToProfileSection('medications'),
      description: 'Active prescriptions, dosages & verified reactions',
    },
    {
      id: 'consent',
      label: 'Consent & Privacy',
      icon: ShieldCheck,
      action: () => navigateToProfileSection('consent'),
      description: 'HIPAA authorization, EHR exchange & AI triage audit',
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: Settings,
      action: () => navigateToProfileSection('settings'),
      description: 'Language, notifications & security passcodes',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      action: () => setIsHelpModalOpen(true),
      description: '24/7 Nurse triage, urgent care & hospital directory',
    },
  ];

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Top Header Circular Profile Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
          isOpen
            ? isLight
              ? 'bg-cyan-50/90 border-cyan-400 text-slate-900 shadow-sm'
              : 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            : isLight
            ? 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200 text-slate-800'
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-slate-200'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Open User Profile & Account Menu"
        data-testid="profile-circle-btn"
      >
        {/* Avatar Circle */}
        <div className="relative">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-transform duration-200 group-hover:scale-105 ${
              isDoctor
                ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/40'
                : isAuditor
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white ring-2 ring-purple-400/40'
                : 'bg-gradient-to-tr from-teal-500 to-cyan-600 text-white shadow-teal-500/25 ring-2 ring-teal-400/40'
            }`}
          >
            {initials}
          </div>
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070a14]"
            title="Session active & verified"
          />
        </div>

        {/* Short Label for Desktop */}
        <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
          <span className="text-xs font-semibold max-w-[110px] truncate">
            {displayName}
          </span>
          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {idBadge}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-500' : isLight ? 'text-slate-400' : 'text-slate-500'
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`absolute right-0 mt-2.5 w-80 sm:w-84 rounded-2xl shadow-2xl z-50 overflow-hidden border backdrop-blur-2xl ${
              isLight
                ? 'bg-white/95 border-slate-200 text-slate-900 divide-y divide-slate-100 shadow-slate-300/50'
                : 'bg-[#090d19]/95 border-white/[0.12] text-slate-100 divide-y divide-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
            }`}
            role="menu"
            aria-orientation="vertical"
            data-testid="profile-dropdown-menu"
          >
            {/* Header: User Profile Summary Card */}
            <div className={`p-4 ${isLight ? 'bg-slate-50/80' : 'bg-white/[0.02]'}`}>
              <div className="flex items-center space-x-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md ${
                    isDoctor
                      ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white'
                      : isAuditor
                      ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                      : 'bg-gradient-to-tr from-teal-500 to-cyan-600 text-white'
                  }`}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate tracking-tight">{displayName}</h4>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isDoctor
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          : isAuditor
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                      }`}
                    >
                      {roleLabel}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 truncate">
                      {idBadge}
                    </span>
                  </div>
                  {currentUser?.department && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {currentUser.department}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Navigation Items (1 through 8) */}
            <div className="py-1.5 px-1 max-h-[360px] overflow-y-auto">
              {menuOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.action)}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-start space-x-3 transition-colors cursor-pointer group ${
                      isLight
                        ? 'hover:bg-cyan-50/70 text-slate-700 hover:text-cyan-900'
                        : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
                    }`}
                    role="menuitem"
                    data-testid={`menu-item-${item.id}`}
                  >
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 transition-colors ${
                        isLight
                          ? 'bg-slate-100 group-hover:bg-cyan-100 text-slate-600 group-hover:text-cyan-700'
                          : 'bg-white/[0.05] group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold group-hover:text-cyan-500 transition-colors">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] leading-snug line-clamp-1 ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Item 9: Sign Out / Switch Workstation */}
            <div className="p-2">
              <button
                onClick={() =>
                  handleItemClick(() => {
                    if (onSignOut) {
                      onSignOut();
                    } else if (onOpenLogin) {
                      onOpenLogin();
                    } else {
                      window.location.hash = '#/';
                    }
                  })
                }
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200'
                    : 'bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30'
                }`}
                role="menuitem"
                data-testid="menu-item-sign-out"
              >
                <div className="flex items-center space-x-2">
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">End Session</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help & Support Dialog Modal */}
      <Dialog
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="ClinSync Hospital Help & Patient Support"
        className="max-w-lg"
      >
        <div className="space-y-4 text-sm">
          {/* Urgent Alert Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-amber-950/25 border-amber-500/30 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wide">
                Medical Emergency Warning
              </h5>
              <p className="text-xs mt-0.5">
                If you are experiencing acute chest pain, shortness of breath, sudden numbness, or
                loss of consciousness, immediately call <strong>911</strong> or proceed to the
                nearest emergency department.
              </p>
            </div>
          </div>

          {/* Hospital Directory Contacts */}
          <div className="space-y-2.5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Direct Contact Lines
            </h5>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.08]'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">24/7 Clinical Nurse Advice Line</div>
                <div className="text-[11px] text-slate-400">Immediate telephone triage assistance</div>
              </div>
              <a
                href="tel:18005550199"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>(800) 555-0199</span>
              </a>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.08]'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Hospital Patient Advocate & Records</div>
                <div className="text-[11px] text-slate-400">MRN verification, release of records</div>
              </div>
              <a
                href="tel:18005550144"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>(800) 555-0144</span>
              </a>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.08]'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Digital Intake Kiosk Support Desk</div>
                <div className="text-[11px] text-slate-400">Assistance with iPad & tablet check-in</div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">Extension 4402</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHelpModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
